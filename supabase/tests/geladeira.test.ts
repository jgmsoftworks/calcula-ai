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
  await db.exec(`
    alter table produtos add column nome text default 'Ingrediente', add column ativo boolean default true;
    create table comprovantes(id uuid primary key default gen_random_uuid(),user_id uuid references auth.users(id) on delete cascade,numero integer,tipo text,responsavel text,observacao text,data_hora timestamptz default now(),created_at timestamptz default now());
    create table movimentacoes(id uuid primary key default gen_random_uuid(),user_id uuid references auth.users(id) on delete cascade,comprovante_id uuid references comprovantes(id),produto_id uuid references produtos(id),tipo text,motivo text,quantidade numeric,custo_aplicado numeric,subtotal numeric,responsavel text,origem text,data_hora timestamptz default now(),created_at timestamptz default now());
    create table perdas(id uuid primary key default gen_random_uuid(),user_id uuid references auth.users(id) on delete cascade,tipo text check(tipo in ('produto','receita')),produto_id uuid references produtos(id),receita_id uuid references receitas(id) on delete set null,nome_item text,quantidade numeric,custo_unitario numeric,custo_total numeric,motivo text,motivo_outro text,observacao text,responsavel text,data_perda timestamptz default now());
    grant select on comprovantes,movimentacoes,perdas to authenticated;
  `);
  await db.exec(readFileSync('supabase/migrations/20261015190500_movimentacao_estoque_atomica_e_saldo_nao_negativo.sql','utf8'));
  await db.exec(readFileSync('supabase/migrations/20261111130041_geladeira_receitas.sql','utf8'));
  await db.exec(readFileSync('supabase/migrations/20261111133415_integrar_geladeira_estoque.sql','utf8'));
  await db.exec(readFileSync('supabase/migrations/20261111143000_saldo_inicial_geladeira.sql','utf8'));
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
    insert into produtos(id,user_id,custo_unitario,unidade_uso,fator_conversao,estoque_atual) values('${id(20)}','${user}',10,'g',1000,100),('${id(21)}','${user}',2,null,null,100);
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

async function fridgeItem(recipe = final) {
  return (await db.query<{ id: string }>('select cadastrar_item_geladeira($1,2) as id', [recipe])).rows[0].id;
}
function line(item: string, source = 'geladeira', tipo = 'entrada', quantity = 5) {
  return {produto_id:item,origem_estoque:source,tipo,quantidade:quantity,motivo:'Produção interna',custo_aplicado:999,subtotal:999*quantity};
}
async function checkout(items: unknown[], request = randomUUID()) {
  return (await db.query<{receipt: {id: string}}>('select finalizar_movimentacao_integrada($1,$2,$3,$4) receipt',[JSON.stringify(items),'Maria','Produção do dia',request])).rows[0].receipt;
}
async function lose(item: string, quantity=1, deduct=true, request=randomUUID()) {
  return db.query('select registrar_perdas_geladeira($1,$2,null,null,$3,$4,$5)',[JSON.stringify([{tipo:'geladeira',item_id:item,quantidade:quantity}]),'Vencimento','Maria',deduct,request]);
}
async function count(table: string) { return (await db.query<{n:number}>(`select count(*)::int n from ${table}`)).rows[0].n; }
async function registerWithBalance(recipe=final, quantity=3, minimum=2, request=randomUUID()) {
  return (await db.query<{id:string}>('select cadastrar_item_geladeira_com_saldo($1,$2,$3,$4) id',[recipe,quantity,minimum,request])).rows[0].id;
}
describe('Initial fridge stock', () => {
  it('registers the balance and minimum with a costed entry and keeps ingredients unchanged', async () => {
    await registerWithBalance();
    expect(await balance()).toBe(3);
    expect((await db.query<{n:number}>('select estoque_minimo::float n from geladeira_itens')).rows[0].n).toBe(2);
    expect((await db.query('select tipo,motivo,quantidade::float quantidade,custo_unitario::float custo,saldo_anterior::float anterior,saldo_atual::float atual from geladeira_movimentacoes')).rows[0])
      .toEqual({tipo:'entrada',motivo:'Saldo inicial',quantidade:3,custo:1.7,anterior:0,atual:3});
    expect((await db.query<{n:number}>('select sum(estoque_atual)::float n from produtos')).rows[0].n).toBe(200);
  });
  it('retries exactly once and rejects a second registration or changed payload', async () => {
    const request=randomUUID(), event=await registerWithBalance(final,3,2,request);
    expect(await registerWithBalance(final,3,2,request)).toBe(event);
    await expect(registerWithBalance(final,4,2,request)).rejects.toThrow('outra movimentação');
    await expect(registerWithBalance()).rejects.toThrow('já está na Geladeira');
    expect(await balance()).toBe(3);
    expect(await count('geladeira_movimentacoes')).toBe(1);
  });
  it('supports fractional balances and rejects invalid quantities and inaccessible recipes without partial registration', async () => {
    for (const value of [0,-1,NaN,Infinity,0.0001]) await expect(registerWithBalance(final,value)).rejects.toThrow();
    for (const recipe of [foreign,draft,invalid]) await expect(registerWithBalance(recipe)).rejects.toThrow();
    expect(await count('geladeira_itens')).toBe(0);
    await registerWithBalance(sub,1.25,0);
    expect(await balance(sub)).toBe(1.25);
  });
  it('rolls back the registration if history cannot be saved', async () => {
    await db.exec(`reset role; create function fail_initial_stock_test() returns trigger language plpgsql as $$ begin raise exception 'history failed'; end $$;
      create trigger fail_initial_stock_test before insert on geladeira_movimentacoes for each row execute function fail_initial_stock_test(); set role authenticated;`);
    try {
      await expect(registerWithBalance()).rejects.toThrow('history failed');
      expect(await count('geladeira_itens')).toBe(0);
    } finally {
      await db.exec('reset role; drop trigger fail_initial_stock_test on geladeira_movimentacoes; drop function fail_initial_stock_test(); set role authenticated;');
    }
  });
});
describe('Geladeira within the shared stock workflows', () => {
  it('registers finalized recipes with zero balance and no physical movement', async () => {
    const item = await fridgeItem();
    expect(await fridgeItem()).toBe(item);
    expect(await balance()).toBe(0);
    expect(await count('geladeira_movimentacoes')).toBe(0);
    for (const recipe of [foreign,draft,invalid]) await expect(fridgeItem(recipe)).rejects.toThrow();
  });
  it('uses one receipt for product and fridge lines, with recipe cost computed on the server', async () => {
    const item = await fridgeItem();
    const receipt = await checkout([line(id(21),'produto','saida',2),line(item)]);
    expect(await balance()).toBe(5);
    expect(await count('comprovantes')).toBe(1);
    const ledger = (await db.query<{comprovante_id:string,custo:number,responsavel:string,motivo:string}>('select comprovante_id,custo_unitario::float custo,responsavel,motivo from geladeira_movimentacoes')).rows[0];
    expect(ledger).toEqual({comprovante_id:receipt.id,custo:1.7,responsavel:'Maria',motivo:'Produção interna'});
    expect((await db.query<{n:number}>('select estoque_atual::float n from produtos where id=$1',[id(20)])).rows[0].n).toBe(100);
    expect((await db.query<{n:number}>('select estoque_atual::float n from produtos where id=$1',[id(21)])).rows[0].n).toBe(98);
  });
  it('rejects cumulative withdrawals and does not use same-cart entries to inflate availability', async () => {
    const item = await fridgeItem(); await move();
    await expect(checkout([line(id(21),'produto','saida',2),line(item,'geladeira','entrada',100),line(item,'geladeira','saida',6),line(item,'geladeira','saida',6)])).rejects.toThrow('Estoque insuficiente');
    expect(await count('comprovantes')).toBe(0);
    expect(await balance()).toBe(10);
    expect((await db.query<{n:number}>('select estoque_atual::float n from produtos where id=$1',[id(21)])).rows[0].n).toBe(100);
  });
  it('rolls back purchased-product changes if a later fridge line fails', async () => {
    const item = await fridgeItem();
    await expect(checkout([line(id(21),'produto','saida',2),line(item,'geladeira','entrada',0.0001)])).rejects.toThrow();
    expect(await balance()).toBe(0);
    expect(await count('movimentacoes')).toBe(0);
    expect(await count('comprovantes')).toBe(0);
    expect((await db.query<{n:number}>('select estoque_atual::float n from produtos where id=$1',[id(21)])).rows[0].n).toBe(100);
  });
  it('retries mixed checkout exactly once and rejects modified requests', async () => {
    const item = await fridgeItem(), request=randomUUID();
    const items=[line(id(21),'produto','saida',2),line(item)];
    const first=await checkout(items,request);
    expect(await checkout(items,request)).toEqual(first);
    expect(await balance()).toBe(5);
    expect(await count('movimentacoes')).toBe(1);
    expect(await count('geladeira_movimentacoes')).toBe(1);
    await expect(checkout([line(item,'geladeira','entrada',7)],request)).rejects.toThrow('outra movimentação');
  });
  it('records losses in the existing losses table and deducts only the prepared balance', async () => {
    const item=await fridgeItem(); await move();
    const request=randomUUID();await lose(item,2,true,request);await lose(item,2,true,request);
    expect(await balance()).toBe(8);
    expect(await count('perdas')).toBe(1);
    const loss=(await db.query<{tipo:string,origem_estoque:string,custo:number,unidade:string}>('select tipo,origem_estoque,custo_total::float custo,unidade from perdas')).rows[0];
    expect(loss).toEqual({tipo:'receita',origem_estoque:'geladeira',custo:3.4,unidade:'un'});
    expect((await db.query<{n:number}>('select sum(estoque_atual)::float n from produtos')).rows[0].n).toBe(200);
    expect((await db.query<{motivo:string}>("select motivo from geladeira_movimentacoes where tipo='saida'")).rows[0].motivo).toBe('Perda - Vencimento');
    await expect(lose(item,3,true,request)).rejects.toThrow('outra perda');
  });
  it('supports a loss without stock deduction or artificial history events', async () => {
    const item=await fridgeItem(); await lose(item,2,false);
    expect(await balance()).toBe(0);
    expect(await count('perdas')).toBe(1);
    expect(await count('geladeira_movimentacoes')).toBe(0);
    expect((await db.query<{custo:number}>('select custo_total::float custo from perdas')).rows[0].custo).toBe(3.4);
  });
  it('rejects insufficient loss quantities and cross-account stock access without writes', async () => {
    const item=await fridgeItem(); await move();
    await expect(lose(item,11)).rejects.toThrow();
    expect(await count('perdas')).toBe(0);
    await db.exec(`select set_config('request.jwt.claim.sub','${other}',false)`);
    await expect(checkout([line(item)])).rejects.toThrow();
    await expect(lose(item)).rejects.toThrow();
    expect(await count('comprovantes')).toBe(0);
  });
});
