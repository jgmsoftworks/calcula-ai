-- Corrigir preços de todas as sub-receitas existentes
-- Sub-receitas devem ter preco_venda = custo_total

-- Criar função temporária para calcular custo total de uma receita
CREATE OR REPLACE FUNCTION calcular_custo_receita(receita_uuid uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  custo_ingredientes numeric := 0;
  custo_embalagens numeric := 0;
  custo_mao_obra numeric := 0;
  custo_sub_receitas numeric := 0;
  custo_total numeric := 0;
BEGIN
  -- Custo de ingredientes
  SELECT COALESCE(SUM(
    ri.quantidade * 
    CASE 
      WHEN p.unidade_uso IS NOT NULL AND p.fator_conversao IS NOT NULL THEN 
        p.custo_unitario / p.fator_conversao
      ELSE 
        p.custo_unitario
    END
  ), 0) INTO custo_ingredientes
  FROM receita_ingredientes ri
  JOIN produtos p ON ri.produto_id = p.id
  WHERE ri.receita_id = receita_uuid;

  -- Custo de embalagens
  SELECT COALESCE(SUM(
    re.quantidade * 
    CASE 
      WHEN p.unidade_uso IS NOT NULL AND p.fator_conversao IS NOT NULL THEN 
        p.custo_unitario / p.fator_conversao
      ELSE 
        p.custo_unitario
    END
  ), 0) INTO custo_embalagens
  FROM receita_embalagens re
  JOIN produtos p ON re.produto_id = p.id
  WHERE re.receita_id = receita_uuid;

  -- Custo de mão de obra
  SELECT COALESCE(SUM(valor_total), 0) INTO custo_mao_obra
  FROM receita_mao_obra
  WHERE receita_id = receita_uuid;

  -- Custo de sub-receitas
  SELECT COALESCE(SUM(
    rsr.quantidade * 
    CASE 
      WHEN sr.rendimento_valor IS NOT NULL AND sr.rendimento_valor > 0 THEN 
        sr.preco_venda / sr.rendimento_valor
      ELSE 
        sr.preco_venda
    END
  ), 0) INTO custo_sub_receitas
  FROM receita_sub_receitas rsr
  JOIN receitas sr ON rsr.sub_receita_id = sr.id
  WHERE rsr.receita_id = receita_uuid;

  custo_total := custo_ingredientes + custo_embalagens + custo_mao_obra + custo_sub_receitas;
  
  RETURN custo_total;
END;
$$;

-- Atualizar todas as sub-receitas para ter preco_venda = custo_total
UPDATE receitas r
SET preco_venda = calcular_custo_receita(r.id),
    updated_at = now()
WHERE r.markup_id IN (
  SELECT m.id 
  FROM markups m 
  WHERE m.tipo = 'sub_receita' 
  AND m.user_id = r.user_id
);

-- Remover função temporária
DROP FUNCTION IF EXISTS calcular_custo_receita(uuid);