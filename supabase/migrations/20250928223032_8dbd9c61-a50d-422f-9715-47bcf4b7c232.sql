-- Criar tabela para cupons de afiliados
CREATE TABLE public.affiliate_coupons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  affiliate_id UUID NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  stripe_coupon_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value NUMERIC NOT NULL,
  currency TEXT DEFAULT 'brl',
  max_redemptions INTEGER,
  times_redeemed INTEGER DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(affiliate_id, stripe_coupon_id)
);

-- Enable RLS
ALTER TABLE public.affiliate_coupons ENABLE ROW LEVEL SECURITY;

-- Create policies for affiliate coupons
CREATE POLICY "Apenas admins podem gerenciar cupons de afiliados" 
ON public.affiliate_coupons 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() AND is_admin = true
  )
);

-- Add indexes for performance
CREATE INDEX idx_affiliate_coupons_affiliate_id ON public.affiliate_coupons(affiliate_id);
CREATE INDEX idx_affiliate_coupons_active ON public.affiliate_coupons(is_active);
CREATE INDEX idx_affiliate_coupons_expires_at ON public.affiliate_coupons(expires_at);

-- Trigger for updated_at
CREATE TRIGGER update_affiliate_coupons_updated_at
BEFORE UPDATE ON public.affiliate_coupons
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();