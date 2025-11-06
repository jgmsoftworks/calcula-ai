-- Adicionar constraint única para permitir UPSERT por user_id e nome
ALTER TABLE markups 
ADD CONSTRAINT markups_user_id_nome_unique 
UNIQUE (user_id, nome);