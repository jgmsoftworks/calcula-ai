import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
const migration = readFileSync('supabase/migrations/20261117012133_receitas_pdv_integracao.sql', 'utf8');
const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const owner=id(1), other=id(2), first=id(10), second=id(11), foreign=id(12);
const hash='a'.repeat(64), otherHash='b'.repeat(64);
let db: PGlite;
type Catalog = { receitas: { id: string; codigo_pdv: string | null; custo_unitario: number | null; nome: string; tipo_produto: { id: string; nome: string } | null }[] };
async function catalog(month='2026-03', key=hash) {
  await db.exec('set role service_role');
  return (await db.query<{ data: Catalog }>('select public.exportar_receitas_painel($1,$2) as data',[key,month])).rows[0].data;
}
beforeEach(async () => {
  db = new PGlite();
  await db.exec(readFileSync('supabase/tests/fixtures/recipe_save.sql','utf8'));
  await db.exec(readFileSync('supabase/migrations/20261103144515_atomic_recipe_save.sql','utf8'));
  await db.exec(`create role service_role bypassrls;
    alter table tipos_produto add column nome text;
    create table auth.users(id uuid primary key);
    insert into auth.users values ('${owner}'),('${other}');
    insert into profiles values ('${owner}','lite','trial'),('${other}','lite','trial');
    insert into planos values ('lite','{"receitas":-1}');
    create table receita_custos_historico(id bigint generated always as identity, user_id uuid, receita_id uuid,
      custo_unitario numeric, registrado_em timestamptz, rendimento_unidade text, moeda text, excluida boolean default false);
    grant usage on schema public to service_role;
    grant select on receitas,receita_custos_historico,markups,tipos_produto to service_role;
    insert into receitas(id,user_id,nome) values ('${first}','${owner}','Nome diferente do PDV'),('${second}','${owner}','Sem código'),('${foreign}','${other}','Outra conta');
    insert into receita_custos_historico(user_id,receita_id,custo_unitario,registrado_em,rendimento_unidade,moeda) values
      ('${owner}','${first}',10,'2026-03-16 15:00Z','un','BRL'),('${owner}','${first}',12,'2026-04-01 03:00Z','un','BRL'),
      ('${other}','${foreign}',99,'2026-03-16 15:00Z','un','BRL');`);
  await db.exec(migration);
  await db.exec(readFileSync('supabase/migrations/20261117134100_excluir_subreceitas_catalogo_painel.sql','utf8'));
  await db.exec(readFileSync('supabase/migrations/20261117190000_exportar_tipo_produto_painel.sql','utf8'));
  await db.exec(`insert into receita_integracoes(user_id,nome,token_hash) values ('${owner}','Painel teste','${hash}'),('${other}','Outra conta','${otherHash}');`);
});
afterEach(async () => { await db?.close(); });
describe('PDV identity and owner-scoped catalog SQL', () => {
  it('includes sale recipes without codes, late codes, name edits and code removal without linking by name', async () => {
    expect((await catalog()).receitas).toHaveLength(2);
    await db.exec(`reset role; update receitas set codigo_pdv=' 00471 ',nome='Nome alterado' where id='${first}';`);
    expect((await catalog()).receitas.find(r=>r.id===first)).toMatchObject({codigo_pdv:'00471',nome:'Nome alterado'});
    await db.exec(`reset role; update receitas set codigo_pdv='' where id='${first}'; delete from receitas where id='${second}';`);
    expect((await catalog()).receitas).toMatchObject([{id:first,codigo_pdv:null}]);
  });
  it('excludes sub-recipes even with a PDV code, preserving the parent cost and its ingredients', async () => {
    await db.exec(`insert into markups values ('${id(30)}','${owner}','normal',3),('${id(31)}','${owner}','sub_receita',1);
      update receitas set markup_id='${id(30)}' where id='${first}';
      update receitas set markup_id='${id(31)}',codigo_pdv='471' where id='${second}';
      insert into receita_sub_receitas(receita_id,sub_receita_id,quantidade) values ('${first}','${second}',2);`);
    expect((await catalog()).receitas).toMatchObject([{id:first,custo_unitario:10}]);
    expect((await catalog('2026-04')).receitas).toMatchObject([{id:first,custo_unitario:12}]);
    await db.exec('reset role');
    expect((await db.query('select count(*)::int as n from receitas')).rows[0].n).toBe(3);
    expect((await db.query('select count(*)::int as n from receita_sub_receitas')).rows[0].n).toBe(1);
    expect((await db.query('select count(*)::int as n from receita_custos_historico')).rows[0].n).toBe(3);
  });
  it('uses the current markup type and keeps unclassified sale recipes in the catalog', async () => {
    await db.exec(`insert into markups values ('${id(30)}','${owner}','normal',3);
      update receitas set markup_id='${id(30)}' where id='${first}';`);
    expect((await catalog()).receitas).toHaveLength(2);
    await db.exec(`reset role; update markups set tipo='sub_receita' where id='${id(30)}';`);
    expect((await catalog()).receitas.map(r=>r.id)).toEqual([second]);
    await db.exec(`reset role; update markups set tipo='normal' where id='${id(30)}';`);
    expect((await catalog()).receitas).toHaveLength(2);
  });
  it('exports the current product type, updates renamed types and never exposes another owner type', async () => {
    await db.exec(`insert into tipos_produto(id,user_id,nome) values ('${id(40)}','${owner}','Fatia suprema'),('${id(41)}','${other}','Privado');
      update receitas set tipo_produto_id='${id(40)}' where id='${first}';`);
    expect((await catalog()).receitas.find(r => r.id === first)?.tipo_produto).toEqual({ id: id(40), nome: 'Fatia suprema' });
    expect((await catalog()).receitas.find(r => r.id === second)?.tipo_produto).toBeNull();
    await db.exec(`reset role; update tipos_produto set nome='Bolo gelado' where id='${id(40)}';`);
    expect((await catalog()).receitas.find(r => r.id === first)?.tipo_produto?.nome).toBe('Bolo gelado');
    await db.exec(`reset role; update receitas set tipo_produto_id='${id(41)}' where id='${first}';`);
    expect((await catalog()).receitas.find(r => r.id === first)?.tipo_produto).toBeNull();
  });
  it('enforces exact unique codes only within an account, preserving zeroes and allowing multiple blanks', async () => {
    await db.exec(`update receitas set codigo_pdv='471' where id in ('${first}','${foreign}');`);
    await expect(db.query('update receitas set codigo_pdv=$1 where id=$2',['471',second])).rejects.toMatchObject({code:'23505'});
    await db.query('update receitas set codigo_pdv=$1 where id=$2',['0471',second]);
    expect((await catalog()).receitas.map(r=>r.codigo_pdv).sort()).toEqual(['0471','471']);
    expect((await catalog('2026-03',otherHash)).receitas.map(r=>r.id)).toEqual([foreign]);
    await db.exec("reset role; update receitas set codigo_pdv='   ';");
    expect((await catalog()).receitas.every(r=>r.codigo_pdv===null)).toBe(true);
  });
  it('does not replace previous-month costs with current ones or fabricate prehistory', async () => {
    expect((await catalog('2026-02')).receitas.find(r=>r.id===first)?.custo_unitario).toBeNull();
    expect((await catalog('2026-03')).receitas.find(r=>r.id===first)?.custo_unitario).toBe(10);
    expect((await catalog('2026-04')).receitas.find(r=>r.id===first)?.custo_unitario).toBe(12);
    expect((await catalog('2099-01')).receitas.find(r=>r.id===first)?.custo_unitario).toBeNull();
  });
  it('rejects revoked/unknown keys and denies browser access to keys and export RPC', async () => {
    await expect(catalog('2026-03','c'.repeat(64))).rejects.toMatchObject({code:'28000'});
    await db.exec(`reset role; update receita_integracoes set revoked_at=now() where token_hash='${hash}';`);
    await expect(catalog()).rejects.toMatchObject({code:'28000'});
    for (const role of ['anon','authenticated']) {
      await db.exec(`reset role; set role ${role};`);
      await expect(db.query('select * from receita_integracoes')).rejects.toMatchObject({code:'42501'});
      await expect(db.query('select exportar_receitas_painel($1,$2)',[hash,'2026-03'])).rejects.toMatchObject({code:'42501'});
    }
  });
  it('keeps RLS on recipe edits and rejects invalid code lengths/control characters', async () => {
    await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub','${owner}',false);`);
    expect((await db.query('update receitas set codigo_pdv=$1 where id=$2 returning id',['471',foreign])).rows).toEqual([]);
    for (const code of ['a'.repeat(65),'47\n1']) await expect(db.query('update receitas set codigo_pdv=$1 where id=$2',[code,first])).rejects.toMatchObject({code:'23514'});
  });
  it('returns catalogs above the normal REST row limit without losing recipes', async () => {
    await db.exec(`insert into receitas(user_id,nome) select '${owner}','Receita '||n from generate_series(1,1100) n;`);
    expect((await catalog()).receitas).toHaveLength(1102);
  });
});
