-- Optional type photo; existing ownership and storage policies remain unchanged.
ALTER TABLE public.tipos_produto ADD COLUMN IF NOT EXISTS imagem_url text;
COMMENT ON COLUMN public.tipos_produto.imagem_url IS 'Foto opcional do tipo de produto, usada no catálogo e nas movimentações.';
