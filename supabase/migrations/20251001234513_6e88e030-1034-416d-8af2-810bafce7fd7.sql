-- Adicionar campo quantidade_unidade_uso na tabela produto_conversoes
ALTER TABLE produto_conversoes 
ADD COLUMN quantidade_unidade_uso numeric DEFAULT 1 NOT NULL;