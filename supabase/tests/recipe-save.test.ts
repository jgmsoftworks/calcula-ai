// @vitest-environment node
import { PGlite } from '@electric-sql/pglite';
import { readFileSync, readdirSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { beforeAll, afterAll, beforeEach, describe, it, expect } from 'vitest';
import { recipeDuplicateRequest, type RecipeSaveRequest } from '../../src/lib/recipe-save';
import type { ReceitaCompleta } from '../../src/types/receitas';

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const owner=id(1), other=id(2), original=id(10), sub=id(11), foreign=id(12), product=id(20), markup=id(30);
const keys=['ingredientes','sub_receitas','embalagens','passos','mao_obra'] as const;
const tables=['receita_ingredientes','receita_sub_receitas','receita_embalagens','receita_passos_preparo','receita_mao_obra'];
let db: PGlite;
let version: string;
let componentVersions: Record<string, unknown>;
let payload: ReturnType<typeof makePayload>;
function makePayload() {
  return {
    recipe: {nome:'Bolo atualizado',rendimento_valor:10,rendimento_unidade:'un',status:'finalizada',preco_venda:77,markup_id:markup},
    components: {
      ingredientes:[{id:id(100),produto_id:product,quantidade:200}],
      sub_receitas:[{id:id(101),sub_receita_id:sub,quantidade:1}],
      embalagens:[{id:id(102),produto_id:product,quantidade:1}],
      passos:[{id:id(103),ordem:1,descricao:'Assar'}],
      mao_obra:[{id:id(104),funcionario_id:id(50),funcionario_nome:'Pessoa fictícia',funcionario_cargo:'Produção',custo_por_hora:10,tempo:1,unidade_tempo:'horas',valor_total:10}],
    },
  };
}
async function save(recipeId=original,create=false,requestId=randomUUID(),expected=version) {
  return (await db.query<{result:{id:string;numero_sequencial:number;updated_at:string}}>(
    'select public.salvar_receita_completa($1,$2,$3::jsonb,$4::jsonb,$5,$6::timestamptz,$7::jsonb) as result',
    [recipeId,requestId,JSON.stringify(payload.recipe),JSON.stringify(payload.components),create,create?null:expected,create?null:JSON.stringify(componentVersions)])).rows[0].result;
}
async function snapshot() {
  return (await db.query(`select jsonb_build_object(
    'recipes',(select jsonb_agg(to_jsonb(r) order by id) from receitas r),
    'ingredients',(select jsonb_agg(to_jsonb(r) order by id) from receita_ingredientes r),
    'sub',(select jsonb_agg(to_jsonb(r) order by id) from receita_sub_receitas r),
    'packages',(select jsonb_agg(to_jsonb(r) order by id) from receita_embalagens r),
    'steps',(select jsonb_agg(to_jsonb(r) order by id) from receita_passos_preparo r),
    'labor',(select jsonb_agg(to_jsonb(r) order by id) from receita_mao_obra r)) as data`)).rows[0];
}
async function prepareCopy() {
  await save();
  const source = (await db.query<{ data: ReceitaCompleta }>(
    'select row_to_json(r) as data from receitas r where id=$1', [original],
  )).rows[0].data;
  for (let i=0;i<keys.length;i++) {
    const rows = (await db.query<{ data: never }>(
      `select coalesce(json_agg(t order by id),'[]') as data from ${tables[i]} t where receita_id=$1`, [original],
    )).rows[0].data;
    source[keys[i]] = rows;
  }
  return recipeDuplicateRequest(source, `${source.nome} (Cópia)`);
}
async function saveCopy(request: RecipeSaveRequest) {
  return (await db.query<{ result: unknown }>(
    'select public.salvar_receita_completa($1,$2,$3::jsonb,$4::jsonb,$5,$6::timestamptz,$7::jsonb) as result',
    [request.p_receita_id,request.p_request_id,JSON.stringify(request.p_receita),JSON.stringify(request.p_componentes),
      request.p_criar,request.p_expected_updated_at,request.p_expected_components],
  )).rows[0].result;
}
beforeAll(async()=>{
  db=new PGlite();
  await db.exec(readFileSync('supabase/tests/fixtures/recipe_save.sql','utf8'));
  const migration = readdirSync('supabase/migrations').find(name => name.endsWith('_atomic_recipe_save.sql'));
  if (!migration) throw new Error('Recipe save migration not found');
  await db.exec(readFileSync(`supabase/migrations/${migration}`,'utf8'));
},30000);
afterAll(async()=>{await db?.close();});
beforeEach(async()=>{
  await db.exec(`reset role; select set_config('test.fail_table','',false),set_config('test.access','true',false);
    truncate receitas,receita_ingredientes,receita_sub_receitas,receita_embalagens,receita_passos_preparo,receita_mao_obra,produtos,markups,tipos_produto,profiles,planos cascade;
    insert into profiles values ('${owner}','lite','trial'),('${other}','lite','trial');
    insert into planos values ('lite','{"receitas":3}');
    insert into produtos values ('${product}','${owner}',40,'g',1000),('${id(21)}','${other}',40,'g',1000);
    insert into markups values ('${markup}','${owner}','normal',3),('${id(31)}','${owner}','sub_receita',1);
    insert into receitas(id,user_id,nome,preco_venda,markup_id) values
      ('${original}','${owner}','Original',77,'${markup}'),('${sub}','${owner}','Sub',4,'${id(31)}'),('${foreign}','${other}','Outra conta',88,'${markup}');
    insert into receita_ingredientes(id,receita_id,produto_id,quantidade) values ('${id(90)}','${original}','${product}',100);
    insert into receita_passos_preparo(id,receita_id,ordem,descricao,imagem_url) values ('${id(103)}','${original}',1,'Antes','https://example.test/image.png');
    set role authenticated;
    select set_config('request.jwt.claim.sub','${owner}',false);`);
  version=(await db.query<{v:string}>('select updated_at::text as v from receitas where id=$1',[original])).rows[0].v;
  componentVersions={};
  for(let i=0;i<keys.length;i++) {
    componentVersions[keys[i]]=(await db.query(`select id,updated_at::text as updated_at from ${tables[i]} where receita_id=$1 order by id`,[original])).rows;
  }
  payload=makePayload();
});
describe('Atomic recipe save in PostgreSQL with RLS and plan triggers',()=>{
  it('saves every component, preserves step image/IDs and manual price',async()=>{
    const result=await save();expect(result.id).toBe(original);
    for(const table of tables) expect((await db.query<{n:number}>(`select count(*)::int as n from ${table} where receita_id=$1`,[original])).rows[0].n).toBe(1);
    expect((await db.query<{n:number}>('select quantidade::float as n from receita_ingredientes where receita_id=$1',[original])).rows[0].n).toBe(200);
    expect((await db.query<{imagem_url:string}>('select imagem_url from receita_passos_preparo where id=$1',[id(103)])).rows[0].imagem_url).toBe('https://example.test/image.png');
    expect((await db.query<{n:number}>('select preco_venda::float as n from receitas where id=$1',[original])).rows[0].n).toBe(77);
  });
  it.each(tables)('rolls back every row and prior deletions when %s fails during editing',async table=>{
    const before=await snapshot();
    await db.query("select set_config('test.fail_table',$1,false)",[table]);
    await expect(save()).rejects.toMatchObject({code:'23514'});
    expect(await snapshot()).toEqual(before);
  });
  it.each(tables)('leaves no partial parent when %s fails during creation; retry creates only once',async table=>{
    const newId=id(15),request=randomUUID();
    // Components must use fresh IDs for a different recipe.
    keys.forEach((key,i)=>payload.components[key][0].id=id(200+i));
    const before=await snapshot();
    await db.query("select set_config('test.fail_table',$1,false)",[table]);
    await expect(save(newId,true,request)).rejects.toMatchObject({code:'23514'});
    expect(await snapshot()).toEqual(before);
    await db.query("select set_config('test.fail_table','',false)");
    await save(newId,true,request);await save(newId,true,request);
    expect((await db.query<{n:number}>('select count(*)::int as n from receitas where id=$1',[newId])).rows[0].n).toBe(1);
  });
  it('acknowledges a lost success response at the plan limit, without replaying writes',async()=>{
    keys.forEach((key,i)=>payload.components[key][0].id=id(200+i));
    const request=randomUUID(), first=await save(id(15),true,request);
    const after=await snapshot();
    await db.query("select set_config('test.fail_table','receita_ingredientes',false)");
    expect(await save(id(15),true,request)).toEqual(first);
    expect(await snapshot()).toEqual(after);
  });
  it('enforces plan limit and rolls back the denied creation',async()=>{
    await db.exec('reset role; update planos set limites=\'{"receitas":2}\'; set role authenticated;');
    const before=await snapshot();
    await expect(save(id(15),true)).rejects.toMatchObject({code:'23514',detail:'plan_limit_exceeded'});
    expect(await snapshot()).toEqual(before);
  });
  it('blocks expired access, other owners and foreign product references',async()=>{
    await db.query("select set_config('test.access','false',false)");
    await expect(save()).rejects.toMatchObject({code:'42501'});
    await db.query("select set_config('test.access','true',false)");
    await expect(save(foreign)).rejects.toMatchObject({code:'40001'});
    payload.components.ingredientes[0].produto_id=id(21);
    await expect(save()).rejects.toMatchObject({code:'42501'});
  });
  it('does not move a component ID from another recipe in the same account',async()=>{
    await db.query('insert into receita_ingredientes(id,receita_id,produto_id,quantidade) values($1,$2,$3,1)',[id(100),sub,product]);
    const before=await snapshot();
    await expect(save()).rejects.toMatchObject({code:'42501'});
    expect(await snapshot()).toEqual(before);
  });
  it('protects stale edits while allowing an identical successful retry',async()=>{
    const request=randomUUID(); const first=await save(original,false,request);
    expect(await save(original,false,request)).toEqual(first);
    payload.recipe.nome='Outra edição';
    await expect(save()).rejects.toMatchObject({code:'40001'});
    await expect(save(original,false,request)).rejects.toMatchObject({code:'22023'});
  });
  it('detects a concurrent step edit even when the parent timestamp did not change',async()=>{
    await db.query('update receita_passos_preparo set descricao=$1 where id=$2',['Outra edição',id(103)]);
    const before=await snapshot();
    await expect(save()).rejects.toMatchObject({code:'40001'});
    expect(await snapshot()).toEqual(before);
  });
  it('rejects missing arrays and duplicate IDs instead of deleting data',async()=>{
    delete (payload.components as Partial<typeof payload.components>).embalagens;
    await expect(save()).rejects.toMatchObject({code:'22023'});
    payload=makePayload();payload.components.ingredientes.push(payload.components.ingredientes[0]);
    await expect(save()).rejects.toMatchObject({code:'22023'});
  });
  it('rejects a dependency cycle before component triggers run',async()=>{
    payload.components.sub_receitas[0].sub_receita_id=original;
    await expect(save()).rejects.toMatchObject({code:'22023'});
  });
  it('denies anonymous execution',async()=>{
    await db.exec('reset role; set role anon;');
    await expect(save()).rejects.toMatchObject({code:'42501'});
  });
  it.each(tables)('rolls back a copy built by the frontend helper when %s fails, preserving the entire source', async table=>{
    const request=await prepareCopy();
    const before=await snapshot();
    await db.query("select set_config('test.fail_table',$1,false)",[table]);
    await expect(saveCopy(request)).rejects.toMatchObject({code:'23514'});
    expect(await snapshot()).toEqual(before);
    await db.query("select set_config('test.fail_table','',false)");
    const first=await saveCopy(request);
    const after=await snapshot();
    expect(await saveCopy(request)).toEqual(first);
    expect(await snapshot()).toEqual(after);
  });
  it('copies quantities, labor, steps and pricing, leaves source rows intact and acknowledges a retry at the plan limit', async()=>{
    const request=await prepareCopy();
    const before=(await snapshot()).data as Record<string, Record<string, unknown>[]>;
    const first=await saveCopy(request);
    const after=(await snapshot()).data as Record<string, Record<string, unknown>[]>;
    for(const key of Object.keys(before)) {
      const sourceRows=before[key];
      for(const row of sourceRows) expect(after[key].find(r=>r.id===row.id)).toEqual(row);
    }
    for(let i=0;i<tables.length;i++) {
      const rows=(await db.query<{ data: Record<string, unknown> }>(
        `select row_to_json(t) as data from ${tables[i]} t where receita_id=$1`,[request.p_receita_id],
      )).rows.map(r=>r.data);
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject(request.p_componentes[keys[i]][0]);
      expect(rows[0].receita_id).toBe(request.p_receita_id);
    }
    const copy=(await db.query<{ data: Record<string, unknown> }>(
      'select row_to_json(r) as data from receitas r where id=$1',[request.p_receita_id],
    )).rows[0].data;
    expect(copy).toMatchObject({nome:'Bolo atualizado (Cópia)',preco_venda:77,rendimento_valor:10,markup_id:markup});
    await db.query("select set_config('test.fail_table','receita_ingredientes',false)");
    expect(await saveCopy(request)).toEqual(first);
    expect((await snapshot()).data).toEqual(after);
  });
});
