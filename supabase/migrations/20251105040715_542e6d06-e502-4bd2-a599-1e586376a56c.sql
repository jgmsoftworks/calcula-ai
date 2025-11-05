-- Adicionar coluna imagem_url à tabela produtos
ALTER TABLE public.produtos 
ADD COLUMN IF NOT EXISTS imagem_url TEXT;