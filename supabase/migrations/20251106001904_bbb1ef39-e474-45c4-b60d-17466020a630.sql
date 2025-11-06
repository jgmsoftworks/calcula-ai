-- Criar tabela tipos_produto
CREATE TABLE IF NOT EXISTS public.tipos_produto (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice para performance
CREATE INDEX IF NOT EXISTS idx_tipos_produto_user_id ON public.tipos_produto(user_id);

-- RLS Policies
ALTER TABLE public.tipos_produto ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own tipos_produto"
  ON public.tipos_produto FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tipos_produto"
  ON public.tipos_produto FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tipos_produto"
  ON public.tipos_produto FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tipos_produto"
  ON public.tipos_produto FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger para updated_at
CREATE TRIGGER update_tipos_produto_updated_at
  BEFORE UPDATE ON public.tipos_produto
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Inserir tipos únicos de produtos que já existem (migração de dados)
INSERT INTO public.tipos_produto (user_id, nome)
SELECT DISTINCT user_id, tipo_produto
FROM public.receitas
WHERE tipo_produto IS NOT NULL 
  AND tipo_produto != ''
  AND NOT EXISTS (
    SELECT 1 FROM public.tipos_produto tp 
    WHERE tp.user_id = receitas.user_id 
    AND tp.nome = receitas.tipo_produto
  );

-- Criar coluna para o novo tipo_produto_id
ALTER TABLE public.receitas ADD COLUMN IF NOT EXISTS tipo_produto_id UUID REFERENCES public.tipos_produto(id) ON DELETE SET NULL;

-- Migrar referências existentes
UPDATE public.receitas r
SET tipo_produto_id = tp.id
FROM public.tipos_produto tp
WHERE r.tipo_produto = tp.nome 
  AND r.user_id = tp.user_id
  AND r.tipo_produto_id IS NULL;

-- Adicionar colunas para tempo de preparo se não existirem
ALTER TABLE public.receitas ADD COLUMN IF NOT EXISTS tempo_preparo_total NUMERIC(10,3) DEFAULT 0;
ALTER TABLE public.receitas ADD COLUMN IF NOT EXISTS tempo_preparo_unidade TEXT DEFAULT 'minutos';