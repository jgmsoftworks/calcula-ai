-- Recalcular custo_unitario_uso para todos os produtos existentes
-- baseado no custo_unitario atual e no fator de conversão

UPDATE produto_conversoes pc
SET 
  custo_unitario_uso = (
    SELECT 
      CASE 
        WHEN pc.quantidade_unidade_uso > 0 THEN p.custo_unitario / pc.quantidade_unidade_uso
        ELSE p.custo_unitario
      END
    FROM produtos p
    WHERE p.id = pc.produto_id
  ),
  updated_at = now()
WHERE pc.ativo = true;