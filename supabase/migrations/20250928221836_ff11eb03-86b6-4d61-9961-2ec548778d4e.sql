-- Criar tabela para mapear afiliados com produtos únicos do Stripe
CREATE TABLE public.affiliate_stripe_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  plan_type TEXT NOT NULL, -- 'professional' ou 'enterprise'
  billing TEXT NOT NULL, -- 'monthly' ou 'yearly'
  stripe_product_id TEXT NOT NULL, -- Product ID do Stripe
  stripe_price_id TEXT NOT NULL, -- Price ID do Stripe  
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(affiliate_id, plan_type, billing)
);

-- Habilitar RLS
ALTER TABLE public.affiliate_stripe_products ENABLE ROW LEVEL SECURITY;

-- Política para admin ver todos os produtos de afiliados
CREATE POLICY "Apenas admins podem gerenciar produtos de afiliados"
ON public.affiliate_stripe_products
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND is_admin = true
  )
);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_affiliate_stripe_products_updated_at
  BEFORE UPDATE ON public.affiliate_stripe_products
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();