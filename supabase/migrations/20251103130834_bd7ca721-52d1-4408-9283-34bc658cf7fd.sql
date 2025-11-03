-- Corrigir trigger que propaga mudanças de produtos para receitas
-- Problema: trigger estava disparando mesmo sem mudanças reais em unidade/custo
-- Solução: otimizar condição WHEN e garantir search_path correto

-- Recriar função com lógica corrigida e search_path explícito
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
$$;

-- Recriar trigger com condição otimizada (remove custo_medio, mantém apenas campos usados)
DROP TRIGGER IF EXISTS trigger_update_receitas_on_product_change ON produtos;

CREATE TRIGGER trigger_update_receitas_on_product_change
AFTER UPDATE OF custo_unitario, unidade ON produtos
FOR EACH ROW
WHEN (
  -- Só dispara se houve mudança REAL em custo ou unidade
  OLD.custo_unitario IS DISTINCT FROM NEW.custo_unitario 
  OR OLD.unidade IS DISTINCT FROM NEW.unidade
)
EXECUTE FUNCTION update_receita_ingredientes_on_product_change();

COMMENT ON FUNCTION update_receita_ingredientes_on_product_change IS 
'Propaga automaticamente mudanças de custo/unidade dos produtos para todas as receitas que os utilizam. Dispara apenas quando há mudança real nesses campos.';