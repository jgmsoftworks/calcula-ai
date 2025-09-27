-- Criar tabela de afiliados
CREATE TABLE public.affiliates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  phone text,
  document text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending')),
  commission_percentage numeric(5,2) NOT NULL DEFAULT 10.00,
  commission_type text NOT NULL DEFAULT 'percentage' CHECK (commission_type IN ('percentage', 'fixed')),
  commission_fixed_amount numeric(10,2) DEFAULT 0,
  pix_key text,
  bank_details jsonb,
  total_sales numeric(10,2) DEFAULT 0,
  total_commissions numeric(10,2) DEFAULT 0,
  total_customers integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Criar tabela de links de afiliados
CREATE TABLE public.affiliate_links (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  affiliate_id uuid NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  link_code text NOT NULL UNIQUE,
  product_type text NOT NULL DEFAULT 'all' CHECK (product_type IN ('all', 'professional', 'enterprise')),
  is_active boolean NOT NULL DEFAULT true,
  clicks_count integer DEFAULT 0,
  conversions_count integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Criar tabela de vendas de afiliados
CREATE TABLE public.affiliate_sales (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  affiliate_id uuid NOT NULL REFERENCES public.affiliates(id),
  affiliate_link_id uuid REFERENCES public.affiliate_links(id),
  customer_user_id uuid,
  customer_email text NOT NULL,
  customer_name text,
  plan_type text NOT NULL,
  sale_amount numeric(10,2) NOT NULL,
  commission_amount numeric(10,2) NOT NULL,
  stripe_session_id text,
  stripe_payment_intent_id text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'refunded')),
  sale_date timestamp with time zone NOT NULL DEFAULT now(),
  confirmed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Criar tabela de comissões
CREATE TABLE public.affiliate_commissions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  affiliate_id uuid NOT NULL REFERENCES public.affiliates(id),
  sale_id uuid NOT NULL REFERENCES public.affiliate_sales(id),
  amount numeric(10,2) NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'cancelled')),
  payment_method text,
  payment_details jsonb,
  paid_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Criar tabela de clientes de afiliados
CREATE TABLE public.affiliate_customers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  affiliate_id uuid NOT NULL REFERENCES public.affiliates(id),
  customer_user_id uuid,
  customer_email text NOT NULL,
  customer_name text,
  first_purchase_date timestamp with time zone,
  total_purchases numeric(10,2) DEFAULT 0,
  total_commission_generated numeric(10,2) DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(affiliate_id, customer_email)
);

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.affiliates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_customers ENABLE ROW LEVEL SECURITY;

-- Políticas RLS - Apenas admins podem acessar dados de afiliados
CREATE POLICY "Apenas admins podem gerenciar afiliados" ON public.affiliates
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "Apenas admins podem gerenciar links de afiliados" ON public.affiliate_links
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "Apenas admins podem ver vendas de afiliados" ON public.affiliate_sales
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "Apenas admins podem gerenciar comissões" ON public.affiliate_commissions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "Apenas admins podem ver clientes de afiliados" ON public.affiliate_customers
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND is_admin = true)
  );

-- Criar índices para performance
CREATE INDEX idx_affiliates_status ON public.affiliates(status);
CREATE INDEX idx_affiliate_links_code ON public.affiliate_links(link_code);
CREATE INDEX idx_affiliate_sales_affiliate_id ON public.affiliate_sales(affiliate_id);
CREATE INDEX idx_affiliate_sales_status ON public.affiliate_sales(status);
CREATE INDEX idx_affiliate_commissions_affiliate_id ON public.affiliate_commissions(affiliate_id);
CREATE INDEX idx_affiliate_customers_affiliate_id ON public.affiliate_customers(affiliate_id);

-- Criar triggers para updated_at
CREATE TRIGGER update_affiliates_updated_at
  BEFORE UPDATE ON public.affiliates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_affiliate_links_updated_at
  BEFORE UPDATE ON public.affiliate_links
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_affiliate_commissions_updated_at
  BEFORE UPDATE ON public.affiliate_commissions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_affiliate_customers_updated_at
  BEFORE UPDATE ON public.affiliate_customers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Função para gerar código único de link
CREATE OR REPLACE FUNCTION generate_affiliate_link_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    code_length integer := 8;
    code text;
    exists_check integer;
BEGIN
    LOOP
        -- Gerar código aleatório
        code := upper(substring(md5(random()::text) from 1 for code_length));
        
        -- Verificar se já existe
        SELECT COUNT(*) INTO exists_check
        FROM affiliate_links 
        WHERE link_code = code;
        
        -- Se não existe, usar este código
        IF exists_check = 0 THEN
            EXIT;
        END IF;
    END LOOP;
    
    RETURN code;
END;
$$;