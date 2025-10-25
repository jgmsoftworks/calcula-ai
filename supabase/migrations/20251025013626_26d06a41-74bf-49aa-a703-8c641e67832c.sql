-- Corrigir search_path nas funções criadas
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';