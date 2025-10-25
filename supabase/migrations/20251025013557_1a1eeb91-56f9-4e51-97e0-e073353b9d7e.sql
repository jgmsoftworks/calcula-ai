-- Função para atualizar ingredientes quando produto muda
CREATE OR REPLACE FUNCTION update_receita_ingredientes_on_product_change()
RETURNS TRIGGER AS $$
DECLARE
  conversao_record RECORD;
  nova_unidade TEXT;
  novo_custo_unitario NUMERIC;
BEGIN
  -- Buscar conversão ativa do produto (se existir)
  SELECT * INTO conversao_record
  FROM produto_conversoes
  WHERE produto_id = NEW.id AND ativo = true
  LIMIT 1;
  
  -- Determinar unidade e custo a usar
  IF FOUND THEN
    nova_unidade := conversao_record.unidade_uso_receitas;
    novo_custo_unitario := conversao_record.custo_unitario_uso;
  ELSE
    nova_unidade := NEW.unidade::text;
    novo_custo_unitario := NEW.custo_unitario;
  END IF;
  
  -- Atualizar ingredientes em todas as receitas que usam este produto
  UPDATE receita_ingredientes
  SET 
    unidade = nova_unidade,
    custo_unitario = novo_custo_unitario,
    custo_total = quantidade * novo_custo_unitario,
    updated_at = now()
  WHERE produto_id = NEW.id;
  
  -- Atualizar embalagens
  UPDATE receita_embalagens
  SET 
    unidade = nova_unidade,
    custo_unitario = novo_custo_unitario,
    custo_total = quantidade * novo_custo_unitario,
    updated_at = now()
  WHERE produto_id = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para produtos
DROP TRIGGER IF EXISTS trigger_update_receitas_on_product_change ON produtos;
CREATE TRIGGER trigger_update_receitas_on_product_change
AFTER UPDATE OF custo_unitario, custo_medio, unidade ON produtos
FOR EACH ROW
WHEN (OLD.custo_unitario IS DISTINCT FROM NEW.custo_unitario 
   OR OLD.custo_medio IS DISTINCT FROM NEW.custo_medio 
   OR OLD.unidade IS DISTINCT FROM NEW.unidade)
EXECUTE FUNCTION update_receita_ingredientes_on_product_change();

-- Função para atualizar ingredientes quando conversão muda
CREATE OR REPLACE FUNCTION update_receita_ingredientes_on_conversion_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Atualizar ingredientes
  UPDATE receita_ingredientes
  SET 
    unidade = NEW.unidade_uso_receitas,
    custo_unitario = NEW.custo_unitario_uso,
    custo_total = quantidade * NEW.custo_unitario_uso,
    updated_at = now()
  WHERE produto_id = NEW.produto_id;
  
  -- Atualizar embalagens
  UPDATE receita_embalagens
  SET 
    unidade = NEW.unidade_uso_receitas,
    custo_unitario = NEW.custo_unitario_uso,
    custo_total = quantidade * NEW.custo_unitario_uso,
    updated_at = now()
  WHERE produto_id = NEW.produto_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para conversões
DROP TRIGGER IF EXISTS trigger_update_receitas_on_conversion_change ON produto_conversoes;
CREATE TRIGGER trigger_update_receitas_on_conversion_change
AFTER UPDATE OF unidade_uso_receitas, custo_unitario_uso, quantidade_unidade_uso ON produto_conversoes
FOR EACH ROW
WHEN (OLD.unidade_uso_receitas IS DISTINCT FROM NEW.unidade_uso_receitas 
   OR OLD.custo_unitario_uso IS DISTINCT FROM NEW.custo_unitario_uso
   OR OLD.quantidade_unidade_uso IS DISTINCT FROM NEW.quantidade_unidade_uso)
EXECUTE FUNCTION update_receita_ingredientes_on_conversion_change();

COMMENT ON FUNCTION update_receita_ingredientes_on_product_change IS 
'Propaga automaticamente mudanças de custo/unidade dos produtos para todas as receitas que os utilizam';

COMMENT ON FUNCTION update_receita_ingredientes_on_conversion_change IS 
'Propaga automaticamente mudanças de conversão (Modo de Uso) para todas as receitas';

-- Atualizar receitas existentes com dados atuais dos produtos
WITH produto_info AS (
  SELECT 
    p.id as produto_id,
    COALESCE(pc.unidade_uso_receitas, p.unidade::text) as unidade_atual,
    COALESCE(pc.custo_unitario_uso, p.custo_unitario) as custo_atual
  FROM produtos p
  LEFT JOIN produto_conversoes pc ON p.id = pc.produto_id AND pc.ativo = true
)
UPDATE receita_ingredientes ri
SET 
  unidade = pi.unidade_atual,
  custo_unitario = pi.custo_atual,
  custo_total = ri.quantidade * pi.custo_atual,
  updated_at = now()
FROM produto_info pi
WHERE ri.produto_id = pi.produto_id;

-- Atualizar embalagens com dados atuais dos produtos
WITH produto_info AS (
  SELECT 
    p.id as produto_id,
    COALESCE(pc.unidade_uso_receitas, p.unidade::text) as unidade_atual,
    COALESCE(pc.custo_unitario_uso, p.custo_unitario) as custo_atual
  FROM produtos p
  LEFT JOIN produto_conversoes pc ON p.id = pc.produto_id AND pc.ativo = true
)
UPDATE receita_embalagens re
SET 
  unidade = pi.unidade_atual,
  custo_unitario = pi.custo_atual,
  custo_total = re.quantidade * pi.custo_atual,
  updated_at = now()
FROM produto_info pi
WHERE re.produto_id = pi.produto_id;