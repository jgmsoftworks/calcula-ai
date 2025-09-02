-- Criar enum para unidades de medida
CREATE TYPE public.unidade_medida AS ENUM ('g', 'kg', 'ml', 'L', 'un');

-- Criar enum para tipos de movimentação
CREATE TYPE public.tipo_movimentacao AS ENUM ('entrada', 'saida');

-- Criar tabela de fornecedores
CREATE TABLE public.fornecedores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  nome TEXT NOT NULL,
  cnpj_cpf TEXT,
  contato TEXT,
  telefone TEXT,
  email TEXT,
  endereco TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de produtos
CREATE TABLE public.produtos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  nome TEXT NOT NULL,
  categoria TEXT,
  unidade unidade_medida NOT NULL DEFAULT 'g',
  estoque_atual NUMERIC(10,3) NOT NULL DEFAULT 0,
  custo_medio NUMERIC(10,2) NOT NULL DEFAULT 0,
  sku TEXT,
  codigo_barras TEXT,
  fornecedor_ids UUID[],
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, nome)
);

-- Criar tabela de movimentações
CREATE TABLE public.movimentacoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  tipo tipo_movimentacao NOT NULL,
  produto_id UUID NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
  quantidade NUMERIC(10,3) NOT NULL CHECK (quantidade > 0),
  custo_unitario NUMERIC(10,2),
  fornecedor_id UUID REFERENCES fornecedores(id) ON DELETE SET NULL,
  observacao TEXT,
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.fornecedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movimentacoes ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para fornecedores
CREATE POLICY "Usuários podem ver seus próprios fornecedores" 
ON public.fornecedores 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem criar seus próprios fornecedores" 
ON public.fornecedores 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar seus próprios fornecedores" 
ON public.fornecedores 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem deletar seus próprios fornecedores" 
ON public.fornecedores 
FOR DELETE 
USING (auth.uid() = user_id);

-- Políticas RLS para produtos
CREATE POLICY "Usuários podem ver seus próprios produtos" 
ON public.produtos 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem criar seus próprios produtos" 
ON public.produtos 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar seus próprios produtos" 
ON public.produtos 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem deletar seus próprios produtos" 
ON public.produtos 
FOR DELETE 
USING (auth.uid() = user_id);

-- Políticas RLS para movimentações
CREATE POLICY "Usuários podem ver suas próprias movimentações" 
ON public.movimentacoes 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem criar suas próprias movimentações" 
ON public.movimentacoes 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar suas próprias movimentações" 
ON public.movimentacoes 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem deletar suas próprias movimentações" 
ON public.movimentacoes 
FOR DELETE 
USING (auth.uid() = user_id);

-- Criar triggers para updated_at
CREATE TRIGGER update_fornecedores_updated_at
BEFORE UPDATE ON public.fornecedores
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_produtos_updated_at
BEFORE UPDATE ON public.produtos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_movimentacoes_updated_at
BEFORE UPDATE ON public.movimentacoes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();