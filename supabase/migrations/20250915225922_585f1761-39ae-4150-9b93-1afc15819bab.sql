-- Atualizar receitas que referenciam markups duplicados para usar o markup mais recente
WITH markups_unicos AS (
  SELECT DISTINCT ON (user_id, nome, tipo) 
    id as novo_id,
    user_id, 
    nome, 
    tipo,
    ROW_NUMBER() OVER (PARTITION BY user_id, nome, tipo ORDER BY created_at DESC) as rn
  FROM markups 
  WHERE ativo = true
),
markups_duplicados AS (
  SELECT m.id as old_id, mu.novo_id
  FROM markups m
  JOIN markups_unicos mu ON (m.user_id = mu.user_id AND m.nome = mu.nome AND m.tipo = mu.tipo)
  WHERE m.id != mu.novo_id AND m.ativo = true
)
UPDATE receitas 
SET markup_id = md.novo_id
FROM markups_duplicados md
WHERE receitas.markup_id = md.old_id;

-- Agora remover markups duplicados que não são mais referenciados
DELETE FROM markups 
WHERE id NOT IN (
  SELECT DISTINCT ON (user_id, nome, tipo) id
  FROM markups 
  WHERE ativo = true
  ORDER BY user_id, nome, tipo, created_at DESC
) AND ativo = true;

-- Criar índice único para prevenir duplicatas futuras
CREATE UNIQUE INDEX IF NOT EXISTS idx_markups_unique_user_nome_tipo 
ON markups(user_id, nome, tipo) 
WHERE ativo = true;