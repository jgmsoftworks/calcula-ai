-- Optional stock metadata only. Existing recipes, costs and inventory are unchanged.
set lock_timeout = '3s';
set statement_timeout = '30s';

create function public.validar_rotulo_nutricional(rotulo jsonb, proprietario uuid)
returns boolean language plpgsql immutable security invoker
set search_path = pg_catalog
as $$
declare
  linha jsonb;
  ids text[] := array[]::text[];
  id text;
  permitidos constant text[] := array['energia','carboidratos','acucares_totais','acucares_adicionados','proteinas','gorduras_totais','gorduras_saturadas','gorduras_trans','fibras','sodio','lactose','galactose'];
begin
  if rotulo is null then return true; end if;
  if jsonb_typeof(rotulo) is distinct from 'object' or octet_length(rotulo::text) > 12000 then return false; end if;
  if not (rotulo ?& array['versao','quantidade_referencia','unidade_referencia','marca','nutrientes','foto_path','origem','conferido']) then return false; end if;
  if (rotulo - array['versao','quantidade_referencia','unidade_referencia','marca','nutrientes','foto_path','origem','conferido']) <> '{}'::jsonb then return false; end if;
  if rotulo->'versao' <> '1'::jsonb
     or jsonb_typeof(rotulo->'marca') is distinct from 'string' or length(rotulo->>'marca') > 120
     or (rotulo->>'unidade_referencia') not in ('g','kg','ml','l')
     or jsonb_typeof(rotulo->'unidade_referencia') is distinct from 'string'
     or (rotulo->>'origem') not in ('manual','foto') or jsonb_typeof(rotulo->'origem') is distinct from 'string'
     or jsonb_typeof(rotulo->'conferido') is distinct from 'boolean'
     or jsonb_typeof(rotulo->'nutrientes') is distinct from 'array' then return false; end if;
  if jsonb_array_length(rotulo->'nutrientes') > 12 then return false; end if;
  if rotulo->'quantidade_referencia' <> 'null'::jsonb then
    if jsonb_typeof(rotulo->'quantidade_referencia') <> 'number' then return false; end if;
    if (rotulo->>'quantidade_referencia')::numeric <= 0 or (rotulo->>'quantidade_referencia')::numeric > 1000000 then return false; end if;
  end if;
  if rotulo->'foto_path' <> 'null'::jsonb then
    if jsonb_typeof(rotulo->'foto_path') <> 'string' or length(rotulo->>'foto_path') > 250
       or (rotulo->>'foto_path') !~ ('^' || proprietario::text || '/[0-9a-f-]+\.(jpg|png|webp)$') then return false; end if;
  end if;
  for linha in select value from jsonb_array_elements(rotulo->'nutrientes') loop
    if jsonb_typeof(linha) <> 'object' or not (linha ?& array['nutriente','quantidade'])
       or (linha - array['nutriente','quantidade']) <> '{}'::jsonb then return false; end if;
    if jsonb_typeof(linha->'nutriente') <> 'string' then return false; end if;
    id := linha->>'nutriente';
    if id <> '' then
      if not (id = any(permitidos)) or id = any(ids) then return false; end if;
      ids := array_append(ids, id);
    elsif linha->'quantidade' <> 'null'::jsonb then return false;
    end if;
    if linha->'quantidade' <> 'null'::jsonb then
      if jsonb_typeof(linha->'quantidade') <> 'number' then return false; end if;
      if (linha->>'quantidade')::numeric < 0 or (linha->>'quantidade')::numeric > 1000000 then return false; end if;
    end if;
  end loop;
  if (rotulo->>'conferido')::boolean then
    if rotulo->'quantidade_referencia' = 'null'::jsonb or not (ids @> permitidos[1:10]) then return false; end if;
    if exists (select 1 from jsonb_array_elements(rotulo->'nutrientes') item where item->>'nutriente' = any(permitidos[1:10]) and item->'quantidade' = 'null'::jsonb) then return false; end if;
  end if;
  return true;
exception when others then return false;
end;
$$;
revoke all on function public.validar_rotulo_nutricional(jsonb, uuid) from public, anon;
grant execute on function public.validar_rotulo_nutricional(jsonb, uuid) to authenticated;

alter table public.produtos add column rotulo_nutricional jsonb;
alter table public.produtos add constraint produtos_rotulo_nutricional_valido
  check (public.validar_rotulo_nutricional(rotulo_nutricional, user_id));
comment on column public.produtos.rotulo_nutricional is 'Rótulo de origem cadastrado no estoque; não é uma etiqueta calculada ou certificada.';

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('rotulos-nutricionais', 'rotulos-nutricionais', false, 8388608, array['image/jpeg','image/png','image/webp']);

create policy "Owners read nutrition label photos" on storage.objects for select to authenticated
using (bucket_id = 'rotulos-nutricionais' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Owners upload nutrition label photos" on storage.objects for insert to authenticated
with check (bucket_id = 'rotulos-nutricionais' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Owners delete nutrition label photos" on storage.objects for delete to authenticated
using (bucket_id = 'rotulos-nutricionais' and (storage.foldername(name))[1] = (select auth.uid())::text);
