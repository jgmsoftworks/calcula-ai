-- Limpar markups duplicados, mantendo apenas o mais recente de cada nome/tipo por usuário
DELETE FROM markups 
WHERE id NOT IN (
  SELECT DISTINCT ON (user_id, nome, tipo) id
  FROM markups 
  WHERE ativo = true
  ORDER BY user_id, nome, tipo, created_at DESC
);

-- Garantir que não há mais duplicatas
CREATE UNIQUE INDEX IF NOT EXISTS idx_markups_unique_user_nome_tipo 
ON markups(user_id, nome, tipo) 
WHERE ativo = true;