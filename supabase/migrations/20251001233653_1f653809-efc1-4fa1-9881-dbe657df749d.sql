-- Criar tabela para conversões de produtos (Modo de Uso)
CREATE TABLE IF NOT EXISTS public.produto_conversoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  produto_id UUID NOT NULL REFERENCES public.produtos(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  unidade_compra TEXT NOT NULL,
  quantidade_por_unidade NUMERIC NOT NULL CHECK (quantidade_por_unidade > 0),
  unidade_uso_receitas TEXT NOT NULL,
  custo_unitario_uso NUMERIC NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(produto_id, user_id)
);

-- Habilitar RLS
ALTER TABLE public.produto_conversoes ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para produto_conversoes
CREATE POLICY "Usuários podem ver suas próprias conversões"
ON public.produto_conversoes
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem criar suas próprias conversões"
ON public.produto_conversoes
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar suas próprias conversões"
ON public.produto_conversoes
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem deletar suas próprias conversões"
ON public.produto_conversoes
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_produto_conversoes_produto_id ON public.produto_conversoes(produto_id);
CREATE INDEX IF NOT EXISTS idx_produto_conversoes_user_id ON public.produto_conversoes(user_id);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_produto_conversoes_updated_at
BEFORE UPDATE ON public.produto_conversoes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();