-- Additive, read-only endpoint. Uses the caller's RLS and never accepts an owner ID.
create or replace function public.listar_produtos_pagina(
  p_busca text default '',
  p_marcas text[] default '{}',
  p_categorias text[] default '{}',
  p_unidade text default '',
  p_abaixo_minimo boolean default false,
  p_pagina integer default 1,
  p_tamanho integer default 40
) returns jsonb
language sql stable security invoker
set search_path = ''
as $function$
  with params as (
    select lower(btrim(coalesce(p_busca, ''))) as busca,
      least(100, greatest(1, coalesce(p_tamanho, 40))) as tamanho
  ), base as materialized (
    select p.id, p.user_id, p.nome, p.codigo_interno, p.codigos_barras,
      p.marcas, p.categorias, p.unidade_compra, p.custo_unitario,
      p.estoque_atual, p.estoque_minimo, p.unidade_uso, p.fator_conversao,
      p.imagem_url, p.ativo, p.created_at, p.updated_at
    from public.produtos p cross join params args
    where p.user_id = (select auth.uid()) and p.ativo
      and (args.busca = '' or strpos(lower(p.nome), args.busca) > 0
        or p.codigo_interno::text = case when args.busca ~ '^[0-9]+$'
          then coalesce(nullif(ltrim(args.busca, '0'), ''), '0') else null end
        or exists (select 1 from unnest(p.codigos_barras) codigo where strpos(codigo, args.busca) > 0))
      and (coalesce(cardinality(p_marcas), 0) = 0 or p.marcas && p_marcas)
      and (coalesce(p_unidade, '') = '' or
        case when lower(p.unidade_compra) = 'kg' then 'k' else lower(p.unidade_compra) end =
        case when lower(p_unidade) = 'kg' then 'k' else lower(p_unidade) end)
      and (not coalesce(p_abaixo_minimo, false) or (p.estoque_minimo > 0 and p.estoque_atual < p.estoque_minimo))
  ), filtrados as materialized (
    select * from base
    where coalesce(cardinality(p_categorias), 0) = 0 or categorias && p_categorias
  ), contagem as (
    select count(*) as total from filtrados
  ), paginacao as (
    select total, tamanho,
      least(greatest(1, coalesce(p_pagina, 1)), greatest(1, ceil(total::numeric / tamanho)::integer)) as pagina
    from contagem cross join params
  ), pagina as (
    select * from filtrados order by codigo_interno, id
    limit (select tamanho from paginacao)
    offset (select (pagina - 1)::bigint * tamanho from paginacao)
  ), categorias_resumo as (
    select categoria as nome, count(distinct p.id) as count,
      (array_agg(p.imagem_url order by p.codigo_interno, p.id) filter (where p.imagem_url is not null))[1] as imagem
    from base p cross join lateral unnest(p.categorias) categoria
    group by categoria
  )
  select jsonb_build_object(
    'produtos', coalesce((select jsonb_agg(to_jsonb(p) order by p.codigo_interno, p.id) from pagina p), '[]'::jsonb),
    'total', total, 'pagina', paginacao.pagina,
    'totalBusca', (select count(*) from base),
    'categorias', coalesce((select jsonb_agg(to_jsonb(c) order by c.nome) from categorias_resumo c), '[]'::jsonb)
  ) from paginacao;
$function$;

revoke all on function public.listar_produtos_pagina(text,text[],text[],text,boolean,integer,integer) from public, anon;
grant execute on function public.listar_produtos_pagina(text,text[],text[],text,boolean,integer,integer) to authenticated;
