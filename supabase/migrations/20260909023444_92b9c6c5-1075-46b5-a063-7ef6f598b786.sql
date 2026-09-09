ALTER TABLE public.planos
  ADD COLUMN IF NOT EXISTS preco_anual_centavos integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stripe_price_id_anual text,
  ADD COLUMN IF NOT EXISTS versao_preco_anual integer NOT NULL DEFAULT 1;