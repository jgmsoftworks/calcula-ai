-- Impede novos saldos negativos e torna a movimentação manual um processo atômico.
-- O saldo negativo histórico não é alterado nem validado retroativamente.
BEGIN;

DO $migration$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_constraint
    WHERE conrelid = 'public.produtos'::regclass
      AND conname = 'produtos_estoque_atual_nao_negativo'
  ) THEN
    ALTER TABLE public.produtos
      ADD CONSTRAINT produtos_estoque_atual_nao_negativo
      CHECK (estoque_atual IS NOT NULL AND estoque_atual >= 0) NOT VALID;
  END IF;
END
$migration$;

COMMENT ON CONSTRAINT produtos_estoque_atual_nao_negativo ON public.produtos IS
  'Bloqueia novos saldos negativos, preservando para conciliação os registros negativos anteriores à migração.';

CREATE OR REPLACE FUNCTION public.finalizar_movimentacao_estoque(
  p_itens jsonb,
  p_responsavel text,
  p_observacao text,
  p_request_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
DECLARE
  v_user_id uuid := (SELECT auth.uid());
  v_item jsonb;
  v_product_id uuid;
  v_product RECORD;
  v_receipt public.comprovantes%ROWTYPE;
  v_number integer;
  v_entries numeric;
  v_exits numeric;
  v_last_cost numeric;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado.' USING ERRCODE = '28000';
  END IF;

  IF p_request_id IS NULL OR
     p_itens IS NULL OR
     jsonb_typeof(p_itens) IS DISTINCT FROM 'array' OR
     jsonb_array_length(p_itens) NOT BETWEEN 1 AND 200 THEN
    RAISE EXCEPTION 'Confira os itens da movimentação.' USING ERRCODE = '22023';
  END IF;

  IF p_responsavel IS NULL OR
     char_length(btrim(p_responsavel)) NOT BETWEEN 1 AND 120 OR
     char_length(coalesce(p_observacao,'')) > 2000 THEN
    RAISE EXCEPTION 'Confira o responsável e a observação.' USING ERRCODE = '22023';
  END IF;

  -- A quantidade e os demais valores precisam ser válidos ANTES da primeira escrita.
  FOR v_item IN SELECT value FROM jsonb_array_elements(p_itens) AS item(value) LOOP
    IF jsonb_typeof(v_item) IS DISTINCT FROM 'object' OR
       jsonb_typeof(v_item->'produto_id') IS DISTINCT FROM 'string' OR
       (v_item->>'produto_id') !~* '^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$' OR
       coalesce(v_item->>'tipo','') NOT IN ('entrada','saida') OR
       jsonb_typeof(v_item->'quantidade') IS DISTINCT FROM 'number' OR
       jsonb_typeof(v_item->'custo_aplicado') IS DISTINCT FROM 'number' OR
       jsonb_typeof(v_item->'subtotal') IS DISTINCT FROM 'number' OR
       jsonb_typeof(v_item->'motivo') IS DISTINCT FROM 'string' OR
       char_length(btrim(coalesce(v_item->>'motivo',''))) NOT BETWEEN 1 AND 200 THEN
      RAISE EXCEPTION 'Confira os produtos, as quantidades e os motivos.' USING ERRCODE = '22023';
    END IF;

    IF (v_item->>'quantidade')::numeric <= 0 OR
       (v_item->>'quantidade')::numeric > 999999999 OR
       (v_item->>'custo_aplicado')::numeric < 0 OR
       (v_item->>'custo_aplicado')::numeric > 999999999 OR
       (v_item->>'subtotal')::numeric < 0 OR
       (v_item->>'subtotal')::numeric > 999999999999 THEN
      RAISE EXCEPTION 'As quantidades e os valores precisam ser positivos.' USING ERRCODE = '22023';
    END IF;
  END LOOP;

  -- Serializa comprovantes do mesmo usuário, inclusive tentativas repetidas
  -- da mesma operação. O UUID evita duplicação após perda de conexão.
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_user_id::text, 20261015)
  );
  SELECT * INTO v_receipt
  FROM public.comprovantes
  WHERE id = p_request_id AND user_id = v_user_id;
  IF FOUND THEN
    RETURN to_jsonb(v_receipt);
  END IF;

  -- Trava cada produto UMA VEZ, na mesma ordem entre transações, antes de
  -- verificar a soma de TODAS as retiradas do carrinho.
  FOR v_product_id IN
    SELECT DISTINCT (item.value->>'produto_id')::uuid AS product_id
    FROM jsonb_array_elements(p_itens) AS item(value)
    ORDER BY product_id
  LOOP
    SELECT p.id, p.nome, p.estoque_atual
      INTO v_product
      FROM public.produtos p
      WHERE p.id = v_product_id
        AND p.user_id = v_user_id
        AND p.ativo IS TRUE
      FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Produto indisponível ou não encontrado no seu estoque.'
        USING ERRCODE = 'P0002';
    END IF;

    SELECT
      coalesce(sum(CASE WHEN item.value->>'tipo'='entrada'
                        THEN (item.value->>'quantidade')::numeric ELSE 0 END),0),
      coalesce(sum(CASE WHEN item.value->>'tipo'='saida'
                        THEN (item.value->>'quantidade')::numeric ELSE 0 END),0)
    INTO v_entries, v_exits
    FROM jsonb_array_elements(p_itens) AS item(value)
    WHERE (item.value->>'produto_id')::uuid = v_product_id;

    -- Entradas do próprio comprovante não autorizam retiradas acima do
    -- saldo anterior; evita entradas artificiais para mascarar insuficiência.
    -- Para saldos negativos legados, somente aceita recuperação até >= 0.
    IF v_product.estoque_atual IS NULL OR
       (v_product.estoque_atual >= 0 AND v_exits > v_product.estoque_atual) OR
       (v_product.estoque_atual + v_entries - v_exits < 0) THEN
      RAISE EXCEPTION 'Estoque insuficiente para %. Disponível: %, saída total: %.',
        v_product.nome, v_product.estoque_atual, v_exits
        USING ERRCODE = 'P0001';
    END IF;
  END LOOP;

  SELECT coalesce(max(numero), 0) + 1 INTO v_number
  FROM public.comprovantes WHERE user_id = v_user_id;

  INSERT INTO public.comprovantes
    (id,user_id,numero,tipo,responsavel,observacao,data_hora)
  VALUES
    (p_request_id,v_user_id,v_number,
     CASE WHEN (SELECT count(DISTINCT item.value->>'tipo')
                FROM jsonb_array_elements(p_itens) AS item(value))=1
          THEN p_itens->0->>'tipo' ELSE 'entrada' END,
     btrim(p_responsavel),nullif(btrim(p_observacao),''),now())
  RETURNING * INTO v_receipt;

  -- Todas as movimentações e todos os saldos serão revertidos caso UM item falhe.
  FOR v_item IN SELECT value FROM jsonb_array_elements(p_itens) AS item(value) LOOP
    INSERT INTO public.movimentacoes
      (user_id,comprovante_id,produto_id,tipo,motivo,quantidade,
       custo_aplicado,subtotal,responsavel,origem,data_hora)
    VALUES
      (v_user_id,p_request_id,(v_item->>'produto_id')::uuid,
       v_item->>'tipo',btrim(v_item->>'motivo'),
       (v_item->>'quantidade')::numeric,
       (v_item->>'custo_aplicado')::numeric,
       (v_item->>'subtotal')::numeric,
       btrim(p_responsavel),'mini-pdv',now());
  END LOOP;

  FOR v_product_id IN
    SELECT DISTINCT (item.value->>'produto_id')::uuid AS product_id
    FROM jsonb_array_elements(p_itens) AS item(value)
    ORDER BY product_id
  LOOP
    SELECT
      coalesce(sum(CASE WHEN item.value->>'tipo'='entrada'
                        THEN (item.value->>'quantidade')::numeric ELSE 0 END),0),
      coalesce(sum(CASE WHEN item.value->>'tipo'='saida'
                        THEN (item.value->>'quantidade')::numeric ELSE 0 END),0)
    INTO v_entries, v_exits
    FROM jsonb_array_elements(p_itens) AS item(value)
    WHERE (item.value->>'produto_id')::uuid = v_product_id;

    -- Compatibilidade: em entradas, prevalece o custo da última linha de entrada.
    SELECT (item.value->>'custo_aplicado')::numeric
      INTO v_last_cost
      FROM jsonb_array_elements(p_itens) WITH ORDINALITY AS item(value,ordem)
      WHERE (item.value->>'produto_id')::uuid = v_product_id
        AND item.value->>'tipo'='entrada'
      ORDER BY item.ordem DESC
      LIMIT 1;

    UPDATE public.produtos
      SET estoque_atual = estoque_atual + v_entries - v_exits,
          custo_unitario = coalesce(v_last_cost,custo_unitario)
      WHERE id = v_product_id AND user_id = v_user_id;
  END LOOP;

  RETURN to_jsonb(v_receipt);
END;
$function$;

REVOKE ALL ON FUNCTION public.finalizar_movimentacao_estoque(jsonb,text,text,uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.finalizar_movimentacao_estoque(jsonb,text,text,uuid)
  TO authenticated;

COMMENT ON FUNCTION public.finalizar_movimentacao_estoque(jsonb,text,text,uuid) IS
  'Movimentação manual transacional e idempotente: soma saídas, trava produtos e devolve comprovante sem saldos negativos novos.';

NOTIFY pgrst, 'reload schema';
COMMIT;
