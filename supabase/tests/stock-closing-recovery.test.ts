import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const fixture = readFileSync('supabase/tests/fixtures/stock-closing-recovery.sql', 'utf8');
const migration = readFileSync('supabase/migrations/20261119130338_recuperar_fechamento_estoque.sql', 'utf8');
const owner = (suffix: number) => '00000000-0000-0000-0000-' + String(suffix).padStart(12, '0');
let db: PGlite;
let job: string;

async function at(instant: string) {
  await db.query("select set_config('test.stock_clock', $1, false)", [instant]);
}

async function balances(account = 1) {
  return (await db.query<{ mes: string; valor: number; qtd: number }>(`
    select competencia as mes, valor_estoque_fechamento::float8 as valor, qtd_produtos_ativos as qtd
    from public.estoque_fechamentos_mensais where user_id=$1 order by competencia`, [owner(account)])).rows;
}

beforeEach(async () => {
  db = new PGlite();
  await db.exec(fixture);
  await at('2026-11-19T15:00Z');
  await db.exec('begin;\n' + migration.replaceAll('clock_timestamp()', "current_setting('test.stock_clock')::timestamptz") + '\ncommit;');
  job = (await db.query<{ command: string }>('select command from cron.job where jobid=41')).rows[0].command;
});
afterEach(async () => { await db?.close(); });

describe('recover historical closing after a missed schedule', () => {
  it('separates purchases either side of midnight and ignores later cost changes, rollbacks and retries', async () => {
    await at('2026-12-01T02:59:58Z');
    await db.exec('update produtos set estoque_atual=15 where id=1');
    await at('2026-12-01T03:01Z');
    await db.exec('update produtos set estoque_atual=25, custo_unitario=3 where id=1');
    await db.exec('begin; update produtos set estoque_atual=98; rollback;');
    expect(await balances()).toEqual([]);
    await at('2026-12-04T14:00Z');
    await db.exec(job);
    expect(await balances()).toEqual([{ mes: '2026-11', valor: 30, qtd: 1 }]);
    await at('2027-03-09T15:00Z');
    await db.exec(job);
    await db.exec(job);
    expect(await balances()).toEqual([
      { mes: '2026-11', valor: 30, qtd: 1 },
      { mes: '2026-12', valor: 75, qtd: 1 },
      { mes: '2027-01', valor: 75, qtd: 1 },
      { mes: '2027-02', valor: 75, qtd: 1 },
    ]);
  });

  it('includes late account confirmation, bulk writes, owner changes, deletions and zero balances', async () => {
    await at('2026-12-01T02:00Z'); // December in Lisbon, November in São Paulo.
    await db.query('insert into produtos values (2,$1,true,4,5),(3,$1,false,1,50)', [owner(2)]);
    await db.query('update produtos set user_id=$1 where id=1', [owner(2)]);
    await db.exec('update produtos set ativo=true where id=3');
    await at('2027-01-02T13:00Z');
    await db.query('update profiles set region_confirmed=true where user_id=$1', [owner(3)]);
    await db.exec('delete from produtos where id=1');
    await db.exec('truncate produtos');
    await at('2027-02-01T15:00Z');
    await db.exec(job);
    expect(await balances()).toEqual(['2026-11','2026-12','2027-01'].map(mes => ({ mes, valor: 0, qtd: 0 })));
    expect(await balances(2)).toEqual([
      { mes: '2026-11', valor: 0, qtd: 0 },
      { mes: '2026-12', valor: 90, qtd: 3 },
      { mes: '2027-01', valor: 0, qtd: 0 },
    ]);
    expect(await balances(3)).toEqual([{ mes: '2027-01', valor: 0, qtd: 0 }]);
  });

  it('retries an interrupted closing after further stock changes and keeps each account’s balance', async () => {
    await at('2026-12-02T12:00Z');
    await db.exec("alter table estoque_fechamentos_mensais add constraint temporary_failure check (qtd_produtos_ativos > 0)");
    await expect(db.exec(job)).rejects.toThrow(/temporary_failure/);
    expect(await balances()).toEqual([]);
    await db.exec('grant insert, select, update on produtos to authenticated; set role authenticated');
    await db.query(`insert into produtos values (1,$1,true,4,8),(2,$1,true,3,1)
      on conflict (id) do update set estoque_atual=excluded.estoque_atual, custo_unitario=excluded.custo_unitario`, [owner(1)]);
    await db.exec('reset role; alter table estoque_fechamentos_mensais drop constraint temporary_failure');
    await at('2027-01-03T15:00Z');
    await db.exec(job);
    expect(await balances()).toEqual([
      { mes: '2026-11', valor: 20, qtd: 1 },
      { mes: '2026-12', valor: 35, qtd: 2 },
    ]);
  });

  it('preserves existing official closings, excludes untracked months and keeps the private journal inaccessible', async () => {
    await db.query('insert into estoque_fechamentos_mensais values ($1,\'2026-11\',17.25,1)', [owner(1)]);
    await at('2027-01-15T15:00Z');
    await db.exec(job);
    expect(await balances()).toEqual([
      { mes: '2026-11', valor: 17.25, qtd: 1 },
      { mes: '2026-12', valor: 20, qtd: 1 },
    ]);
    await db.exec('grant usage on schema private to authenticated; set role authenticated');
    await expect(db.exec('select * from private.estoque_variacao_mensal')).rejects.toThrow(/permission denied/);
    await expect(db.exec('select private.recuperar_fechamentos_estoque()')).rejects.toThrow(/permission denied/);
  });
});
