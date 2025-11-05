-- Limpar registros órfãos antes de adicionar foreign keys

-- Remover ingredientes que apontam para produtos inexistentes
DELETE FROM receita_ingredientes
WHERE produto_id NOT IN (SELECT id FROM produtos);

-- Remover embalagens que apontam para produtos inexistentes  
DELETE FROM receita_embalagens
WHERE produto_id NOT IN (SELECT id FROM produtos);

-- Agora adicionar as foreign keys
ALTER TABLE receita_ingredientes
ADD CONSTRAINT receita_ingredientes_produto_id_fkey
FOREIGN KEY (produto_id) REFERENCES produtos(id) ON DELETE CASCADE;

ALTER TABLE receita_embalagens
ADD CONSTRAINT receita_embalagens_produto_id_fkey
FOREIGN KEY (produto_id) REFERENCES produtos(id) ON DELETE CASCADE;