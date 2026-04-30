-- =====================================================
-- 1. STRIPE SETTINGS (configurações globais)
-- =====================================================
CREATE TABLE public.stripe_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value TEXT,
  description TEXT,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.stripe_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view stripe settings"
ON public.stripe_settings FOR SELECT
TO authenticated
USING (has_role_or_higher('admin'::app_role, auth.uid()));

CREATE POLICY "Admins can insert stripe settings"
ON public.stripe_settings FOR INSERT
TO authenticated
WITH CHECK (has_role_or_higher('admin'::app_role, auth.uid()));

CREATE POLICY "Admins can update stripe settings"
ON public.stripe_settings FOR UPDATE
TO authenticated
USING (has_role_or_higher('admin'::app_role, auth.uid()));

CREATE POLICY "Admins can delete stripe settings"
ON public.stripe_settings FOR DELETE
TO authenticated
USING (has_role_or_higher('admin'::app_role, auth.uid()));

CREATE TRIGGER update_stripe_settings_updated_at
BEFORE UPDATE ON public.stripe_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seeds informativos
INSERT INTO public.stripe_settings (key, description) VALUES
  ('current_account_label', 'Rótulo da conta Stripe atual (ex: CPF Jean, PJ CalculaAi LTDA)'),
  ('legacy_account_label', 'Rótulo da conta Stripe legada (após migração CPF→PJ)'),
  ('legacy_enabled', 'Se "true", painel também consulta STRIPE_SECRET_KEY_LEGACY para mostrar assinantes antigos');

-- =====================================================
-- 2. PAYMENT LINKS (links de checkout)
-- =====================================================
CREATE TABLE public.payment_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_type TEXT NOT NULL,
  billing TEXT NOT NULL,
  url TEXT NOT NULL,
  price_id TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (plan_type, billing)
);

ALTER TABLE public.payment_links ENABLE ROW LEVEL SECURITY;

-- Leitura pública (necessário para checkout funcionar para usuários não-admin)
CREATE POLICY "Anyone can read active payment links"
ON public.payment_links FOR SELECT
TO authenticated, anon
USING (active = true);

CREATE POLICY "Admins can insert payment links"
ON public.payment_links FOR INSERT
TO authenticated
WITH CHECK (has_role_or_higher('admin'::app_role, auth.uid()));

CREATE POLICY "Admins can update payment links"
ON public.payment_links FOR UPDATE
TO authenticated
USING (has_role_or_higher('admin'::app_role, auth.uid()));

CREATE POLICY "Admins can delete payment links"
ON public.payment_links FOR DELETE
TO authenticated
USING (has_role_or_higher('admin'::app_role, auth.uid()));

CREATE TRIGGER update_payment_links_updated_at
BEFORE UPDATE ON public.payment_links
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed com links atuais (CPF) para não quebrar checkout
INSERT INTO public.payment_links (plan_type, billing, url, price_id, notes) VALUES
  ('professional', 'monthly', 'https://buy.stripe.com/aFa28qcpv9Nh6kN7WpcZa02', 'price_1SALJABgdnRO3nnJgi69AKSd', 'Conta CPF inicial'),
  ('professional', 'yearly',  'https://buy.stripe.com/00w7sK617gbF6kNdgJcZa05', 'price_1SAL2uBgdnRO3nnJ7OjBCLUP', 'Conta CPF inicial'),
  ('enterprise',   'monthly', 'https://buy.stripe.com/bJe28qahn1gLeRj7WpcZa03', 'price_1SAL38BgdnRO3nnJNLV1NcT2', 'Conta CPF inicial'),
  ('enterprise',   'yearly',  'https://buy.stripe.com/7sY14m1KRgbF6kN0tXcZa04', 'price_1SAL3KBgdnRO3nnJWRpnlzXy', 'Conta CPF inicial');

-- =====================================================
-- 3. NF SETTINGS (provider de nota fiscal)
-- =====================================================
CREATE TABLE public.nf_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value TEXT,
  description TEXT,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.nf_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view nf settings"
ON public.nf_settings FOR SELECT
TO authenticated
USING (has_role_or_higher('admin'::app_role, auth.uid()));

CREATE POLICY "Admins can insert nf settings"
ON public.nf_settings FOR INSERT
TO authenticated
WITH CHECK (has_role_or_higher('admin'::app_role, auth.uid()));

CREATE POLICY "Admins can update nf settings"
ON public.nf_settings FOR UPDATE
TO authenticated
USING (has_role_or_higher('admin'::app_role, auth.uid()));

CREATE POLICY "Admins can delete nf settings"
ON public.nf_settings FOR DELETE
TO authenticated
USING (has_role_or_higher('admin'::app_role, auth.uid()));

CREATE TRIGGER update_nf_settings_updated_at
BEFORE UPDATE ON public.nf_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seeds
INSERT INTO public.nf_settings (key, value, description) VALUES
  ('enabled', 'false', 'Ativa emissão automática de NFS-e ao receber pagamento'),
  ('provider', '', 'Provider escolhido: nfe_io | focus | enotas | plugnotas'),
  ('environment', 'sandbox', 'Ambiente: sandbox ou production'),
  ('company_cnpj', '', 'CNPJ da empresa emissora'),
  ('company_municipal_registration', '', 'Inscrição municipal'),
  ('service_code', '', 'Código de serviço municipal (ex: 01.05 - Software)'),
  ('service_description', 'Assinatura mensal CalculaAi - Sistema de gestão para confeitaria', 'Descrição padrão do serviço'),
  ('iss_rate', '0', 'Alíquota de ISS (%)');

-- =====================================================
-- 4. NF INVOICES (notas emitidas)
-- =====================================================
CREATE TABLE public.nf_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  stripe_invoice_id TEXT,
  stripe_subscription_id TEXT,
  stripe_customer_id TEXT,
  nf_provider TEXT,
  nf_external_id TEXT,
  nf_number TEXT,
  nf_pdf_url TEXT,
  nf_xml_url TEXT,
  amount NUMERIC(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  issued_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_nf_invoices_user_id ON public.nf_invoices(user_id);
CREATE INDEX idx_nf_invoices_status ON public.nf_invoices(status);
CREATE INDEX idx_nf_invoices_stripe_invoice ON public.nf_invoices(stripe_invoice_id);

ALTER TABLE public.nf_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all nf invoices"
ON public.nf_invoices FOR SELECT
TO authenticated
USING (has_role_or_higher('admin'::app_role, auth.uid()));

CREATE POLICY "Users can view their own nf invoices"
ON public.nf_invoices FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can insert nf invoices"
ON public.nf_invoices FOR INSERT
TO authenticated
WITH CHECK (has_role_or_higher('admin'::app_role, auth.uid()));

CREATE POLICY "Admins can update nf invoices"
ON public.nf_invoices FOR UPDATE
TO authenticated
USING (has_role_or_higher('admin'::app_role, auth.uid()));

CREATE TRIGGER update_nf_invoices_updated_at
BEFORE UPDATE ON public.nf_invoices
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();