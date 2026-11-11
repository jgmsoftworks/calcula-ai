import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { beforeAll, afterAll, beforeEach, describe, it, expect } from 'vitest';
const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const owner=id(1), other=id(2), target=id(10), parent=id(11), foreign=id(12), product=id(20), markup=id(30);
let db: PGlite;
type Context = { receita: { updated_at: string }; usos: { tipo: string; id: string; vinculos?: unknown[] }[] };
async function preview(recipe=target) {
  return (await db.query<{data:Context}>('select listar_usos_receita($1) as data',[recipe])).rows[0].data;
}
async function remove(context: Context, recipe=target) {
  return db.query('select excluir_receita_com_vinculos($1,$2,$3::jsonb)',[recipe,context.receita.updated_at,JSON.stringify(context.usos)]);
}
async function snapshot() {
  await db.exec('reset role');
  const result = (await db.query(`select jsonb_build_object(
    'recipes',(select jsonb_agg(to_jsonb(r) order by id) from receitas r),
    'links',(select jsonb_agg(to_jsonb(r) order by id) from receita_sub_receitas r),
    'steps',(select jsonb_agg(to_jsonb(r) order by id) from receita_passos_preparo r),
    'fridge',(select jsonb_agg(to_jsonb(r) order by id) from geladeira_itens r),
    'history',(select jsonb_agg(to_jsonb(r) order by id) from geladeira_movimentacoes r)) as data`)).rows[0];
  await db.exec('set role authenticated');
  return result;
}
beforeAll(async () => {
  db=new PGlite();
  await db.exec(readFileSync('supabase/tests/fixtures/recipe_save.sql','utf8'));
  await db.exec(`create role service_role; create table auth.users(id uuid primary key);`);
  await db.exec(readFileSync('supabase/migrations/20261111130041_geladeira_receitas.sql','utf8'));
  await db.exec('alter table geladeira_movimentacoes add column motivo text;');
  const integration=readFileSync('supabase/migrations/20261111133415_integrar_geladeira_estoque.sql','utf8');
  const cost=integration.match(/create function private\.custo_unitario_geladeira[\s\S]*?\$\$;/)?.[0];
  if (!cost) throw new Error('Missing fridge cost function');
  await db.exec(cost);
  await db.exec(readFileSync('supabase/migrations/20261111170000_excluir_receita_com_vinculos.sql','utf8'));
  await db.exec(`create function public.test_delete_failure() returns trigger language plpgsql as $$ begin
    if current_setting('test.fail_delete',true)='true' then raise exception 'Late failure' using errcode='23514'; end if;
    return old; end $$;
    create trigger late_delete_failure after delete on receitas for each row execute function public.test_delete_failure();`);
},30000);
afterAll(async () => { await db?.close(); });
beforeEach(async () => {
  await db.exec(`reset role;
    select set_config('test.access','true',false),set_config('test.fail_delete','false',false),set_config('test.fail_table','',false);
    truncate receitas,receita_passos_preparo,auth.users,produtos,markups,profiles,planos cascade;
    insert into auth.users values('${owner}'),('${other}');
    insert into profiles values ('${owner}','lite','trial'),('${other}','lite','trial');
    insert into planos values('lite','{"receitas":100}');
    insert into markups values('${markup}','${owner}','normal',3),('${id(31)}','${owner}','sub_receita',1);
    insert into produtos values('${product}','${owner}',40,'g',1000);
    insert into receitas(id,user_id,nome,preco_venda,markup_id,rendimento_valor,rendimento_unidade) values
      ('${target}','${owner}','Recheio',4,'${id(31)}',2,'kg'),
      ('${parent}','${owner}','Bolo',77,'${markup}',10,'un'),
      ('${foreign}','${other}','Outra conta',88,'${markup}',10,'un');
    insert into receita_ingredientes(id,receita_id,produto_id,quantidade) values('${id(90)}','${target}','${product}',100);
    insert into receita_sub_receitas(id,receita_id,sub_receita_id,quantidade) values('${id(100)}','${parent}','${target}',2);
    insert into receita_passos_preparo(id,receita_id,ordem,descricao) values('${id(103)}','${target}',1,'Misturar');
    insert into geladeira_itens(id,user_id,receita_id,unidade,estoque_atual) values('${id(200)}','${owner}','${target}','kg',5);
    insert into geladeira_movimentacoes(user_id,item_id,receita_id,receita_nome,unidade,tipo,quantidade,saldo_anterior,saldo_atual,request_id,solicitacao)
      values('${owner}','${id(200)}','${target}','Recheio','kg','entrada',5,0,5,'${id(201)}','{}');
    set role authenticated; select set_config('request.jwt.claim.sub','${owner}',false);`);
});
describe('Atomic recipe deletion with explicit dependency review', () => {
  it('lists all blocking locations without writing and groups duplicate component lines', async () => {
    await db.query('insert into receita_sub_receitas(id,receita_id,sub_receita_id,quantidade) values($1,$2,$3,1)',[id(101),parent,target]);
    const before=await snapshot(), context=await preview();
    expect(context.usos).toHaveLength(2);
    expect(context.usos.find(use=>use.tipo==='receita')?.vinculos).toHaveLength(2);
    expect(await snapshot()).toEqual(before);
  });
  it('rejects omitted locations and preserves everything', async () => {
    const context=await preview(), before=await snapshot();
    context.usos=context.usos.filter(use=>use.tipo==='receita');
    await expect(remove(context)).rejects.toMatchObject({code:'40001'});
    expect(await snapshot()).toEqual(before);
  });
  it('removes the reviewed links and target together, preserving parent and fridge history', async () => {
    const context=await preview(); await remove(context);
    expect((await db.query('select id from receitas where id=$1',[target])).rows).toHaveLength(0);
    expect((await db.query('select id,preco_venda::float as price from receitas where id=$1',[parent])).rows).toEqual([{id:parent,price:77}]);
    expect((await db.query('select id from receita_sub_receitas')).rows).toHaveLength(0);
    expect((await db.query('select id from receita_passos_preparo where receita_id=$1',[target])).rows).toHaveLength(0);
    expect((await db.query('select id from geladeira_itens')).rows).toHaveLength(0);
    const history=(await db.query('select tipo,receita_id,item_id,saldo_atual::float as saldo,receita_nome from geladeira_movimentacoes order by tipo')).rows;
    expect(history).toEqual([
      {tipo:'entrada',receita_id:null,item_id:null,saldo:5,receita_nome:'Recheio'},
      {tipo:'remocao',receita_id:null,item_id:null,saldo:5,receita_nome:'Recheio'},
    ]);
  });
  it('rolls back links, fridge and ledger if the final delete fails', async () => {
    const context=await preview(),before=await snapshot();
    await db.query("select set_config('test.fail_delete','true',false)");
    await expect(remove(context)).rejects.toMatchObject({code:'23514'});
    expect(await snapshot()).toEqual(before);
  });
  it('recalculates a parent sub-recipe after removing its ingredient recipe', async () => {
    await db.query('update receitas set markup_id=$1 where id=$2',[id(31),parent]);
    await db.query('update receita_sub_receitas set quantidade=3 where receita_id=$1',[parent]);
    expect((await db.query<{price:number}>('select preco_venda::float as price from receitas where id=$1',[parent])).rows[0].price).toBe(6);
    await remove(await preview());
    expect((await db.query<{price:number}>('select preco_venda::float as price from receitas where id=$1',[parent])).rows[0].price).toBe(0);
  });
  it.each(['stock','link','new-use','recipe'])('rejects stale confirmation after a change to %s', async kind => {
    const context=await preview();
    if(kind==='stock') { await db.exec('reset role'); await db.query('update geladeira_itens set estoque_atual=6 where receita_id=$1',[target]); await db.exec('set role authenticated'); }
    if(kind==='link') await db.query('update receita_sub_receitas set quantidade=4 where sub_receita_id=$1',[target]);
    if(kind==='new-use') await db.query('insert into receita_sub_receitas(id,receita_id,sub_receita_id,quantidade) values($1,$2,$3,1)',[id(101),parent,target]);
    if(kind==='recipe') await db.query('update receitas set nome=$1 where id=$2',['Recheio atualizado',target]);
    const before=await snapshot();
    await expect(remove(context)).rejects.toMatchObject({code:'40001'});
    expect(await snapshot()).toEqual(before);
  });
  it('cannot read or delete another account recipe', async () => {
    const context=await preview(),before=await snapshot();
    await expect(preview(foreign)).rejects.toMatchObject({code:'P0002'});
    await expect(remove(context,foreign)).rejects.toMatchObject({code:'P0002'});
    expect(await snapshot()).toEqual(before);
  });
  it('keeps the FK block for any unexpected cross-account link and rolls back prior removals', async () => {
    await db.exec('reset role');
    await db.query('insert into receita_sub_receitas(id,receita_id,sub_receita_id,quantidade) values($1,$2,$3,1)',[id(102),foreign,target]);
    await db.exec('set role authenticated');
    const context=await preview(),before=await snapshot();
    await expect(remove(context)).rejects.toMatchObject({code:'23503'});
    expect(await snapshot()).toEqual(before);
  });
  it('rejects inactive and anonymous access without changing data', async () => {
    const context=await preview(),before=await snapshot();
    await db.query("select set_config('test.access','false',false)");
    await expect(remove(context)).rejects.toMatchObject({code:'42501'});
    await db.query("select set_config('test.access','true',false),set_config('request.jwt.claim.sub','',false)");
    await expect(remove(context)).rejects.toMatchObject({code:'42501'});
    expect(await snapshot()).toEqual(before);
  });
  it('deletes a recipe with no blocking uses through the same confirmation', async () => {
    const context=await preview(parent); expect(context.usos).toEqual([]);
    await remove(context,parent);
    expect((await db.query('select id from receitas where id=$1',[target])).rows).toHaveLength(1);
    expect((await db.query('select id from receitas where id=$1',[parent])).rows).toHaveLength(0);
  });
});
