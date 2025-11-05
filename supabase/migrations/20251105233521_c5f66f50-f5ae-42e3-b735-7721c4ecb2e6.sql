-- Adicionar coluna unidade em receita_ingredientes para armazenar a unidade usada na receita
ALTER TABLE receita_ingredientes 
ADD COLUMN unidade text;

-- Adicionar coluna unidade em receita_embalagens para armazenar a unidade usada na receita
ALTER TABLE receita_embalagens 
ADD COLUMN unidade text;