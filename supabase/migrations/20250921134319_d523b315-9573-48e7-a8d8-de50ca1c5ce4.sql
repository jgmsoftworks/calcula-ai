-- Criar tabela para tipos de produto
CREATE TABLE public.tipos_produto (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  descricao TEXT,
  user_id UUID NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.tipos_produto ENABLE ROW LEVEL SECURITY;

-- Criar políticas RLS
CREATE POLICY "Usuários podem ver seus próprios tipos de produto" 
ON public.tipos_produto 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem criar seus próprios tipos de produto" 
ON public.tipos_produto 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar seus próprios tipos de produto" 
ON public.tipos_produto 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem deletar seus próprios tipos de produto" 
ON public.tipos_produto 
FOR DELETE 
USING (auth.uid() = user_id);

-- Criar trigger para atualizar updated_at
CREATE TRIGGER update_tipos_produto_updated_at
BEFORE UPDATE ON public.tipos_produto
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();