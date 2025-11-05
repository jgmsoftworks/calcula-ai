-- ====================================================================
-- MIGRATION: Recriar Sistema de Estoque Completo
-- Descrição: Drop e recriação de todas as tabelas de estoque com schema correto
-- ====================================================================

-- 1. DROP tabelas antigas (CASCADE para limpar foreign keys)
DROP TABLE IF EXISTS public.movimentacoes CASCADE;
DROP TABLE IF EXISTS public.produtos CASCADE;
DROP TABLE IF EXISTS public.marcas CASCADE;
DROP TABLE IF EXISTS public.categorias CASCADE;

-- 2. CRIAR TABELA: marcas
CREATE TABLE public.marcas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT unique_marca_per_user UNIQUE (user_id, nome)
);

-- 3. CRIAR TABELA: categorias
CREATE TABLE public.categorias (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT unique_categoria_per_user UNIQUE (user_id, nome)
);

-- 4. CRIAR TABELA: produtos
CREATE TABLE public.produtos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  codigo_interno INTEGER NOT NULL,
  codigos_barras TEXT[] DEFAULT '{}',
  marcas TEXT[] DEFAULT '{}',
  categorias TEXT[] DEFAULT '{}',
  unidade_compra TEXT NOT NULL DEFAULT 'un',
  custo_unitario NUMERIC(10,2) NOT NULL DEFAULT 0,
  estoque_atual NUMERIC(10,3) NOT NULL DEFAULT 0,
  estoque_minimo NUMERIC(10,3) NOT NULL DEFAULT 0,
  unidade_uso TEXT,
  fator_conversao NUMERIC(10,3),
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT unique_codigo_interno_per_user UNIQUE (user_id, codigo_interno)
);

-- 5. CRIAR TABELA: movimentacoes
CREATE TABLE public.movimentacoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  produto_id UUID NOT NULL REFERENCES public.produtos(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('entrada', 'saida')),
  quantidade NUMERIC(10,3) NOT NULL CHECK (quantidade > 0),
  custo_unitario NUMERIC(10,2),
  data_hora TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  responsavel TEXT,
  observacao TEXT,
  comprovante_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 6. CRIAR TABELA: comprovantes (para movimentações)
CREATE TABLE public.comprovantes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  numero INTEGER NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('entrada', 'saida')),
  data_hora TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  responsavel TEXT NOT NULL,
  observacao TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT unique_comprovante_numero_per_user UNIQUE (user_id, numero)
);

-- Adicionar FK de comprovante em movimentacoes
ALTER TABLE public.movimentacoes 
  ADD CONSTRAINT fk_movimentacoes_comprovante 
  FOREIGN KEY (comprovante_id) 
  REFERENCES public.comprovantes(id) 
  ON DELETE CASCADE;

-- 7. FUNÇÃO: Gerar próximo código interno
CREATE OR REPLACE FUNCTION public.gerar_proximo_codigo_interno(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  proximo_codigo INTEGER;
BEGIN
  SELECT COALESCE(MAX(codigo_interno), 0) + 1 
  INTO proximo_codigo
  FROM public.produtos 
  WHERE user_id = p_user_id;
  
  RETURN proximo_codigo;
END;
$$;

-- 8. TRIGGER: updated_at automático (marcas)
CREATE TRIGGER update_marcas_updated_at
  BEFORE UPDATE ON public.marcas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 9. TRIGGER: updated_at automático (categorias)
CREATE TRIGGER update_categorias_updated_at
  BEFORE UPDATE ON public.categorias
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 10. TRIGGER: updated_at automático (produtos)
CREATE TRIGGER update_produtos_updated_at
  BEFORE UPDATE ON public.produtos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 11. TRIGGER: updated_at automático (movimentacoes)
CREATE TRIGGER update_movimentacoes_updated_at
  BEFORE UPDATE ON public.movimentacoes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 12. INDEXES para performance
CREATE INDEX idx_marcas_user_id ON public.marcas(user_id);
CREATE INDEX idx_marcas_ativo ON public.marcas(ativo);

CREATE INDEX idx_categorias_user_id ON public.categorias(user_id);
CREATE INDEX idx_categorias_ativo ON public.categorias(ativo);

CREATE INDEX idx_produtos_user_id ON public.produtos(user_id);
CREATE INDEX idx_produtos_ativo ON public.produtos(ativo);
CREATE INDEX idx_produtos_codigo_interno ON public.produtos(codigo_interno);
CREATE INDEX idx_produtos_codigos_barras ON public.produtos USING GIN(codigos_barras);

CREATE INDEX idx_movimentacoes_user_id ON public.movimentacoes(user_id);
CREATE INDEX idx_movimentacoes_produto_id ON public.movimentacoes(produto_id);
CREATE INDEX idx_movimentacoes_data_hora ON public.movimentacoes(data_hora DESC);
CREATE INDEX idx_movimentacoes_comprovante_id ON public.movimentacoes(comprovante_id);

CREATE INDEX idx_comprovantes_user_id ON public.comprovantes(user_id);
CREATE INDEX idx_comprovantes_numero ON public.comprovantes(numero);

-- 13. HABILITAR RLS
ALTER TABLE public.marcas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movimentacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comprovantes ENABLE ROW LEVEL SECURITY;

-- 14. RLS POLICIES: marcas
CREATE POLICY "Usuários podem ver suas próprias marcas"
  ON public.marcas FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem criar suas próprias marcas"
  ON public.marcas FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar suas próprias marcas"
  ON public.marcas FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem deletar suas próprias marcas"
  ON public.marcas FOR DELETE
  USING (auth.uid() = user_id);

-- 15. RLS POLICIES: categorias
CREATE POLICY "Usuários podem ver suas próprias categorias"
  ON public.categorias FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem criar suas próprias categorias"
  ON public.categorias FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar suas próprias categorias"
  ON public.categorias FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem deletar suas próprias categorias"
  ON public.categorias FOR DELETE
  USING (auth.uid() = user_id);

-- 16. RLS POLICIES: produtos
CREATE POLICY "Usuários podem ver seus próprios produtos"
  ON public.produtos FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem criar seus próprios produtos"
  ON public.produtos FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar seus próprios produtos"
  ON public.produtos FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem deletar seus próprios produtos"
  ON public.produtos FOR DELETE
  USING (auth.uid() = user_id);

-- 17. RLS POLICIES: movimentacoes
CREATE POLICY "Usuários podem ver suas próprias movimentações"
  ON public.movimentacoes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem criar suas próprias movimentações"
  ON public.movimentacoes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar suas próprias movimentações"
  ON public.movimentacoes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem deletar suas próprias movimentações"
  ON public.movimentacoes FOR DELETE
  USING (auth.uid() = user_id);

-- 18. RLS POLICIES: comprovantes
CREATE POLICY "Usuários podem ver seus próprios comprovantes"
  ON public.comprovantes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem criar seus próprios comprovantes"
  ON public.comprovantes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar seus próprios comprovantes"
  ON public.comprovantes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem deletar seus próprios comprovantes"
  ON public.comprovantes FOR DELETE
  USING (auth.uid() = user_id);