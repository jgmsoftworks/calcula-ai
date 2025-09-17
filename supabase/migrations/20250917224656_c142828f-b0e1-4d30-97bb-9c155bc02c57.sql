-- Adicionar campo para preço de venda na tabela receitas
ALTER TABLE public.receitas 
ADD COLUMN preco_venda NUMERIC DEFAULT 0;