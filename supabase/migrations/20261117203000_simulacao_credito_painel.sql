-- Add an owner-scoped, current CREDIT scenario. No pricing writes or historical backfill.
CREATE OR REPLACE FUNCTION public.exportar_receitas_painel(p_token_hash text,p_mes text) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path='' AS $$
DECLARE
  v_user uuid;
  v_inicio date;
  v_fim timestamptz;
  v_receitas jsonb;
  v_markup public.markups%ROWTYPE;
  v_quantidade integer;
  v_simulacao jsonb := NULL;
  v_despesas numeric;
  v_folha numeric;
  v_percentual numeric;
  v_fixo numeric;
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
    'tipo_produto',CASE WHEN t.id IS NULL THEN NULL ELSE jsonb_build_object('id',t.id,'nome',t.nome) END,
    'custo_unitario',CASE WHEN h.excluida THEN NULL ELSE h.custo_unitario END,
    'custo_registrado_em',h.registrado_em,'rendimento_unidade',h.rendimento_unidade,
    'moeda',h.moeda,'updated_at',r.updated_at
  ) ORDER BY r.nome,r.id),'[]'::jsonb) INTO v_receitas
  FROM public.receitas r
  LEFT JOIN public.tipos_produto t ON t.id=r.tipo_produto_id AND t.user_id=v_user
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
  -- A unique active CREDIT markup is required; never guess another profile.
  SELECT count(*) INTO v_quantidade FROM public.markups m
    WHERE m.user_id=v_user AND m.ativo AND m.tipo='normal'
      AND translate(lower(btrim(m.nome)),'é','e')='credito';
  IF v_quantidade=1 THEN
    SELECT * INTO v_markup FROM public.markups m
      WHERE m.user_id=v_user AND m.ativo AND m.tipo='normal'
        AND translate(lower(btrim(m.nome)),'é','e')='credito';
    -- Read selected active components, not saved percentage estimates or target profit.
    SELECT coalesce(sum(d.valor),0) INTO v_despesas FROM public.despesas_fixas d
      WHERE d.user_id=v_user AND d.ativo AND v_markup.despesas_fixas_selecionadas ? d.id::text;
    -- Same rounding/percentage precedence as calcularCustoTotalFuncionario.
    SELECT coalesce(sum(round(coalesce(f.salario_base,0)+coalesce(f.adicional,0)-coalesce(f.desconto,0)
      + CASE WHEN coalesce(f.fgts_percent,0)>0 THEN round(coalesce(f.salario_base,0)*f.fgts_percent/100,2) ELSE coalesce(f.fgts_valor,0) END
      + CASE WHEN coalesce(f.inss_percent,0)>0 THEN round(coalesce(f.salario_base,0)*f.inss_percent/100,2) ELSE coalesce(f.inss_valor,0) END
      + CASE WHEN coalesce(f.rat_percent,0)>0 THEN round(coalesce(f.salario_base,0)*f.rat_percent/100,2) ELSE coalesce(f.rat_valor,0) END
      + CASE WHEN coalesce(f.ferias_percent,0)>0 THEN round(coalesce(f.salario_base,0)*f.ferias_percent/100,2) ELSE coalesce(f.ferias_valor,0) END
      + CASE WHEN coalesce(f.vale_transporte_percent,0)>0 THEN round(coalesce(f.salario_base,0)*f.vale_transporte_percent/100,2) ELSE coalesce(f.vale_transporte_valor,0) END
      + CASE WHEN coalesce(f.vale_alimentacao_percent,0)>0 THEN round(coalesce(f.salario_base,0)*f.vale_alimentacao_percent/100,2) ELSE coalesce(f.vale_alimentacao_valor,0) END
      + CASE WHEN coalesce(f.vale_refeicao_percent,0)>0 THEN round(coalesce(f.salario_base,0)*f.vale_refeicao_percent/100,2) ELSE coalesce(f.vale_refeicao_valor,0) END
      + CASE WHEN coalesce(f.plano_saude_percent,0)>0 THEN round(coalesce(f.salario_base,0)*f.plano_saude_percent/100,2) ELSE coalesce(f.plano_saude_valor,0) END
      + CASE WHEN coalesce(f.outros_percent,0)>0 THEN round(coalesce(f.salario_base,0)*f.outros_percent/100,2) ELSE coalesce(f.outros_valor,0) END,2)),0) INTO v_folha FROM public.folha_pagamento f
      WHERE f.user_id=v_user AND f.ativo AND v_markup.folha_pagamento_selecionada ? f.id::text;
    SELECT coalesce(sum(e.valor_percentual),0),coalesce(sum(e.valor_fixo),0)
      INTO v_percentual,v_fixo FROM public.encargos_venda e
      WHERE e.user_id=v_user AND e.ativo AND v_markup.encargos_venda_selecionados ? e.id::text;
    v_simulacao := jsonb_build_object('markup_id',v_markup.id,'nome',v_markup.nome,
      'consultado_em',now(),'despesas_fixas_mensais',v_despesas,'folha_mensal',v_folha,
      'encargos_percentuais',v_percentual,'encargo_fixo_unitario',v_fixo);
  END IF;
  RETURN jsonb_build_object('versao',1,'mes',p_mes,'consultado_em',now(),'receitas',v_receitas,'simulacao_credito',v_simulacao);
END;
$$;
REVOKE ALL ON FUNCTION public.exportar_receitas_painel(text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.exportar_receitas_painel(text,text) TO service_role;
COMMENT ON FUNCTION public.exportar_receitas_painel(text,text) IS
 'Server-only owner-scoped sale recipes and current CREDIT simulation aggregates. Costs remain monthly snapshots; financial settings are current, not historical. No employee identities exported.';
