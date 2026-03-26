-- Add new commission columns to affiliates table
ALTER TABLE public.affiliates 
  ADD COLUMN IF NOT EXISTS commission_first_sale_pct numeric NOT NULL DEFAULT 40,
  ADD COLUMN IF NOT EXISTS commission_recurring_pct numeric NOT NULL DEFAULT 20,
  ADD COLUMN IF NOT EXISTS support_hourly_rate numeric NOT NULL DEFAULT 10;

-- Create vendedor_suporte_horas table
CREATE TABLE IF NOT EXISTS public.vendedor_suporte_horas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id uuid NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  customer_email text NOT NULL,
  customer_name text,
  data date NOT NULL DEFAULT CURRENT_DATE,
  horas numeric NOT NULL DEFAULT 0,
  descricao text,
  valor_hora numeric NOT NULL DEFAULT 10,
  valor_total numeric GENERATED ALWAYS AS (horas * valor_hora) STORED,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.vendedor_suporte_horas ENABLE ROW LEVEL SECURITY;

-- Only admins can manage support hours
CREATE POLICY "Apenas admins podem gerenciar horas de suporte"
  ON public.vendedor_suporte_horas
  FOR ALL
  TO authenticated
  USING (has_role_or_higher('admin'::app_role))
  WITH CHECK (has_role_or_higher('admin'::app_role));

-- Add updated_at trigger
CREATE TRIGGER update_vendedor_suporte_horas_updated_at
  BEFORE UPDATE ON public.vendedor_suporte_horas
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();