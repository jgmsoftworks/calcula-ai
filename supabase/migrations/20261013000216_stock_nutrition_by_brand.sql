-- Additive rollout: older clients keep using rotulo_nutricional without overwriting this collection.
set lock_timeout = '3s';
set statement_timeout = '30s';
create function public.validar_rotulos_nutricionais(rotulos jsonb, proprietario uuid)
returns boolean language plpgsql immutable security invoker
set search_path = pg_catalog
as $$
declare
  rotulo jsonb;
  linha jsonb;
  marcas text[] := array[]::text[];
  ids text[] := array[]::text[];
  nutrientes text[];
  chave text;
  id text;
  incompleto boolean;
begin
  if rotulos is null then return true; end if;
  if jsonb_typeof(rotulos) is distinct from 'array' or octet_length(rotulos::text) > 2000000 then return false; end if;
  if jsonb_array_length(rotulos) > 50 then return false; end if;
  for rotulo in select value from jsonb_array_elements(rotulos) loop
    if jsonb_typeof(rotulo) is distinct from 'object'
       or not (rotulo ?& array['versao','id','quantidade_referencia','unidade_referencia','marca','nutrientes','foto_path','origem','conferido'])
       or (rotulo - array['versao','id','quantidade_referencia','unidade_referencia','marca','nutrientes','foto_path','origem','conferido']) <> '{}'::jsonb then return false; end if;
    if rotulo->'versao' <> '2'::jsonb or jsonb_typeof(rotulo->'id') is distinct from 'string'
       or jsonb_typeof(rotulo->'marca') is distinct from 'string' or length(rotulo->>'marca') > 120
       or jsonb_typeof(rotulo->'unidade_referencia') is distinct from 'string' or (rotulo->>'unidade_referencia') not in ('g','kg','ml','l')
       or jsonb_typeof(rotulo->'origem') is distinct from 'string' or (rotulo->>'origem') not in ('manual','foto')
       or jsonb_typeof(rotulo->'conferido') is distinct from 'boolean'
       or jsonb_typeof(rotulo->'nutrientes') is distinct from 'array' then return false; end if;
    id := (rotulo->>'id')::uuid::text;
    chave := lower(btrim(rotulo->>'marca'));
    if id = any(ids) or chave = any(marcas) then return false; end if;
    ids := array_append(ids, id);
    marcas := array_append(marcas, chave);
    if jsonb_array_length(rotulo->'nutrientes') > 100 then return false; end if;
    incompleto := chave = '' or jsonb_array_length(rotulo->'nutrientes') = 0 or rotulo->'quantidade_referencia' = 'null'::jsonb;
    if rotulo->'quantidade_referencia' <> 'null'::jsonb then
      if jsonb_typeof(rotulo->'quantidade_referencia') <> 'number' then return false; end if;
      if (rotulo->>'quantidade_referencia')::numeric <= 0 or (rotulo->>'quantidade_referencia')::numeric > 1000000 then return false; end if;
    end if;
    if rotulo->'foto_path' <> 'null'::jsonb then
      if jsonb_typeof(rotulo->'foto_path') <> 'string' or length(rotulo->>'foto_path') > 250 or proprietario is null
         or (rotulo->>'foto_path') !~ ('^' || proprietario::text || '/[0-9a-f-]+\.(jpg|png|webp)$') then return false; end if;
    end if;
    nutrientes := array[]::text[];
    for linha in select value from jsonb_array_elements(rotulo->'nutrientes') loop
      if jsonb_typeof(linha) is distinct from 'object' or not (linha ?& array['nutriente','quantidade','unidade'])
         or (linha - array['nutriente','quantidade','unidade']) <> '{}'::jsonb then return false; end if;
      if jsonb_typeof(linha->'nutriente') <> 'string' or length(linha->>'nutriente') > 120
         or jsonb_typeof(linha->'unidade') <> 'string' or length(linha->>'unidade') > 16 then return false; end if;
      chave := lower(btrim(linha->>'nutriente'));
      if chave <> '' then
        if chave = any(nutrientes) then return false; end if;
        nutrientes := array_append(nutrientes, chave);
      end if;
      if chave = '' or btrim(linha->>'unidade') = '' or linha->'quantidade' = 'null'::jsonb then incompleto := true; end if;
      if linha->'quantidade' <> 'null'::jsonb then
        if jsonb_typeof(linha->'quantidade') <> 'number' then return false; end if;
        if (linha->>'quantidade')::numeric < 0 or (linha->>'quantidade')::numeric > 1000000 then return false; end if;
      end if;
    end loop;
    if (rotulo->>'conferido')::boolean and incompleto then return false; end if;
  end loop;
  return true;
exception when others then return false;
end;
$$;
revoke all on function public.validar_rotulos_nutricionais(jsonb, uuid) from public, anon;
grant execute on function public.validar_rotulos_nutricionais(jsonb, uuid) to authenticated, service_role;
alter table public.produtos add column rotulos_nutricionais jsonb;
alter table public.produtos add constraint produtos_rotulos_nutricionais_validos
  check (public.validar_rotulos_nutricionais(rotulos_nutricionais, user_id));
comment on column public.produtos.rotulos_nutricionais is 'Rótulos de origem separados por marca (versão 2). Nutrientes digitados livremente; ausência não equivale a zero. Sem certificação ou cálculo de receita.';
