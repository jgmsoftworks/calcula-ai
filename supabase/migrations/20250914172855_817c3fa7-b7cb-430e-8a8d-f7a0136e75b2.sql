-- Limpar markups duplicados, mantendo apenas o mais recente para cada usuário
DELETE FROM markups 
WHERE id NOT IN (
  SELECT DISTINCT ON (user_id, nome) id 
  FROM markups 
  WHERE ativo = true
  ORDER BY user_id, nome, created_at DESC
);