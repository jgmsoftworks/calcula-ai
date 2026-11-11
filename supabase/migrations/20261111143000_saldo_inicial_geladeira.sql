-- Initial stock is one atomic registration/entry, with the same cost and history
-- rules as stock movements. A retry must never add the initial stock twice.
create function public.cadastrar_item_geladeira_com_saldo(
  p_receita_id uuid, p_saldo_inicial numeric, p_estoque_minimo numeric, p_request_id uuid
) returns uuid language plpgsql security definer set search_path='' as $$
declare
  v_user uuid := auth.uid();
  v_evento_id uuid;
begin
  if v_user is null or not private.can_use_app() then
    raise exception 'Sua conta não tem acesso ativo.' using errcode='42501';
  end if;
  if p_request_id is null or p_saldo_inicial is null
    or not (p_saldo_inicial > 0 and p_saldo_inicial < 1000000000000) then
    raise exception 'Informe um saldo inicial válido.' using errcode='22023';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(v_user::text || p_request_id::text,0));
  if exists(select 1 from public.geladeira_movimentacoes where user_id=v_user and request_id=p_request_id) then
    -- The movement RPC validates that the retried payload matches the original.
    return public.movimentar_geladeira(p_receita_id,'entrada',p_saldo_inicial,p_request_id,p_estoque_minimo,'Saldo inicial');
  end if;
  perform 1 from public.receitas where id=p_receita_id and user_id=v_user for update;
  if not found then raise exception 'Receita não encontrada.' using errcode='42501'; end if;
  if exists(select 1 from public.geladeira_itens where receita_id=p_receita_id) then
    raise exception 'Esta receita já está na Geladeira. Registre novas entradas em Movimentações.' using errcode='23505';
  end if;
  v_evento_id := public.movimentar_geladeira(p_receita_id,'entrada',p_saldo_inicial,p_request_id,p_estoque_minimo,'Saldo inicial');
  update public.geladeira_movimentacoes set motivo='Saldo inicial' where id=v_evento_id and user_id=v_user;
  return v_evento_id;
end;
$$;
revoke all on function public.cadastrar_item_geladeira_com_saldo(uuid,numeric,numeric,uuid) from public,anon;
grant execute on function public.cadastrar_item_geladeira_com_saldo(uuid,numeric,numeric,uuid) to authenticated;
