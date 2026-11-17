-- Optional catalog photos; existing names, product references and RLS are unchanged.
ALTER TABLE public.marcas ADD COLUMN IF NOT EXISTS imagem_url text;
ALTER TABLE public.categorias ADD COLUMN IF NOT EXISTS imagem_url text;

COMMENT ON COLUMN public.marcas.imagem_url IS 'Foto opcional da marca no bucket receitas-images, sob a pasta do proprietário.';
COMMENT ON COLUMN public.categorias.imagem_url IS 'Foto opcional da categoria no bucket receitas-images, sob a pasta do proprietário.';
