-- Exclude preparation-only recipes from the panel catalog, even with a PDV.
-- Their composition, cost snapshots and contribution to parent costs stay intact.
CREATE OR REPLACE FUNCTION public.exportar_receitas_painel(p_token_hash text,p_mes text) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path='' AS $$
DECLARE
  v_user uuid;
  v_inicio date;
  v_fim timestamptz;
  v_receitas jsonb;
BEGIN
  SELECT user_id INTO v_user FROM public.receita_integracoes
    WHERE token_hash=p_token_hash AND revoked_at IS NULL;
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Integração não autorizada.' USING ERRCODE='28000';
  END IF;
  IF p_mes IS NULL OR p_mes !~ '^20[0-9]{2}-(0[1-9]|1[0-2])$' THEN
    RAISE EXCEPTION 'Mês inválido.' USING ERRCODE='22023';
  END IF;
  v_inicio := (p_mes||'-01')::date;
  v_fim := (v_inicio + interval '1 month') AT TIME ZONE 'America/Sao_Paulo';
  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'id',r.id,'codigo_pdv',r.codigo_pdv,'nome',r.nome,'status',r.status,
    'custo_unitario',CASE WHEN h.excluida THEN NULL ELSE h.custo_unitario END,
    'custo_registrado_em',h.registrado_em,'rendimento_unidade',h.rendimento_unidade,
    'moeda',h.moeda,'updated_at',r.updated_at
  ) ORDER BY r.nome,r.id),'[]'::jsonb) INTO v_receitas
  FROM public.receitas r
  LEFT JOIN LATERAL (
    SELECT h.custo_unitario,h.registrado_em,h.rendimento_unidade,h.moeda,h.excluida
    FROM public.receita_custos_historico h
    WHERE h.user_id=v_user AND h.receita_id=r.id
      AND h.registrado_em < v_fim AND h.registrado_em <= now()
      AND v_inicio <= (now() AT TIME ZONE 'America/Sao_Paulo')::date
    ORDER BY h.registrado_em DESC,h.id DESC LIMIT 1
  ) h ON true
  WHERE r.user_id=v_user
    AND NOT EXISTS (
      SELECT 1 FROM public.markups m
      WHERE m.id=r.markup_id AND m.tipo='sub_receita'
    );
  RETURN jsonb_build_object('versao',1,'mes',p_mes,'consultado_em',now(),'receitas',v_receitas);
END;
$$;
REVOKE ALL ON FUNCTION public.exportar_receitas_painel(text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.exportar_receitas_painel(text,text) TO service_role;
COMMENT ON FUNCTION public.exportar_receitas_painel(text,text) IS
 'Server-only sale recipe catalog; excludes sub_recipe markup, preserves parent costs. Scoped by a hashed integration key. Month cost is last known snapshot before month end (or now); no historical backfill.';
