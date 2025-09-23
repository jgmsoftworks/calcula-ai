-- Criar tabela para estoque de receitas
CREATE TABLE public.estoque_receitas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  receita_id UUID NOT NULL,
  quantidade_atual NUMERIC NOT NULL DEFAULT 0,
  quantidade_minima NUMERIC DEFAULT 0,
  unidade TEXT NOT NULL DEFAULT 'unidades',
  custo_unitario_medio NUMERIC DEFAULT 0,
  data_ultima_movimentacao TIMESTAMP WITH TIME ZONE DEFAULT now(),
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tipo enum para movimentações de receitas
CREATE TYPE tipo_movimentacao_receita AS ENUM ('entrada', 'venda', 'perdas', 'brindes');

-- Criar tabela para movimentações de receitas
CREATE TABLE public.movimentacoes_receitas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  receita_id UUID NOT NULL,
  tipo tipo_movimentacao_receita NOT NULL,
  quantidade NUMERIC NOT NULL,
  custo_unitario NUMERIC DEFAULT 0,
  preco_venda NUMERIC DEFAULT 0,
  observacao TEXT,
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.estoque_receitas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movimentacoes_receitas ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para estoque_receitas
CREATE POLICY "Usuários podem ver seu próprio estoque de receitas" 
ON public.estoque_receitas 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem criar seu próprio estoque de receitas" 
ON public.estoque_receitas 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar seu próprio estoque de receitas" 
ON public.estoque_receitas 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem deletar seu próprio estoque de receitas" 
ON public.estoque_receitas 
FOR DELETE 
USING (auth.uid() = user_id);

-- Políticas RLS para movimentacoes_receitas
CREATE POLICY "Usuários podem ver suas próprias movimentações de receitas" 
ON public.movimentacoes_receitas 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem criar suas próprias movimentações de receitas" 
ON public.movimentacoes_receitas 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar suas próprias movimentações de receitas" 
ON public.movimentacoes_receitas 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem deletar suas próprias movimentações de receitas" 
ON public.movimentacoes_receitas 
FOR DELETE 
USING (auth.uid() = user_id);

-- Criar trigger para atualizar updated_at
CREATE TRIGGER update_estoque_receitas_updated_at
  BEFORE UPDATE ON public.estoque_receitas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_movimentacoes_receitas_updated_at
  BEFORE UPDATE ON public.movimentacoes_receitas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Índices para performance
CREATE INDEX idx_estoque_receitas_user_id ON public.estoque_receitas(user_id);
CREATE INDEX idx_estoque_receitas_receita_id ON public.estoque_receitas(receita_id);
CREATE INDEX idx_movimentacoes_receitas_user_id ON public.movimentacoes_receitas(user_id);
CREATE INDEX idx_movimentacoes_receitas_receita_id ON public.movimentacoes_receitas(receita_id);
CREATE INDEX idx_movimentacoes_receitas_tipo ON public.movimentacoes_receitas(tipo);
CREATE INDEX idx_movimentacoes_receitas_data ON public.movimentacoes_receitas(data);