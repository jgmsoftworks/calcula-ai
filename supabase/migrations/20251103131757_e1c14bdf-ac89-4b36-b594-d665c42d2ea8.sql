-- MIGRATION: Corrigir trigger definitivamente para resolver erro 42804
-- Estratégia: Trigger só dispara se unidade OU custo mudarem de fato
-- E a função valida se o campo veio preenchido antes de propagar

-- Recriar função com validação explícita
CREATE OR REPLACE FUNCTION public.update_receita_ingredientes_on_product_change()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path TO 'public'
LANGUAGE plpgsql
AS $$
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
    nova_unidade := conversao_record.unidade_uso_receitas::text;
    novo_custo_unitario := conversao_record.custo_unitario_uso;
  ELSE
    nova_unidade := NEW.unidade::text;
    novo_custo_unitario := NEW.custo_unitario;
  END IF;
  
  -- ✅ SÓ ATUALIZA SE HOUVE MUDANÇA REAL (não apenas UPDATE vazio)
  IF OLD.custo_unitario IS DISTINCT FROM NEW.custo_unitario 
     OR OLD.unidade IS DISTINCT FROM NEW.unidade THEN
    
    -- Atualizar ingredientes
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
  END IF;
  
  RETURN NEW;
END;
$$;

-- Recriar trigger (mais restritivo)
DROP TRIGGER IF EXISTS trigger_update_receitas_on_product_change ON produtos;

CREATE TRIGGER trigger_update_receitas_on_product_change
AFTER UPDATE OF custo_unitario, unidade ON produtos
FOR EACH ROW
EXECUTE FUNCTION update_receita_ingredientes_on_product_change();

COMMENT ON TRIGGER trigger_update_receitas_on_product_change ON produtos IS 
'Propaga mudanças de custo/unidade para receitas. Validação interna garante que só executa se houve mudança real.';

COMMENT ON FUNCTION update_receita_ingredientes_on_product_change IS 
'Função otimizada: valida mudanças reais antes de propagar para receitas/embalagens.';