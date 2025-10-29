-- Migração para backfill de custo_unitario
-- Atualiza produtos com o custo unitário da última entrada

-- Para cada produto, definir custo_unitario como o da última entrada
UPDATE produtos p
SET custo_unitario = COALESCE(
  (
    SELECT m.custo_unitario 
    FROM movimentacoes m
    WHERE m.produto_id = p.id 
      AND m.tipo = 'entrada'
      AND m.user_id = p.user_id
    ORDER BY m.data DESC, m.created_at DESC
    LIMIT 1
  ),
  p.custo_unitario,
  0
)
WHERE EXISTS (
  SELECT 1 FROM movimentacoes m2 
  WHERE m2.produto_id = p.id AND m2.tipo = 'entrada'
);

-- Atualizar custo_total baseado no novo custo_unitario
UPDATE produtos
SET custo_total = estoque_atual * custo_unitario;

-- Adicionar comentários aos campos legados
COMMENT ON COLUMN produtos.total_embalagem IS 'DEPRECATED - Campo legado, não mais usado na UI. Mantido para compatibilidade.';
COMMENT ON COLUMN produtos.custo_total IS 'CALCULADO - Agora é calculado como estoque_atual * custo_unitario. Campo mantido para histórico.';