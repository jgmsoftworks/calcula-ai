-- Remove constraint antiga se existir
ALTER TABLE receitas DROP CONSTRAINT IF EXISTS receitas_markup_id_fkey;

-- Adiciona nova constraint com ON DELETE SET NULL para sincronizar automaticamente
-- quando um markup é deletado
ALTER TABLE receitas 
ADD CONSTRAINT receitas_markup_id_fkey 
FOREIGN KEY (markup_id) 
REFERENCES markups(id) 
ON DELETE SET NULL;