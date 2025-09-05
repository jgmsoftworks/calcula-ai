-- Adicionar campo descricao para as categorias de despesas fixas
ALTER TABLE public.categorias_despesas_fixas
ADD COLUMN descricao TEXT;

-- Comentário explicativo
COMMENT ON COLUMN public.categorias_despesas_fixas.descricao IS 'Descrição detalhada da categoria de despesa fixa';