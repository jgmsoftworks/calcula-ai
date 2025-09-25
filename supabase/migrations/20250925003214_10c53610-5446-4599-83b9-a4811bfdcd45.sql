-- Adicionar campo codigo_barras_secundario na tabela produtos
ALTER TABLE public.produtos 
ADD COLUMN codigo_barras_secundario text;