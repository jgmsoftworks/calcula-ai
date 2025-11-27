-- Modificar função para só atualizar automaticamente receitas com markup de sub-receita
CREATE OR REPLACE FUNCTION public.atualizar_preco_receita(p_receita_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_markup_id UUID;
  v_markup_tipo TEXT;
  v_custo_total NUMERIC;
  v_novo_preco NUMERIC;
  v_markup_aplicado NUMERIC;
BEGIN
  -- Buscar markup da receita
  SELECT r.markup_id, m.tipo, m.markup_aplicado
  INTO v_markup_id, v_markup_tipo, v_markup_aplicado
  FROM receitas r
  LEFT JOIN markups m ON r.markup_id = m.id
  WHERE r.id = p_receita_id;

  -- SÓ ATUALIZAR AUTOMATICAMENTE SE FOR SUB-RECEITA
  -- Para markups normais, o preço definido pelo usuário é preservado
  IF v_markup_tipo != 'sub_receita' THEN
    RETURN; -- Não faz nada, preserva o preço manual
  END IF;

  -- Calcular custo total
  v_custo_total := calcular_custo_receita(p_receita_id);

  -- Sub-receitas: preço = custo
  v_novo_preco := v_custo_total;

  -- Atualizar preco_venda (só se houver diferença significativa)
  UPDATE receitas
  SET preco_venda = v_novo_preco,
      updated_at = now()
  WHERE id = p_receita_id
    AND ABS(COALESCE(preco_venda, 0) - v_novo_preco) > 0.01;
END;
$function$;