-- Optional exact POS identifier, unique only inside the recipe owner's account.
ALTER TABLE public.receitas ADD COLUMN codigo_pdv text;
ALTER TABLE public.receitas ADD CONSTRAINT receitas_codigo_pdv_valid CHECK (
  codigo_pdv IS NULL OR (char_length(codigo_pdv) BETWEEN 1 AND 64 AND codigo_pdv !~ '[[:cntrl:]]')
);
CREATE UNIQUE INDEX receitas_user_codigo_pdv_uidx ON public.receitas(user_id,codigo_pdv)
  WHERE codigo_pdv IS NOT NULL;
CREATE FUNCTION public.normalizar_receita_codigo_pdv() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
BEGIN
  NEW.codigo_pdv := nullif(btrim(NEW.codigo_pdv, E' \t\r\n'), '');
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.normalizar_receita_codigo_pdv() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER normalizar_receita_codigo_pdv BEFORE INSERT OR UPDATE OF codigo_pdv ON public.receitas
  FOR EACH ROW EXECUTE FUNCTION public.normalizar_receita_codigo_pdv();
COMMENT ON COLUMN public.receitas.codigo_pdv IS 'Exact external POS code; text preserves leading zeroes. Never matched by recipe name.';

-- Patch only the two PDV additions into the installed atomic save. Hosted and
-- local histories differ: keep each environment's existing markup/access rules.
DO $migration$
DECLARE
  v_definition text := pg_get_functiondef('public.salvar_receita_completa(uuid,uuid,jsonb,jsonb,boolean,timestamptz,jsonb)'::regprocedure);
  v_assignment text := $old$    nome=btrim(p_receita->>'nome'),$old$;
  v_loop text := $old$  FOREACH v_key IN ARRAY ARRAY['ingredientes','sub_receitas','embalagens','passos','mao_obra'] LOOP$old$;
BEGIN
  IF length(v_definition)-length(replace(v_definition,v_assignment,'')) <> length(v_assignment)
     OR length(v_definition)-length(replace(v_definition,v_loop,'')) <> length(v_loop) THEN
    RAISE EXCEPTION 'Revisar a versão instalada de salvar_receita_completa antes de adicionar Código PDV.';
  END IF;
  v_definition := replace(v_definition,v_assignment,$new$    nome=btrim(p_receita->>'nome'),
    codigo_pdv=CASE WHEN p_receita ? 'codigo_pdv' THEN p_receita->>'codigo_pdv' ELSE codigo_pdv END,$new$);
  v_definition := replace(v_definition,v_loop,$new$  IF p_receita ? 'codigo_pdv' AND jsonb_typeof(p_receita->'codigo_pdv') NOT IN ('string','null') THEN
    RAISE EXCEPTION 'Código PDV deve ser texto.' USING ERRCODE='22023';
  END IF;
$new$ || v_loop);
  EXECUTE v_definition;
END;
$migration$;

-- Only the Calcula Aí server can validate this limited, revocable integration key.
-- No service-role credential is shared with the panel or browser.
CREATE TABLE public.receita_integracoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome text NOT NULL,
  token_hash text NOT NULL UNIQUE CHECK (token_hash ~ '^[a-f0-9]{64}$'),
  created_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz
);
CREATE INDEX receita_integracoes_user_idx ON public.receita_integracoes(user_id);
ALTER TABLE public.receita_integracoes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.receita_integracoes FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.receita_integracoes TO service_role;

CREATE FUNCTION public.exportar_receitas_painel(p_token_hash text,p_mes text) RETURNS jsonb
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
  WHERE r.user_id=v_user;
  RETURN jsonb_build_object('versao',1,'mes',p_mes,'consultado_em',now(),'receitas',v_receitas);
END;
$$;
REVOKE ALL ON FUNCTION public.exportar_receitas_painel(text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.exportar_receitas_painel(text,text) TO service_role;
COMMENT ON FUNCTION public.exportar_receitas_painel(text,text) IS
 'Server-only catalog export scoped by a hashed integration key. Month cost is last known snapshot before month end (or now); no historical backfill.';
