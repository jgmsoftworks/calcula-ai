-- Criar tabela para controle de idempotência de webhooks
CREATE TABLE IF NOT EXISTS public.stripe_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  stripe_event_id TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  processed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS na tabela
ALTER TABLE public.stripe_events ENABLE ROW LEVEL SECURITY;

-- Política para permitir apenas o sistema (service role) gerenciar eventos
CREATE POLICY "Sistema pode gerenciar eventos Stripe"
ON public.stripe_events
FOR ALL
USING (true)
WITH CHECK (true);

-- Adicionar campo para tracking de ciclos de comissão
ALTER TABLE public.affiliate_commissions 
ADD COLUMN IF NOT EXISTS cycle_number INTEGER DEFAULT 1;

-- Adicionar campo para identificar comissões de renovação
ALTER TABLE public.affiliate_commissions 
ADD COLUMN IF NOT EXISTS recurring_from_sale_id UUID REFERENCES affiliate_sales(id);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_stripe_events_stripe_id ON public.stripe_events(stripe_event_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_commissions_sale_cycle ON public.affiliate_commissions(sale_id, cycle_number);