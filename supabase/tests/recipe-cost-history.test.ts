// All writes are to disposable PostgreSQL in PGlite, never to a hosted project.
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const migration = readFileSync('supabase/migrations/20261116212837_receita_custos_historico.sql', 'utf8');
const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const owner = id(1), other = id(2), recipe = id(10), sub = id(11), parent = id(12), foreign = id(13);
const product = id(20), packaging = id(21), normalMarkup = id(30), subMarkup = id(31);
let db: PGlite;
type History = { id: number; custo_total: number; custo_unitario: number | null; motivo: string; excluida: boolean; registrado_em: string };

async function history(receitaId = recipe) {
  return (await db.query<History>(`select id::int, custo_total::float, custo_unitario::float,
    motivo, excluida, registrado_em::text from public.receita_custos_historico
    where receita_id=$1 order by registrado_em,id`, [receitaId])).rows;
}
async function costAt(receitaId: string, at: string) {
  return (await db.query<{ custo_total: number }>(
    'select custo_total::float from public.custo_receita_em($1,$2)', [receitaId, at],
  )).rows;
}
async function authenticate(userId = owner) {
  await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub','${userId}',false);`);
}

beforeEach(async () => {
  db = new PGlite();
  await db.exec(readFileSync('supabase/tests/fixtures/recipe_save.sql', 'utf8'));
  await db.exec(readFileSync('supabase/migrations/20261103144515_atomic_recipe_save.sql', 'utf8'));
  await db.exec(`
    create role service_role bypassrls;
    create table auth.users(id uuid primary key);
    alter table public.profiles add column business_currency text;
    alter table public.produtos enable row level security;
    create policy own_products on public.produtos for all to authenticated
      using(user_id=auth.uid()) with check(user_id=auth.uid());
    begin;
    insert into auth.users values ('${owner}'),('${other}');
    insert into profiles values ('${owner}','lite','trial','BRL'),('${other}','lite','trial','BRL');
    insert into planos values ('lite','{"receitas":-1}');
    insert into markups values ('${normalMarkup}','${owner}','normal',3),('${subMarkup}','${owner}','sub_receita',1);
    insert into produtos values ('${product}','${owner}',10,null,null),('${packaging}','${owner}',2,null,null);
    insert into receitas(id,user_id,nome,preco_venda,markup_id,rendimento_valor,rendimento_unidade) values
      ('${recipe}','${owner}','Bolo',77,'${normalMarkup}',1,'un'),
      ('${sub}','${owner}','Recheio',20,'${subMarkup}',2,'kg'),
      ('${parent}','${owner}','Bolo com recheio',77,'${normalMarkup}',1,'un'),
      ('${foreign}','${other}','Outra conta',99,null,1,'un');
    insert into receita_ingredientes(id,receita_id,produto_id,quantidade) values
      ('${id(100)}','${recipe}','${product}',1),('${id(101)}','${sub}','${product}',2);
    insert into receita_sub_receitas(id,receita_id,sub_receita_id,quantidade)
      values ('${id(110)}','${parent}','${sub}',1);
    commit;
  `);
  await db.exec(`begin; ${migration} commit;`);
});
afterEach(async () => { await db?.close(); });

describe('Recipe cost history from activation onward', () => {
  it('captures all existing recipes, without inventing earlier values or changing their prices', async () => {
    expect(await history()).toMatchObject([{ custo_total: 10, custo_unitario: 10, motivo: 'inicio_acompanhamento' }]);
    expect((await db.query('select count(*)::int as n from receita_custos_historico')).rows).toEqual([{ n: 4 }]);
    expect(await costAt(recipe, '2020-01-01T00:00:00Z')).toEqual([]);
    expect((await db.query('select preco_venda::float as price from receitas where id=$1', [recipe])).rows).toEqual([{ price: 77 }]);
  });

  it('preserves 10 then 12 after a direct material edit, including exact time lookup', async () => {
    const before = (await history())[0];
    await authenticate();
    await db.query('update produtos set custo_unitario=12 where id=$1', [product]);
    const after = await history();
    expect(after.map(r => r.custo_total)).toEqual([10, 12]);
    expect(await costAt(recipe, before.registrado_em)).toEqual([{ custo_total: 10 }]);
    expect(await costAt(recipe, after[1].registrado_em)).toEqual([{ custo_total: 12 }]);
    expect((await db.query('select preco_venda::float as price from receitas where id=$1', [recipe])).rows).toEqual([{ price: 77 }]);
  });

  it('captures stock-style writes by a system job without depending on an open screen', async () => {
    await db.exec(`begin; update produtos set custo_unitario=12 where id='${product}'; commit;`);
    expect((await history()).map(r => r.custo_total)).toEqual([10, 12]);
  });

  it('captures sub-recipe cost changes in dependent recipes', async () => {
    await authenticate();
    await db.query('update produtos set custo_unitario=12 where id=$1', [product]);
    expect((await history(sub)).map(r => r.custo_total)).toEqual([20, 24]);
    expect((await history(parent)).map(r => r.custo_total)).toEqual([10, 12]);
  });

  it('captures sub-recipe yield changes even when the parent stored price does not change', async () => {
    await authenticate();
    await db.query('update receitas set rendimento_valor=4 where id=$1', [sub]);
    expect((await history(sub)).map(r => r.custo_unitario)).toEqual([10, 5]);
    expect((await history(parent)).map(r => r.custo_total)).toEqual([10, 5]);
  });

  it('captures quantities, packaging and labor in one final committed snapshot', async () => {
    await authenticate();
    await db.exec(`begin;
      update receita_ingredientes set quantidade=2 where receita_id='${recipe}';
      insert into receita_embalagens(receita_id,produto_id,quantidade) values ('${recipe}','${packaging}',3);
      insert into receita_mao_obra(receita_id,funcionario_id,funcionario_nome,funcionario_cargo,custo_por_hora,tempo,valor_total)
        values ('${recipe}','${id(50)}','Pessoa ficticia','Producao',4,1,4);
      commit;`);
    expect((await history()).map(r => r.custo_total)).toEqual([10, 30]);
  });

  it('keeps small cost changes at full numeric precision', async () => {
    await authenticate();
    await db.query('update produtos set custo_unitario=10.0001 where id=$1', [product]);
    expect((await history()).map(r => r.custo_total)).toEqual([10, 10.0001]);
  });

  it('records conversion changes and null unit cost when yield is invalid', async () => {
    await authenticate();
    await db.query("update produtos set unidade_uso='g',fator_conversao=1000 where id=$1", [product]);
    expect((await history()).at(-1)?.custo_total).toBe(0.01);
    await db.query('update receitas set rendimento_valor=0 where id=$1', [recipe]);
    expect((await history()).at(-1)?.custo_unitario).toBeNull();
  });

  it('does not record partial or rolled-back saves', async () => {
    await authenticate();
    await db.exec('begin');
    await db.query('update produtos set custo_unitario=12 where id=$1', [product]);
    expect(await history()).toHaveLength(1);
    await db.exec('rollback');
    expect((await history()).map(r => r.custo_total)).toEqual([10]);
  });

  it('deduplicates no-op changes and a transaction which returns to its original cost', async () => {
    await authenticate();
    await db.exec(`begin;
      update produtos set custo_unitario=12 where id='${product}';
      update produtos set custo_unitario=10 where id='${product}';
      update receitas set observacoes='Apenas texto' where id='${recipe}';
      commit;`);
    expect(await history()).toHaveLength(1);
  });

  it('keeps only the final value even if a caller forces constraints to run early', async () => {
    await authenticate();
    await db.exec(`begin; set constraints all immediate;
      update produtos set custo_unitario=12 where id='${product}';
      update produtos set custo_unitario=13 where id='${product}'; commit;`);
    expect((await history()).map(r => r.custo_total)).toEqual([10, 13]);
  });

  it('records a new recipe after its components are complete', async () => {
    await authenticate();
    await db.exec(`begin;
      insert into receitas(id,user_id,nome,preco_venda,markup_id,rendimento_valor)
        values ('${id(14)}','${owner}','Nova',77,'${normalMarkup}',2);
      insert into receita_ingredientes(receita_id,produto_id,quantidade) values ('${id(14)}','${product}',3);
      commit;`);
    expect(await history(id(14))).toMatchObject([{ custo_total: 30, custo_unitario: 15, motivo: 'criacao' }]);
  });

  it('works with the real atomic recipe-save RPC, its rollback and idempotent retry', async () => {
    await authenticate();
    const input = { nome: 'Via RPC', markup_id: normalMarkup, rendimento_valor: 2, rendimento_unidade: 'un', preco_venda: 77 };
    const components = { ingredientes: [{ id: id(120), produto_id: product, quantidade: 3 }],
      embalagens: [], sub_receitas: [], mao_obra: [], passos: [] };
    const save = () => db.query(`select salvar_receita_completa($1,$2,$3::jsonb,$4::jsonb,true,null,null)`,
      [id(14), id(999), JSON.stringify(input), JSON.stringify(components)]);
    await db.query("select set_config('test.fail_table','receita_ingredientes',false)");
    await expect(save()).rejects.toMatchObject({ code: '23514' });
    expect(await history(id(14))).toEqual([]);
    await db.query("select set_config('test.fail_table','',false)");
    await save();
    const first = await history(id(14));
    expect(first).toMatchObject([{ custo_total: 30, custo_unitario: 15, motivo: 'criacao' }]);
    await save();
    expect(await history(id(14))).toEqual(first);
  });

  it('follows more than one level of sub-recipe dependencies', async () => {
    await authenticate();
    await db.exec(`begin;
      insert into receitas(id,user_id,nome,markup_id,rendimento_valor) values
        ('${id(14)}','${owner}','Segundo recheio','${subMarkup}',2),
        ('${id(15)}','${owner}','Receita final','${normalMarkup}',1);
      insert into receita_sub_receitas(receita_id,sub_receita_id,quantidade) values
        ('${id(14)}','${sub}',2),('${id(15)}','${id(14)}',1);
      commit;`);
    expect((await history(id(15))).at(-1)?.custo_total).toBe(10);
    await db.query('update produtos set custo_unitario=12 where id=$1', [product]);
    expect((await history(id(15))).map(r => r.custo_total)).toEqual([10, 12]);
  });

  it('preserves past costs after deletion and marks the end of availability', async () => {
    const before = (await history())[0];
    await authenticate();
    await db.query('delete from receitas where id=$1', [recipe]);
    const rows = await history();
    expect(rows).toHaveLength(2);
    expect(rows[1]).toMatchObject({ motivo: 'exclusao', excluida: true, custo_total: 10 });
    expect(await costAt(recipe, before.registrado_em)).toEqual([{ custo_total: 10 }]);
    expect(await costAt(recipe, rows[1].registrado_em)).toEqual([]);
  });

  it('does not preserve a recipe that is created and deleted in one transaction', async () => {
    await authenticate();
    await db.exec(`begin;
      insert into receitas(id,user_id,nome,markup_id) values ('${id(14)}','${owner}','Temporaria','${normalMarkup}');
      delete from receitas where id='${id(14)}'; commit;`);
    expect(await history(id(14))).toHaveLength(0);
  });

  it('keeps a changed cost basis even when the numeric total stays the same', async () => {
    await authenticate();
    await db.exec(`begin;
      delete from receita_ingredientes where receita_id='${recipe}';
      insert into receita_ingredientes(receita_id,produto_id,quantidade) values ('${recipe}','${packaging}',5);
      commit;`);
    expect((await history()).map(r => r.custo_total)).toEqual([10, 10]);
  });

  it('captures currency metadata without converting or changing costs', async () => {
    await db.query("update profiles set business_currency='EUR' where user_id=$1", [owner]);
    expect((await db.query('select moeda from receita_custos_historico where receita_id=$1 order by id', [recipe])).rows)
      .toEqual([{ moeda: 'BRL' }, { moeda: 'EUR' }]);
    expect((await history()).map(r => r.custo_total)).toEqual([10, 10]);
  });

  it('fills unchanged days from the latest snapshot and distinguishes missing history from zero', async () => {
    await db.query('update produtos set custo_unitario=12 where id=$1', [product]);
    // Synthetic clock fixtures, only in the disposable test database.
    await db.query(`update receita_custos_historico set registrado_em =
      ((current_date - case when motivo='inicio_acompanhamento' then 3 else 1 end)::timestamp
        + interval '12 hours') at time zone 'America/Sao_Paulo' where receita_id=$1`, [recipe]);
    await authenticate();
    const rows = (await db.query<{ custo_total: number | null; disponivel: boolean; dia_parcial: boolean }>(
      `select custo_total::float,disponivel,dia_parcial from custos_receita_por_dia($1,current_date-4,current_date-1)`, [recipe],
    )).rows;
    expect(rows.map(r => r.custo_total)).toEqual([null, 10, 10, 12]);
    expect(rows.map(r => r.disponivel)).toEqual([false, true, true, true]);
    expect(rows[1].dia_parcial).toBe(true);
    expect(rows[2].dia_parcial).toBe(false);
  });

  it('uses the requested timezone at midnight boundaries', async () => {
    await db.query('update produtos set custo_unitario=12 where id=$1', [product]);
    await db.query(`update receita_custos_historico set registrado_em =
      case when motivo='inicio_acompanhamento' then (current_date-3)::timestamp at time zone 'UTC'
      else (current_date-1)::timestamp at time zone 'UTC' + interval '2 hours' end
      where receita_id=$1`, [recipe]);
    await authenticate();
    const br = (await db.query<{ custo_total: number }>(
      `select custo_total::float from custos_receita_por_dia($1,current_date-2,current_date-2,'America/Sao_Paulo')`, [recipe],
    )).rows;
    const utc = (await db.query<{ custo_total: number }>(
      `select custo_total::float from custos_receita_por_dia($1,current_date-2,current_date-2,'UTC')`, [recipe],
    )).rows;
    expect(br).toEqual([{ custo_total: 12 }]);
    expect(utc).toEqual([{ custo_total: 10 }]);
  });

  it('rejects invalid ranges, future dates and unknown timezones', async () => {
    await authenticate();
    for (const args of ["current_date,current_date+1,'UTC'", "current_date-400,current_date,'UTC'", "current_date,current_date,'invalid'"]) {
      await expect(db.query(`select * from custos_receita_por_dia($1,${args})`, [recipe])).rejects.toMatchObject({ code: '22023' });
    }
  });
});

describe('Cost history authorization', () => {
  it('isolates owners on table, point-in-time and daily queries', async () => {
    await authenticate(other);
    expect(await history()).toEqual([]);
    expect(await costAt(recipe, '2099-01-01T00:00:00Z')).toEqual([]);
    expect((await db.query("select * from custos_receita_por_dia($1,current_date-1,current_date,'UTC')", [recipe])).rows).toEqual([]);
    expect(await history(foreign)).toHaveLength(1);
  });

  it('denies direct history modification and private function calls', async () => {
    await authenticate();
    for (const sql of [
      'delete from receita_custos_historico',
      'update receita_custos_historico set custo_total=0',
      'insert into receita_custos_historico default values',
      `select private.registrar_custo_receita('${recipe}','${owner}',false)`,
      `select private.capturar_base_custo_receita('${recipe}','${owner}')`,
      `select private.registrar_custos_dependentes(array['${recipe}'::uuid])`,
    ]) await expect(db.exec(sql)).rejects.toMatchObject({ code: '42501' });
  });

  it('denies anonymous reads and RPC execution', async () => {
    await db.exec('set role anon');
    await expect(history()).rejects.toMatchObject({ code: '42501' });
    await expect(costAt(recipe, '2099-01-01T00:00:00Z')).rejects.toMatchObject({ code: '42501' });
  });

  it('keeps the existing account-access requirement', async () => {
    await authenticate();
    await db.query("select set_config('test.access','false',false)");
    expect(await history()).toEqual([]);
  });

  it('removes history when its auth account is removed', async () => {
    await db.query('delete from auth.users where id=$1', [owner]);
    expect(await history()).toHaveLength(0);
  });
});
