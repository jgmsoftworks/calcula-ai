-- Limpar receitas vazias do tipo "Nova Receita" que não foram finalizadas
DELETE FROM receitas 
WHERE nome = 'Nova Receita' 
AND status = 'rascunho' 
AND (
  (rendimento_valor IS NULL OR rendimento_valor = 0) 
  AND (tempo_preparo_total IS NULL OR tempo_preparo_total = 0)
  AND (observacoes IS NULL OR observacoes = '')
);