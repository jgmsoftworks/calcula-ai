-- Recalcular preco_venda de todas as sub-receitas para ser igual ao custo total
UPDATE receitas r
SET preco_venda = COALESCE(custo.total, 0)
FROM (
  SELECT 
    sr.id,
    COALESCE(ing.custo, 0) + COALESCE(emb.custo, 0) + COALESCE(mao.custo, 0) as total
  FROM receitas sr
  LEFT JOIN (
    SELECT 
      receita_id, 
      SUM(quantidade * p.custo_unitario / COALESCE(NULLIF(p.fator_conversao, 0), 1)) as custo
    FROM receita_ingredientes ri 
    JOIN produtos p ON ri.produto_id = p.id
    GROUP BY receita_id
  ) ing ON sr.id = ing.receita_id
  LEFT JOIN (
    SELECT 
      receita_id, 
      SUM(quantidade * p.custo_unitario / COALESCE(NULLIF(p.fator_conversao, 0), 1)) as custo
    FROM receita_embalagens re 
    JOIN produtos p ON re.produto_id = p.id
    GROUP BY receita_id
  ) emb ON sr.id = emb.receita_id
  LEFT JOIN (
    SELECT 
      receita_id, 
      SUM(valor_total) as custo
    FROM receita_mao_obra 
    GROUP BY receita_id
  ) mao ON sr.id = mao.receita_id
  WHERE sr.id IN (SELECT DISTINCT sub_receita_id FROM receita_sub_receitas)
) custo
WHERE r.id = custo.id;