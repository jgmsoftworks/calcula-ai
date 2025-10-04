-- Criar enum para tipos de desconto de cupons promocionais
CREATE TYPE discount_type AS ENUM ('trial_period', 'percentage', 'fixed');

-- Tabela de cupons promocionais (separada dos cupons de afiliados)
CREATE TABLE public.promotional_coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  discount_type discount_type NOT NULL,
  trial_days INTEGER,
  discount_value NUMERIC(10,2),
  max_redemptions INTEGER,
  times_redeemed INTEGER DEFAULT 0,
  applies_to_plans TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT valid_trial_days CHECK (trial_days IS NULL OR trial_days > 0),
  CONSTRAINT valid_discount_value CHECK (discount_value IS NULL OR discount_value >= 0)
);

-- Tabela de resgates de cupons promocionais
CREATE TABLE public.coupon_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id UUID REFERENCES public.promotional_coupons(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  applied_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  plan_granted TEXT NOT NULL,
  trial_ends_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(coupon_id, user_id)
);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_promotional_coupons_updated_at
  BEFORE UPDATE ON public.promotional_coupons
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Habilitar RLS
ALTER TABLE public.promotional_coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupon_redemptions ENABLE ROW LEVEL SECURITY;

-- Policies para promotional_coupons
CREATE POLICY "Admins podem gerenciar cupons promocionais"
  ON public.promotional_coupons
  FOR ALL
  USING (has_role_or_higher('admin'::app_role))
  WITH CHECK (has_role_or_higher('admin'::app_role));

CREATE POLICY "Usuários podem ver cupons ativos"
  ON public.promotional_coupons
  FOR SELECT
  USING (is_active = true AND (expires_at IS NULL OR expires_at > now()));

-- Policies para coupon_redemptions
CREATE POLICY "Admins podem ver todos os resgates"
  ON public.coupon_redemptions
  FOR SELECT
  USING (has_role_or_higher('admin'::app_role));

CREATE POLICY "Usuários podem ver seus próprios resgates"
  ON public.coupon_redemptions
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Sistema pode criar resgates"
  ON public.coupon_redemptions
  FOR INSERT
  WITH CHECK (true);

-- Índices para performance
CREATE INDEX idx_promotional_coupons_code ON public.promotional_coupons(code);
CREATE INDEX idx_promotional_coupons_active ON public.promotional_coupons(is_active);
CREATE INDEX idx_coupon_redemptions_user ON public.coupon_redemptions(user_id);
CREATE INDEX idx_coupon_redemptions_coupon ON public.coupon_redemptions(coupon_id);