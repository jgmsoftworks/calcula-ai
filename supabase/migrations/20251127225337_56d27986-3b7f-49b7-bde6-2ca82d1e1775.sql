-- ============================================
-- FASE 1: FUNÇÕES DE CÁLCULO
-- ============================================

-- Função para calcular custo total de uma receita
CREATE OR REPLACE FUNCTION calcular_custo_receita(p_receita_id UUID)
RETURNS NUMERIC AS $$
DECLARE
  custo_ingredientes NUMERIC := 0;
  custo_embalagens NUMERIC := 0;
  custo_mao_obra NUMERIC := 0;
  custo_sub_receitas NUMERIC := 0;
BEGIN
  -- Calcular custo ingredientes
  SELECT COALESCE(SUM(
    CASE 
      WHEN p.unidade_uso IS NOT NULL AND p.fator_conversao > 0 
      THEN (p.custo_unitario / p.fator_conversao) * ri.quantidade
      ELSE p.custo_unitario * ri.quantidade
    END
  ), 0) INTO custo_ingredientes
  FROM receita_ingredientes ri
  JOIN produtos p ON ri.produto_id = p.id
  WHERE ri.receita_id = p_receita_id;

  -- Calcular custo embalagens
  SELECT COALESCE(SUM(
    CASE 
      WHEN p.unidade_uso IS NOT NULL AND p.fator_conversao > 0 
      THEN (p.custo_unitario / p.fator_conversao) * re.quantidade
      ELSE p.custo_unitario * re.quantidade
    END
  ), 0) INTO custo_embalagens
  FROM receita_embalagens re
  JOIN produtos p ON re.produto_id = p.id
  WHERE re.receita_id = p_receita_id;

  -- Calcular custo mão de obra
  SELECT COALESCE(SUM(valor_total), 0) INTO custo_mao_obra
  FROM receita_mao_obra
  WHERE receita_id = p_receita_id;

  -- Calcular custo sub-receitas
  SELECT COALESCE(SUM(
    CASE 
      WHEN r.rendimento_valor > 0 
      THEN (r.preco_venda / r.rendimento_valor) * rs.quantidade
      ELSE r.preco_venda * rs.quantidade
    END
  ), 0) INTO custo_sub_receitas
  FROM receita_sub_receitas rs
  JOIN receitas r ON rs.sub_receita_id = r.id
  WHERE rs.receita_id = p_receita_id;

  RETURN custo_ingredientes + custo_embalagens + custo_mao_obra + custo_sub_receitas;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Função para atualizar preço de venda de uma receita
CREATE OR REPLACE FUNCTION atualizar_preco_receita(p_receita_id UUID)
RETURNS VOID AS $$
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

  -- Calcular custo total
  v_custo_total := calcular_custo_receita(p_receita_id);

  -- Calcular novo preço
  IF v_markup_tipo = 'sub_receita' THEN
    -- Sub-receitas: preço = custo
    v_novo_preco := v_custo_total;
  ELSIF v_markup_aplicado IS NOT NULL AND v_markup_aplicado > 0 THEN
    -- Aplicar markup: preço = custo × markup
    v_novo_preco := v_custo_total * v_markup_aplicado;
  ELSE
    -- Sem markup definido, manter custo
    v_novo_preco := v_custo_total;
  END IF;

  -- Atualizar preco_venda (só se houver diferença significativa)
  UPDATE receitas
  SET preco_venda = v_novo_preco,
      updated_at = now()
  WHERE id = p_receita_id
    AND ABS(COALESCE(preco_venda, 0) - v_novo_preco) > 0.01;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================
-- FASE 2: TRIGGERS DE PROPAGAÇÃO
-- ============================================

-- Trigger quando PRODUTO é atualizado
CREATE OR REPLACE FUNCTION trigger_produto_atualizado()
RETURNS TRIGGER AS $$
DECLARE
  receita_record RECORD;
BEGIN
  -- Só executar se campos relevantes mudaram
  IF OLD.custo_unitario = NEW.custo_unitario 
     AND OLD.fator_conversao IS NOT DISTINCT FROM NEW.fator_conversao
     AND OLD.unidade_uso IS NOT DISTINCT FROM NEW.unidade_uso THEN
    RETURN NEW;
  END IF;

  -- Atualizar receitas que usam este produto como ingrediente
  FOR receita_record IN 
    SELECT DISTINCT receita_id FROM receita_ingredientes WHERE produto_id = NEW.id
  LOOP
    PERFORM atualizar_preco_receita(receita_record.receita_id);
  END LOOP;

  -- Atualizar receitas que usam este produto como embalagem
  FOR receita_record IN 
    SELECT DISTINCT receita_id FROM receita_embalagens WHERE produto_id = NEW.id
  LOOP
    PERFORM atualizar_preco_receita(receita_record.receita_id);
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS after_produto_update ON produtos;
CREATE TRIGGER after_produto_update
AFTER UPDATE ON produtos
FOR EACH ROW
EXECUTE FUNCTION trigger_produto_atualizado();

-- Trigger quando RECEITA (sub-receita) tem preço atualizado
CREATE OR REPLACE FUNCTION trigger_receita_preco_atualizado()
RETURNS TRIGGER AS $$
DECLARE
  receita_record RECORD;
BEGIN
  -- Só executar se preco_venda mudou significativamente
  IF ABS(COALESCE(OLD.preco_venda, 0) - COALESCE(NEW.preco_venda, 0)) <= 0.01 THEN
    RETURN NEW;
  END IF;

  -- Atualizar receitas que usam esta receita como sub-receita
  FOR receita_record IN 
    SELECT DISTINCT receita_id FROM receita_sub_receitas WHERE sub_receita_id = NEW.id
  LOOP
    PERFORM atualizar_preco_receita(receita_record.receita_id);
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS after_receita_preco_update ON receitas;
CREATE TRIGGER after_receita_preco_update
AFTER UPDATE OF preco_venda ON receitas
FOR EACH ROW
EXECUTE FUNCTION trigger_receita_preco_atualizado();

-- ============================================
-- FASE 3: TRIGGERS PARA COMPONENTES DA RECEITA
-- ============================================

-- Trigger para ingredientes, embalagens, sub-receitas e mão de obra
CREATE OR REPLACE FUNCTION trigger_componente_receita_modificado()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM atualizar_preco_receita(OLD.receita_id);
    RETURN OLD;
  ELSE
    PERFORM atualizar_preco_receita(NEW.receita_id);
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger para ingredientes
DROP TRIGGER IF EXISTS after_ingrediente_change ON receita_ingredientes;
CREATE TRIGGER after_ingrediente_change
AFTER INSERT OR UPDATE OR DELETE ON receita_ingredientes
FOR EACH ROW
EXECUTE FUNCTION trigger_componente_receita_modificado();

-- Trigger para embalagens
DROP TRIGGER IF EXISTS after_embalagem_change ON receita_embalagens;
CREATE TRIGGER after_embalagem_change
AFTER INSERT OR UPDATE OR DELETE ON receita_embalagens
FOR EACH ROW
EXECUTE FUNCTION trigger_componente_receita_modificado();

-- Trigger para sub-receitas
DROP TRIGGER IF EXISTS after_sub_receita_change ON receita_sub_receitas;
CREATE TRIGGER after_sub_receita_change
AFTER INSERT OR UPDATE OR DELETE ON receita_sub_receitas
FOR EACH ROW
EXECUTE FUNCTION trigger_componente_receita_modificado();

-- Trigger para mão de obra
DROP TRIGGER IF EXISTS after_mao_obra_change ON receita_mao_obra;
CREATE TRIGGER after_mao_obra_change
AFTER INSERT OR UPDATE OR DELETE ON receita_mao_obra
FOR EACH ROW
EXECUTE FUNCTION trigger_componente_receita_modificado();

-- ============================================
-- FASE 4: FUNÇÃO DE MIGRAÇÃO INICIAL
-- ============================================

-- Função para recalcular todas as receitas de um usuário
CREATE OR REPLACE FUNCTION recalcular_todas_receitas(p_user_id UUID DEFAULT NULL)
RETURNS INTEGER AS $$
DECLARE
  receita_record RECORD;
  contador INTEGER := 0;
BEGIN
  FOR receita_record IN 
    SELECT r.id 
    FROM receitas r
    LEFT JOIN markups m ON r.markup_id = m.id
    WHERE (p_user_id IS NULL OR r.user_id = p_user_id)
    ORDER BY 
      -- Processar sub-receitas primeiro (para propagar corretamente)
      CASE WHEN m.tipo = 'sub_receita' THEN 0 ELSE 1 END,
      r.created_at
  LOOP
    PERFORM atualizar_preco_receita(receita_record.id);
    contador := contador + 1;
  END LOOP;
  
  RETURN contador;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;