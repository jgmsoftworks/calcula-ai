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

-- Require an explicit markup in the atomic save used by creation, editing and duplication.
-- Do not assign markups or recalculate prices on historical rows.
CREATE OR REPLACE FUNCTION public.salvar_receita_completa(
  p_receita_id uuid,
  p_request_id uuid,
  p_receita jsonb,
  p_componentes jsonb,
  p_criar boolean DEFAULT false,
  p_expected_updated_at timestamptz DEFAULT NULL,
  p_expected_components jsonb DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_existing public.receitas%ROWTYPE;
  v_result public.receitas%ROWTYPE;
  v_exists boolean;
  v_hash text;
  v_key text;
  v_table text;
  v_columns text;
  v_updates text;
  v_items jsonb;
  v_count integer;
  v_expected integer;
  v_ids uuid[];
  v_actual_versions jsonb;
  v_expected_versions jsonb;
BEGIN
  IF v_user IS NULL OR NOT coalesce(private.can_use_app(), false) THEN
    RAISE EXCEPTION 'Seu acesso terminou. Entre novamente ou confira seu plano.' USING ERRCODE = '42501';
  END IF;
  IF p_receita_id IS NULL OR p_request_id IS NULL OR p_criar IS NULL
     OR jsonb_typeof(p_receita) IS DISTINCT FROM 'object'
     OR jsonb_typeof(p_componentes) IS DISTINCT FROM 'object'
     OR coalesce(btrim(p_receita->>'nome'), '') = '' THEN
    RAISE EXCEPTION 'Dados da receita inválidos.' USING ERRCODE = '22023';
  END IF;
  -- A recipe must explicitly choose its markup, including the sub-recipe markup.
  -- Reject before any parent/component write; existing unassigned rows stay readable.
  IF coalesce(btrim(p_receita->>'markup_id'), '') = '' THEN
    RAISE EXCEPTION 'Selecione um markup na etapa Precificação antes de salvar a receita.'
      USING ERRCODE = '22023', DETAIL = 'recipe_markup_required';
  END IF;
  IF p_receita ? 'codigo_pdv' AND jsonb_typeof(p_receita->'codigo_pdv') NOT IN ('string','null') THEN
    RAISE EXCEPTION 'Código PDV deve ser texto.' USING ERRCODE='22023';
  END IF;
  FOREACH v_key IN ARRAY ARRAY['ingredientes','sub_receitas','embalagens','passos','mao_obra'] LOOP
    IF jsonb_typeof(p_componentes->v_key) IS DISTINCT FROM 'array' OR
       (NOT p_criar AND jsonb_typeof(p_expected_components->v_key) IS DISTINCT FROM 'array') THEN
      RAISE EXCEPTION 'Lista de componentes incompleta: %', v_key USING ERRCODE = '22023';
    END IF;
    v_items := p_componentes->v_key;
    SELECT count(*), count(DISTINCT (x->>'id')::uuid)
      INTO v_count, v_expected FROM jsonb_array_elements(v_items) x;
    IF v_count <> v_expected THEN
      RAISE EXCEPTION 'Identificadores de componentes inválidos: %', v_key USING ERRCODE = '22023';
    END IF;
  END LOOP;

  -- Serialize saves by owner, including new rows and sub-recipe dependency changes.
  PERFORM pg_advisory_xact_lock(hashtextextended('recipe-save:' || v_user::text, 0));
  SELECT * INTO v_existing FROM public.receitas
    WHERE id = p_receita_id AND user_id = v_user FOR UPDATE;
  v_exists := FOUND;
  v_hash := md5(jsonb_build_object('receita',p_receita,'componentes',p_componentes,'criar',p_criar)::text);

  -- A committed request can be acknowledged again after a lost network response.
  -- This check precedes the edit-version check and never replays writes.
  IF v_exists AND v_existing.last_save_request_id = p_request_id THEN
    IF v_existing.last_save_payload_hash IS DISTINCT FROM v_hash THEN
      RAISE EXCEPTION 'Tentativa de salvamento reutilizada com dados diferentes.' USING ERRCODE = '22023';
    END IF;
    RETURN jsonb_build_object('id',v_existing.id,'numero_sequencial',v_existing.numero_sequencial,'updated_at',v_existing.updated_at);
  END IF;
  IF (p_criar AND v_exists) OR
     (NOT p_criar AND (NOT v_exists OR p_expected_updated_at IS NULL OR v_existing.updated_at IS DISTINCT FROM p_expected_updated_at)) THEN
    RAISE EXCEPTION 'Esta receita mudou desde que você abriu o editor. Reabra a receita para conferir a versão salva.' USING ERRCODE = '40001';
  END IF;

  -- Foreign keys alone do not guarantee that referenced data belongs to this account.
  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements((p_componentes->'ingredientes') || (p_componentes->'embalagens')) x
    WHERE NOT EXISTS (SELECT 1 FROM public.produtos p WHERE p.id=(x->>'produto_id')::uuid AND p.user_id=v_user)
  ) OR EXISTS (
    SELECT 1 FROM jsonb_array_elements(p_componentes->'sub_receitas') x
    WHERE NOT EXISTS (SELECT 1 FROM public.receitas r WHERE r.id=(x->>'sub_receita_id')::uuid AND r.user_id=v_user)
  ) OR (nullif(p_receita->>'markup_id','') IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.markups m WHERE m.id=(p_receita->>'markup_id')::uuid AND m.user_id=v_user
  )) OR (nullif(p_receita->>'tipo_produto_id','') IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.tipos_produto t WHERE t.id=(p_receita->>'tipo_produto_id')::uuid AND t.user_id=v_user
  )) THEN
    RAISE EXCEPTION 'Um dos itens da receita não está mais disponível nesta conta.' USING ERRCODE = '42501';
  END IF;
  IF EXISTS (
    WITH RECURSIVE dependencies(id) AS (
      SELECT (x->>'sub_receita_id')::uuid FROM jsonb_array_elements(p_componentes->'sub_receitas') x
      UNION
      SELECT s.sub_receita_id FROM public.receita_sub_receitas s JOIN dependencies d ON s.receita_id=d.id
    ) SELECT 1 FROM dependencies WHERE id=p_receita_id
  ) THEN
    RAISE EXCEPTION 'Uma receita não pode depender dela mesma.' USING ERRCODE = '22023';
  END IF;

  IF p_criar THEN
    -- Existing triggers assign the sequence and enforce the real plan limits.
    INSERT INTO public.receitas (id,user_id,nome) VALUES (p_receita_id,v_user,btrim(p_receita->>'nome'));
  END IF;
  UPDATE public.receitas SET
    nome=btrim(p_receita->>'nome'),
    codigo_pdv=CASE WHEN p_receita ? 'codigo_pdv' THEN p_receita->>'codigo_pdv' ELSE codigo_pdv END,
    tipo_produto_id=nullif(p_receita->>'tipo_produto_id','')::uuid,
    rendimento_valor=(p_receita->>'rendimento_valor')::numeric,
    rendimento_unidade=p_receita->>'rendimento_unidade',
    observacoes=p_receita->>'observacoes',
    status=coalesce(p_receita->>'status','finalizada'),
    preco_venda=coalesce((p_receita->>'preco_venda')::numeric,0),
    tempo_preparo_total=coalesce((p_receita->>'tempo_preparo_total')::integer,0),
    tempo_preparo_unidade=coalesce(p_receita->>'tempo_preparo_unidade','minutos'),
    tempo_preparo_mao_obra=coalesce((p_receita->>'tempo_preparo_mao_obra')::integer,0),
    peso_unitario=(p_receita->>'peso_unitario')::numeric,
    conservacao=p_receita->'conservacao',
    markup_id=nullif(p_receita->>'markup_id','')::uuid
  WHERE id=p_receita_id AND user_id=v_user;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'Não foi possível gravar a receita.' USING ERRCODE = '42501';
  END IF;

  -- Fixed allowlist: client JSON never supplies table names or SQL identifiers.
  -- Preserve component IDs, creation timestamps and step images on updates.
  FOR v_key,v_table,v_columns,v_updates IN
    SELECT * FROM (VALUES
      ('ingredientes','receita_ingredientes','produto_id,quantidade','produto_id=excluded.produto_id,quantidade=excluded.quantidade'),
      ('sub_receitas','receita_sub_receitas','sub_receita_id,quantidade','sub_receita_id=excluded.sub_receita_id,quantidade=excluded.quantidade'),
      ('embalagens','receita_embalagens','produto_id,quantidade','produto_id=excluded.produto_id,quantidade=excluded.quantidade'),
      ('passos','receita_passos_preparo','ordem,descricao','ordem=excluded.ordem,descricao=excluded.descricao'),
      ('mao_obra','receita_mao_obra','funcionario_id,funcionario_nome,funcionario_cargo,custo_por_hora,tempo,unidade_tempo,valor_total',
        'funcionario_id=excluded.funcionario_id,funcionario_nome=excluded.funcionario_nome,funcionario_cargo=excluded.funcionario_cargo,custo_por_hora=excluded.custo_por_hora,tempo=excluded.tempo,unidade_tempo=excluded.unidade_tempo,valor_total=excluded.valor_total')
    ) AS components(key,tablename,columns,updates)
  LOOP
    v_items := p_componentes->v_key;
    IF NOT p_criar THEN
      -- Some existing step/image controls save independently. Parent timestamps alone
      -- cannot detect those concurrent edits; compare the loaded component versions too.
      EXECUTE format('SELECT coalesce(jsonb_agg(jsonb_build_object(''id'',id,''updated_at'',updated_at) ORDER BY id),''[]''::jsonb) FROM public.%I WHERE receita_id=$1',v_table)
        INTO v_actual_versions USING p_receita_id;
      SELECT coalesce(jsonb_agg(jsonb_build_object('id',x.id,'updated_at',x.updated_at) ORDER BY x.id),'[]'::jsonb)
        INTO v_expected_versions FROM jsonb_to_recordset(p_expected_components->v_key) AS x(id uuid,updated_at timestamptz);
      IF v_actual_versions IS DISTINCT FROM v_expected_versions THEN
        RAISE EXCEPTION 'Os componentes desta receita mudaram. Reabra a receita para conferir a versão salva.' USING ERRCODE='40001';
      END IF;
    END IF;
    v_expected := jsonb_array_length(v_items);
    SELECT coalesce(array_agg((x->>'id')::uuid),ARRAY[]::uuid[]) INTO v_ids FROM jsonb_array_elements(v_items) x;
    EXECUTE format('DELETE FROM public.%I WHERE receita_id=$1 AND NOT (id=ANY($2))',v_table)
      USING p_receita_id,v_ids;
    EXECUTE format(
      'INSERT INTO public.%1$I (id,receita_id,%2$s) SELECT id,$1,%2$s FROM jsonb_populate_recordset(NULL::public.%1$I,$2)
       ON CONFLICT (id) DO UPDATE SET %3$s WHERE %1$I.receita_id=$1',v_table,v_columns,v_updates)
      USING p_receita_id,v_items;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    IF v_count <> v_expected THEN
      RAISE EXCEPTION 'Não foi possível gravar todos os componentes: %',v_key USING ERRCODE = '42501';
    END IF;
    -- Detect policies that silently skip a deletion instead of throwing an error.
    EXECUTE format('SELECT count(*) FROM public.%I WHERE receita_id=$1',v_table) INTO v_count USING p_receita_id;
    IF v_count <> v_expected THEN
      RAISE EXCEPTION 'Não foi possível remover todos os componentes: %',v_key USING ERRCODE = '42501';
    END IF;
  END LOOP;

  -- Component triggers run normally inside this same transaction.
  UPDATE public.receitas SET last_save_request_id=p_request_id,last_save_payload_hash=v_hash,updated_at=clock_timestamp()
    WHERE id=p_receita_id AND user_id=v_user RETURNING * INTO v_result;
  IF NOT FOUND THEN RAISE EXCEPTION 'Receita indisponível.' USING ERRCODE = '42501'; END IF;
  RETURN jsonb_build_object('id',v_result.id,'numero_sequencial',v_result.numero_sequencial,'updated_at',v_result.updated_at);
END;
$$;
REVOKE ALL ON FUNCTION public.salvar_receita_completa(uuid,uuid,jsonb,jsonb,boolean,timestamptz,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.salvar_receita_completa(uuid,uuid,jsonb,jsonb,boolean,timestamptz,jsonb) TO authenticated;
COMMENT ON FUNCTION public.salvar_receita_completa(uuid,uuid,jsonb,jsonb,boolean,timestamptz,jsonb)
  IS 'Atomic, owner-scoped recipe save with retry acknowledgement and stale-edit protection. Uses caller permissions and existing plan triggers.';


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
