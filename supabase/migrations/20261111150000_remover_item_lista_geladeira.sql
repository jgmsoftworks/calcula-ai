-- Removing a list entry is administrative: retain its final balance snapshot and
-- all previous movements, without deleting the recipe or inventing an outflow.
create function public.remover_item_da_geladeira(p_receita_id uuid, p_request_id uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare
  v_user uuid := auth.uid();
  v_item public.geladeira_itens%rowtype;
  v_receita public.receitas%rowtype;
  v_evento public.geladeira_movimentacoes%rowtype;
  v_solicitacao jsonb := jsonb_build_object('receita',p_receita_id,'operacao','remover_da_lista');
  v_id uuid;
begin
  if v_user is null or not private.can_use_app() then
    raise exception 'Sua conta não tem acesso ativo.' using errcode='42501';
  end if;
  if p_receita_id is null or p_request_id is null then
    raise exception 'Item inválido.' using errcode='22023';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(v_user::text || p_request_id::text,0));
  select * into v_evento from public.geladeira_movimentacoes where user_id=v_user and request_id=p_request_id;
  if found then
    if v_evento.solicitacao is distinct from v_solicitacao then
      raise exception 'Identificador já utilizado em outra operação.' using errcode='22023';
    end if;
    return v_evento.id;
  end if;
  select * into v_receita from public.receitas where id=p_receita_id and user_id=v_user for update;
  if not found then raise exception 'Receita não encontrada.' using errcode='42501'; end if;
  select * into v_item from public.geladeira_itens where receita_id=p_receita_id and user_id=v_user for update;
  if not found then raise exception 'Item não encontrado na Geladeira.' using errcode='P0002'; end if;
  insert into public.geladeira_movimentacoes(user_id,item_id,receita_id,receita_nome,unidade,tipo,quantidade,
    saldo_anterior,saldo_atual,custo_unitario,observacao,motivo,request_id,solicitacao)
  values(v_user,v_item.id,p_receita_id,v_receita.nome,v_item.unidade,'remocao',0,
    v_item.estoque_atual,v_item.estoque_atual,private.custo_unitario_geladeira(p_receita_id),
    'Item removido somente da lista da Geladeira. Receita e histórico preservados.','Remoção da lista',p_request_id,v_solicitacao)
  returning id into v_id;
  delete from public.geladeira_itens where id=v_item.id and user_id=v_user;
  return v_id;
end;
$$;
revoke all on function public.remover_item_da_geladeira(uuid,uuid) from public,anon;
grant execute on function public.remover_item_da_geladeira(uuid,uuid) to authenticated;
