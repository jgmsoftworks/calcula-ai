-- Criar tabelas para as subcategorias de custos

-- Tabela para Despesas Fixas
CREATE TABLE public.despesas_fixas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  nome TEXT NOT NULL,
  descricao TEXT,
  valor NUMERIC NOT NULL DEFAULT 0,
  vencimento INTEGER, -- dia do mês (1-31)
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela para Folha de Pagamento  
CREATE TABLE public.folha_pagamento (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  nome TEXT NOT NULL, -- nome do funcionário ou cargo
  salario_base NUMERIC NOT NULL DEFAULT 0,
  adicional NUMERIC DEFAULT 0,
  desconto NUMERIC DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela para Encargos sobre Venda
CREATE TABLE public.encargos_venda (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('percentual', 'fixo')), -- percentual da venda ou valor fixo
  valor NUMERIC NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.despesas_fixas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.folha_pagamento ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.encargos_venda ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para despesas_fixas
CREATE POLICY "Usuários podem ver suas próprias despesas fixas" 
ON public.despesas_fixas 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem criar suas próprias despesas fixas" 
ON public.despesas_fixas 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar suas próprias despesas fixas" 
ON public.despesas_fixas 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem deletar suas próprias despesas fixas" 
ON public.despesas_fixas 
FOR DELETE 
USING (auth.uid() = user_id);

-- Políticas RLS para folha_pagamento
CREATE POLICY "Usuários podem ver sua própria folha de pagamento" 
ON public.folha_pagamento 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem criar sua própria folha de pagamento" 
ON public.folha_pagamento 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar sua própria folha de pagamento" 
ON public.folha_pagamento 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem deletar sua própria folha de pagamento" 
ON public.folha_pagamento 
FOR DELETE 
USING (auth.uid() = user_id);

-- Políticas RLS para encargos_venda
CREATE POLICY "Usuários podem ver seus próprios encargos sobre venda" 
ON public.encargos_venda 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem criar seus próprios encargos sobre venda" 
ON public.encargos_venda 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar seus próprios encargos sobre venda" 
ON public.encargos_venda 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem deletar seus próprios encargos sobre venda" 
ON public.encargos_venda 
FOR DELETE 
USING (auth.uid() = user_id);

-- Triggers para atualizar updated_at
CREATE TRIGGER update_despesas_fixas_updated_at
  BEFORE UPDATE ON public.despesas_fixas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_folha_pagamento_updated_at
  BEFORE UPDATE ON public.folha_pagamento
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_encargos_venda_updated_at
  BEFORE UPDATE ON public.encargos_venda
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();