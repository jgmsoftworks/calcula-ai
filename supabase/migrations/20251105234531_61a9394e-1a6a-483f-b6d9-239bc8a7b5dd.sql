-- Remover colunas redundantes de receita_ingredientes
-- Mantemos apenas: id, receita_id, produto_id, quantidade
ALTER TABLE receita_ingredientes 
DROP COLUMN IF EXISTS nome,
DROP COLUMN IF EXISTS marcas,
DROP COLUMN IF EXISTS unidade,
DROP COLUMN IF EXISTS custo_unitario,
DROP COLUMN IF EXISTS custo_total;

-- Remover colunas redundantes de receita_embalagens
-- Mantemos apenas: id, receita_id, produto_id, quantidade
ALTER TABLE receita_embalagens 
DROP COLUMN IF EXISTS nome,
DROP COLUMN IF EXISTS unidade,
DROP COLUMN IF EXISTS custo_unitario,
DROP COLUMN IF EXISTS custo_total;

-- Remover colunas redundantes de receita_sub_receitas
-- Mantemos apenas: id, receita_id, sub_receita_id, quantidade
ALTER TABLE receita_sub_receitas 
DROP COLUMN IF EXISTS nome,
DROP COLUMN IF EXISTS unidade,
DROP COLUMN IF EXISTS custo_unitario,
DROP COLUMN IF EXISTS custo_total;