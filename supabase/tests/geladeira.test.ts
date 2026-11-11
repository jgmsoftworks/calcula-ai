// @vitest-environment node
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { beforeAll, afterAll, beforeEach, describe, expect, it } from 'vitest';
const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const user = id(1), other = id(2), final = id(10), sub = id(11), foreign = id(12), draft = id(13), invalid = id(14);
let db: PGlite;
async function move(recipe = final, tipo = 'entrada', quantidade = 10, request = randomUUID(), expected: number | null = null, min: number | null = null) {
  return (await db.query<{ id: string }>('select movimentar_geladeira($1,$2,$3,$4,$5,null,$6) as id', [recipe, tipo, quantidade, request, min, expected])).rows[0].id;
}
async function balance(recipe = final) {
  return (await db.query<{ n: number }>('select estoque_atual::float as n from geladeira_itens where receita_id=$1', [recipe])).rows[0]?.n;
}
beforeAll(async () => {
  db = new PGlite();
  await db.exec(`create role authenticated; create role anon; create role service_role;
    create schema auth; create schema private; create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    create function private.can_use_app() returns boolean language sql stable as $$ select coalesce(nullif(current_setting('test.access',true),'')::boolean,true) $$;
    create table receitas(id uuid primary key, user_id uuid not null references auth.users(id) on delete cascade, nome text, rendimento_valor numeric, rendimento_unidade text, status text, preco_venda numeric);
    create table produtos(id uuid primary key, user_id uuid not null, custo_unitario numeric, unidade_uso text, fator_conversao numeric, estoque_atual numeric default 100);
    create table receita_ingredientes(receita_id uuid, produto_id uuid, quantidade numeric);
    create table receita_embalagens(receita_id uuid, produto_id uuid, quantidade numeric);
    create table receita_mao_obra(receita_id uuid, valor_total numeric);
    create table receita_sub_receitas(receita_id uuid, sub_receita_id uuid, quantidade numeric);
    grant usage on schema auth,private,public to authenticated,anon;
    grant select,update,delete on receitas to authenticated;
    grant select on produtos to authenticated;
  `);
  await db.exec(readFileSync('supabase/migrations/20261111130041_geladeira_receitas.sql','utf8'));
}, 30000);
afterAll(async () => { await db.close(); });
beforeEach(async () => {
  await db.exec(`reset role; truncate auth.users,geladeira_movimentacoes,geladeira_itens,receitas,produtos,receita_ingredientes,receita_embalagens,receita_mao_obra,receita_sub_receitas cascade;
    insert into auth.users values('${user}'),('${other}');
    insert into receitas values
      ('${final}','${user}','Bolo',10,'un','finalizada',999),
      ('${sub}','${user}','Recheio',2,'kg','finalizada',20),
      ('${foreign}','${other}','Receita alheia',1,'un','finalizada',50),
      ('${draft}','${user}','Rascunho',1,'un','rascunho',50),
      ('${invalid}','${user}','Sem rendimento',0,'un','finalizada',50);
    insert into produtos values('${id(20)}','${user}',10,'g',1000,100),('${id(21)}','${user}',2,null,null,100);
    insert into receita_ingredientes values('${final}','${id(20)}',500),('${sub}','${id(20)}',1000);
    insert into receita_embalagens values('${final}','${id(21)}',2);
    insert into receita_mao_obra values('${final}',3);
    insert into receita_sub_receitas values('${final}','${sub}',0.5);
    select set_config('request.jwt.claim.sub','${user}',false); select set_config('test.access','true',false); set role authenticated;`);
});
describe('Geladeira: database constraints, accounting and isolation', () => {
  it('stores recipe output units and full recipe costs, without final sale markup or ingredient withdrawals', async () => {
    await move();
    expect(await balance()).toBe(10);
    // Ingredients 5 + packaging 4 + labor 3 + subrecipe 5 = 17 / 10 outputs.
    const result = (await db.query<{ n: number; unidade: string }>('select custo_unitario::float as n, unidade from geladeira_movimentacoes')).rows[0];
    expect(result).toEqual({ n: 1.7, unidade: 'un' });
    expect((await db.query<{ n: number }>('select sum(estoque_atual)::float as n from produtos')).rows[0].n).toBe(200);
  });
  it('supports subrecipes and fractional quantities using their actual recipe cost', async () => {
    await move(sub, 'entrada', 1.25); await move(sub, 'saida', 0.25);
    expect(await balance(sub)).toBe(1);
    expect((await db.query<{ n: number }>('select custo_unitario::float as n from geladeira_movimentacoes limit 1')).rows[0].n).toBe(5);
  });
  it('rejects missing recipes, another owner, unfinished recipes and invalid yield', async () => {
    for (const recipe of [id(99), foreign, draft, invalid]) await expect(move(recipe)).rejects.toThrow();
    expect(await balance()).toBeUndefined();
  });
  it('retries a lost success response without adding quantity twice and rejects reused payloads', async () => {
    const request = randomUUID(), result = await move(final, 'entrada', 10, request);
    expect(await move(final, 'entrada', 10, request)).toBe(result);
    expect(await balance()).toBe(10);
    await expect(move(final, 'entrada', 12, request)).rejects.toThrow('outra movimentação');
  });
  it('applies two concurrent entries without losing a balance update', async () => {
    await Promise.all([move(final, 'entrada', 3), move(final, 'entrada', 2)]);
    expect(await balance()).toBe(5);
  });
  it('rejects excess withdrawal, negative, NaN, infinite and overprecise quantities without partial writes', async () => {
    await move();
    await expect(move(final, 'saida', 11)).rejects.toThrow('saldo');
    for (const value of [-1, NaN, Infinity, 0.0001, 0]) await expect(move(final,'entrada',value)).rejects.toThrow();
    expect(await balance()).toBe(10);
    expect((await db.query<{ n: number }>('select count(*)::int as n from geladeira_movimentacoes')).rows[0].n).toBe(1);
  });
  it('guards absolute adjustments against stale balances', async () => {
    await move(); await move(final, 'entrada', 2);
    await expect(move(final, 'ajuste', 8, randomUUID(), 10)).rejects.toThrow('saldo mudou');
    expect(await balance()).toBe(12);
    await move(final, 'ajuste', 8, randomUUID(), 12); expect(await balance()).toBe(8);
  });
  it('updates minimum stock without changing balance', async () => {
    await move(); await move(final,'minimo',0,randomUUID(),null,5);
    expect(await balance()).toBe(10);
    expect((await db.query<{ n: number }>('select estoque_minimo::float as n from geladeira_itens')).rows[0].n).toBe(5);
  });
  it('preserves past costs after recipe ingredient cost changes', async () => {
    await move(); await db.exec(`reset role; update produtos set custo_unitario=20 where id='${id(20)}'; set role authenticated;`);
    await move(final,'entrada',2);
    expect((await db.query<{ n: number }>('select custo_unitario::float as n from geladeira_movimentacoes order by custo_unitario')).rows.map(r => r.n)).toEqual([1.7,2.2]);
  });
  it('blocks unit changes and recipe deletion while it is registered in the fridge', async () => {
    await move();
    await expect(db.query('update receitas set rendimento_unidade=$1 where id=$2',['kg',final])).rejects.toThrow('Geladeira');
    await expect(db.query('delete from receitas where id=$1',[final])).rejects.toThrow();
    await expect(move(final,'remocao',0)).rejects.toThrow('Zere');
  });
  it('removes a zero-stock item, preserves history and allows adding it again', async () => {
    await move(); await move(final,'saida',10); await move(final,'remocao',0);
    expect(await balance()).toBeUndefined();
    expect((await db.query<{ n: number }>('select count(*)::int as n from geladeira_movimentacoes')).rows[0].n).toBe(3);
    await move(final,'entrada',5); expect(await balance()).toBe(5);
  });
  it('blocks direct balance/history manipulation and isolates the account', async () => {
    await move();
    await expect(db.exec('update geladeira_itens set estoque_atual=999')).rejects.toThrow();
    await expect(db.exec('delete from geladeira_movimentacoes')).rejects.toThrow();
    await db.query("select set_config('request.jwt.claim.sub',$1,false)",[other]);
    expect(await balance()).toBeUndefined();
    expect((await db.query('select id from geladeira_movimentacoes')).rows).toHaveLength(0);
    await expect(move()).rejects.toThrow('Receita não encontrada');
  });
  it('blocks expired access and anonymous callers', async () => {
    await move();
    await db.exec("select set_config('test.access','false',false)");
    expect(await balance()).toBeUndefined();
    await expect(move()).rejects.toThrow('acesso ativo');
    await db.exec('reset role; set role anon;');
    await expect(move()).rejects.toThrow();
  });
  it('allows account deletion to cascade without blocking on fridge references', async () => {
    await move(); await db.exec(`reset role; delete from auth.users where id='${user}';`);
    expect((await db.query('select id from geladeira_itens')).rows).toHaveLength(0);
    expect((await db.query('select id from geladeira_movimentacoes')).rows).toHaveLength(0);
  });
  it('rejects positive adjustments into an unfinished recipe while permitting stock clearance', async () => {
    await move(); await db.query('update receitas set status=$1 where id=$2',['rascunho',final]);
    await expect(move(final,'ajuste',12,randomUUID(),10)).rejects.toThrow('Finalize');
    await move(final,'ajuste',0,randomUUID(),10); expect(await balance()).toBe(0);
  });
  it('rolls back the balance when history persistence fails', async () => {
    await move();
    await db.exec(`reset role; create function fail_fridge_test() returns trigger language plpgsql as $$ begin raise exception 'history failed'; end $$;
      create trigger fail_fridge_test before insert on geladeira_movimentacoes for each row execute function fail_fridge_test(); set role authenticated;`);
    await expect(move(final,'entrada',1)).rejects.toThrow('history failed');
    expect(await balance()).toBe(10);
    await db.exec('reset role; drop trigger fail_fridge_test on geladeira_movimentacoes; drop function fail_fridge_test(); set role authenticated;');
  });
});
