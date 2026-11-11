-- Read-only preview. Each use is a location, even when it contains several lines
-- for the same sub-recipe. Versions are returned unchanged for final confirmation.
create function public.listar_usos_receita(p_receita_id uuid)
returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare
  v_user uuid := auth.uid();
  v_receita public.receitas%rowtype;
  v_usos jsonb;
begin
  if v_user is null or not coalesce(private.can_use_app(),false) then
    raise exception 'Sua conta não tem acesso ativo.' using errcode='42501';
  end if;
  select * into v_receita from public.receitas where id=p_receita_id and user_id=v_user;
  if not found then raise exception 'Receita não encontrada.' using errcode='P0002'; end if;
  select coalesce(jsonb_agg(u.dados order by u.tipo,u.id),'[]'::jsonb) into v_usos from (
    select 'receita' as tipo,r.id,jsonb_build_object(
      'tipo','receita','id',r.id,'nome',r.nome,'numero_sequencial',r.numero_sequencial,
      'imagem_url',r.imagem_url,'updated_at',r.updated_at,
      'vinculos',jsonb_agg(jsonb_build_object('id',s.id,'updated_at',s.updated_at,'quantidade',s.quantidade) order by s.id)
    ) as dados
    from public.receita_sub_receitas s join public.receitas r on r.id=s.receita_id and r.user_id=v_user
    where s.sub_receita_id=p_receita_id and r.id<>p_receita_id
    group by r.id
    union all
    select 'geladeira',g.id,jsonb_build_object(
      'tipo','geladeira','id',g.id,'nome','Geladeira','imagem_url',v_receita.imagem_url,
      'updated_at',g.updated_at,'estoque_atual',g.estoque_atual,'estoque_minimo',g.estoque_minimo,'unidade',g.unidade
    ) from public.geladeira_itens g where g.receita_id=p_receita_id and g.user_id=v_user
  ) u;
  return jsonb_build_object('receita',jsonb_build_object('id',v_receita.id,'nome',v_receita.nome,
    'imagem_url',v_receita.imagem_url,'updated_at',v_receita.updated_at),'usos',v_usos);
end;
$$;
revoke all on function public.listar_usos_receita(uuid) from public,anon;
grant execute on function public.listar_usos_receita(uuid) to authenticated;

-- A single transaction removes only the explicitly reviewed uses and the target.
-- A changed/new dependency, concurrent stock movement or any write failure rolls
-- back the whole operation. Other recipes, production records and history remain.
create function public.excluir_receita_com_vinculos(
  p_receita_id uuid,p_expected_updated_at timestamptz,p_usos jsonb
) returns void language plpgsql security definer set search_path='' as $$
declare
  v_user uuid := auth.uid();
  v_receita public.receitas%rowtype;
  v_item public.geladeira_itens%rowtype;
  v_contexto jsonb;
begin
  if v_user is null or not coalesce(private.can_use_app(),false) then
    raise exception 'Sua conta não tem acesso ativo.' using errcode='42501';
  end if;
  if p_receita_id is null or p_expected_updated_at is null or jsonb_typeof(p_usos) is distinct from 'array' then
    raise exception 'Confirmação de exclusão inválida.' using errcode='22023';
  end if;
  -- Same owner mutex as the recipe editor; the target lock also serializes fridge RPCs.
  perform pg_advisory_xact_lock(hashtextextended('recipe-save:' || v_user::text,0));
  select * into v_receita from public.receitas where id=p_receita_id and user_id=v_user for update;
  if not found then raise exception 'Receita não encontrada.' using errcode='P0002'; end if;
  perform r.id from public.receitas r where r.user_id=v_user and r.id in (
    select s.receita_id from public.receita_sub_receitas s where s.sub_receita_id=p_receita_id
  ) order by r.id for update;
  perform s.id from public.receita_sub_receitas s join public.receitas r on r.id=s.receita_id
    where s.sub_receita_id=p_receita_id and r.user_id=v_user order by s.id for update of s;
  select * into v_item from public.geladeira_itens where receita_id=p_receita_id and user_id=v_user for update;
  v_contexto := public.listar_usos_receita(p_receita_id);
  if v_receita.updated_at is distinct from p_expected_updated_at or v_contexto->'usos' is distinct from p_usos then
    raise exception 'A receita ou seus usos mudaram. Atualize a lista e confira novamente.' using errcode='40001';
  end if;

  if v_item.id is not null then
    insert into public.geladeira_movimentacoes(user_id,item_id,receita_id,receita_nome,unidade,tipo,quantidade,
      saldo_anterior,saldo_atual,custo_unitario,observacao,motivo,request_id,solicitacao)
    values(v_user,v_item.id,p_receita_id,v_receita.nome,v_item.unidade,'remocao',0,
      v_item.estoque_atual,v_item.estoque_atual,private.custo_unitario_geladeira(p_receita_id),
      'Item removido da Geladeira durante a exclusão da receita. Histórico preservado.',
      'Exclusão da receita',gen_random_uuid(),jsonb_build_object('receita',p_receita_id,'operacao','excluir_receita'));
    delete from public.geladeira_itens where id=v_item.id and user_id=v_user;
  end if;
  delete from public.receita_sub_receitas s using public.receitas r
    where s.receita_id=r.id and r.user_id=v_user and s.sub_receita_id=p_receita_id;
  -- Steps currently have no FK; remove them only after owner/consent checks.
  delete from public.receita_passos_preparo where receita_id=p_receita_id;
  delete from public.receitas where id=p_receita_id and user_id=v_user;
end;
$$;
revoke all on function public.excluir_receita_com_vinculos(uuid,timestamptz,jsonb) from public,anon;
grant execute on function public.excluir_receita_com_vinculos(uuid,timestamptz,jsonb) to authenticated;
