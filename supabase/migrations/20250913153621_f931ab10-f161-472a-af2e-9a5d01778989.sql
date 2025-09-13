-- Create table to store markup configurations and calculations
CREATE TABLE public.markups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'normal', -- 'normal' or 'sub_receita'
  periodo TEXT NOT NULL DEFAULT '12',
  margem_lucro NUMERIC NOT NULL DEFAULT 0,
  gasto_sobre_faturamento NUMERIC NOT NULL DEFAULT 0,
  encargos_sobre_venda NUMERIC NOT NULL DEFAULT 0,
  markup_ideal NUMERIC NOT NULL DEFAULT 0,
  markup_aplicado NUMERIC NOT NULL DEFAULT 0,
  preco_sugerido NUMERIC NOT NULL DEFAULT 0,
  despesas_fixas_selecionadas JSONB DEFAULT '[]'::jsonb,
  folha_pagamento_selecionada JSONB DEFAULT '[]'::jsonb,
  encargos_venda_selecionados JSONB DEFAULT '[]'::jsonb,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.markups ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Usuários podem ver seus próprios markups" 
ON public.markups 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem criar seus próprios markups" 
ON public.markups 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar seus próprios markups" 
ON public.markups 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem deletar seus próprios markups" 
ON public.markups 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_markups_updated_at
BEFORE UPDATE ON public.markups
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();