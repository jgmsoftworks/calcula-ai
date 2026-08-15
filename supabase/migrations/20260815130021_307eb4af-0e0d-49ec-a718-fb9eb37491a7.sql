CREATE TABLE public.planos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  nome_publico text NOT NULL,
  descricao text,
  preco_centavos integer NOT NULL DEFAULT 0,
  moeda text NOT NULL DEFAULT 'brl',
  periodicidade text NOT NULL DEFAULT 'month',
  stripe_product_id text,
  stripe_price_id text,
  versao_preco integer NOT NULL DEFAULT 1,
  ativo boolean NOT NULL DEFAULT true,
  ordem integer NOT NULL DEFAULT 0,
  limites jsonb NOT NULL DEFAULT '{}'::jsonb,
  features jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

GRANT SELECT ON public.planos TO anon;
GRANT SELECT ON public.planos TO authenticated;
GRANT ALL ON public.planos TO service_role;

ALTER TABLE public.planos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Planos ativos visiveis para todos"
ON public.planos FOR SELECT
USING (ativo = true OR public.has_role_or_higher('admin'::app_role, auth.uid()));

CREATE POLICY "Somente admin altera planos"
ON public.planos FOR ALL
USING (public.has_role_or_higher('admin'::app_role, auth.uid()))
WITH CHECK (public.has_role_or_higher('admin'::app_role, auth.uid()));

CREATE TRIGGER update_planos_updated_at
BEFORE UPDATE ON public.planos
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.planos_precos_historico (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plano_slug text NOT NULL,
  preco_centavos integer NOT NULL,
  moeda text NOT NULL DEFAULT 'brl',
  periodicidade text NOT NULL DEFAULT 'month',
  stripe_price_id text,
  stripe_product_id text,
  versao_preco integer NOT NULL DEFAULT 1,
  vigente_de timestamptz NOT NULL DEFAULT now(),
  vigente_ate timestamptz,
  criado_por uuid,
  observacao text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.planos_precos_historico TO anon;
GRANT SELECT ON public.planos_precos_historico TO authenticated;
GRANT ALL ON public.planos_precos_historico TO service_role;

ALTER TABLE public.planos_precos_historico ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Historico de precos visivel"
ON public.planos_precos_historico FOR SELECT
USING (true);

CREATE POLICY "Somente admin altera historico de precos"
ON public.planos_precos_historico FOR ALL
USING (public.has_role_or_higher('admin'::app_role, auth.uid()))
WITH CHECK (public.has_role_or_higher('admin'::app_role, auth.uid()));

CREATE INDEX idx_planos_precos_historico_slug ON public.planos_precos_historico(plano_slug, vigente_de DESC);

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz,
  ADD COLUMN IF NOT EXISTS grace_period_ends_at timestamptz;

INSERT INTO public.planos (slug, nome_publico, descricao, preco_centavos, stripe_product_id, stripe_price_id, ordem, limites, features) VALUES
('lite', 'Lite', 'Ideal para quem está começando a precificar.', 990, 'prod_V4qsXy3ZpOgaxz', 'price_1U4hB5BnxFLGYBYfYT8G21xY', 1,
 '{"produtos":30,"receitas":5,"markups":1,"movimentacoes":-1,"pdf_exports":0}'::jsonb,
 '["Máx. 30 cadastros de matéria-prima","Máx. 5 receitas","1 bloco de markup","Movimentação de estoque","Folha de pagamento liberada"]'::jsonb),
('professional', 'Profissional', 'Para quem já produz em escala e precisa de mais receitas.', 2990, 'prod_V4qtN5kjHOLaSy', 'price_1U4hBPBnxFLGYBYfDTZkdigL', 2,
 '{"produtos":-1,"receitas":60,"markups":3,"movimentacoes":-1,"pdf_exports":80}'::jsonb,
 '["Matéria-prima ilimitada","Máx. 60 receitas","Até 3 blocos de markup","Movimentação de estoque","80 impressões de ficha técnica/mês"]'::jsonb),
('enterprise', 'Empresarial', 'Tudo ilimitado, para operações completas.', 4990, 'prod_V4qt2HaAKntwRv', 'price_1U4hBUBnxFLGYBYfFyA5pqbN', 3,
 '{"produtos":-1,"receitas":-1,"markups":-1,"movimentacoes":-1,"pdf_exports":-1}'::jsonb,
 '["Tudo ilimitado","Receitas ilimitadas","Blocos de markup ilimitados","Impressões ilimitadas","Suporte prioritário"]'::jsonb);

INSERT INTO public.planos_precos_historico (plano_slug, preco_centavos, periodicidade, stripe_price_id, versao_preco, vigente_de, vigente_ate, observacao) VALUES
('professional', 4990, 'month', 'price_1SALJABgdnRO3nnJgi69AKSd', 0, now() - interval '1 year', now(), 'Preço legado mensal (conta anterior)'),
('professional', 47880, 'year', 'price_1SAL2uBgdnRO3nnJ7OjBCLUP', 0, now() - interval '1 year', now(), 'Preço legado anual (conta anterior)'),
('enterprise', 8990, 'month', 'price_1SAL38BgdnRO3nnJNLV1NcT2', 0, now() - interval '1 year', now(), 'Preço legado mensal (conta anterior)'),
('enterprise', 83880, 'year', 'price_1SAL3KBgdnRO3nnJWRpnlzXy', 0, now() - interval '1 year', now(), 'Preço legado anual (conta anterior)'),
('lite', 990, 'month', 'price_1U4hB5BnxFLGYBYfYT8G21xY', 1, now(), NULL, 'Preço atual'),
('professional', 2990, 'month', 'price_1U4hBPBnxFLGYBYfDTZkdigL', 1, now(), NULL, 'Preço atual'),
('enterprise', 4990, 'month', 'price_1U4hBUBnxFLGYBYfFyA5pqbN', 1, now(), NULL, 'Preço atual');

CREATE OR REPLACE FUNCTION public.check_plan_limits(user_uuid uuid, feature_type text, feature_count integer DEFAULT 1)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  user_plan text;
  plan_slug text;
  current_count integer;
  max_allowed integer;
  limites jsonb;
  result jsonb;
BEGIN
  SELECT plan INTO user_plan FROM profiles WHERE user_id = user_uuid;

  IF user_plan IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'user_not_found');
  END IF;

  plan_slug := CASE WHEN user_plan = 'free' THEN 'lite' ELSE user_plan END;

  SELECT p.limites INTO limites FROM planos p WHERE p.slug = plan_slug;
  IF limites IS NULL THEN
    SELECT p.limites INTO limites FROM planos p WHERE p.slug = 'lite';
  END IF;

  max_allowed := COALESCE((limites ->> feature_type)::integer, 0);

  CASE feature_type
    WHEN 'produtos' THEN
      SELECT COUNT(*) INTO current_count FROM produtos
        WHERE user_id = user_uuid AND ativo = true;
    WHEN 'receitas' THEN
      SELECT COUNT(*) INTO current_count FROM receitas
        WHERE user_id = user_uuid;
    WHEN 'markups' THEN
      SELECT COUNT(*) INTO current_count FROM markups
        WHERE user_id = user_uuid
          AND ativo = true
          AND COALESCE(tipo, 'normal') IS DISTINCT FROM 'sub_receita';
    WHEN 'movimentacoes' THEN
      current_count := 0;
    WHEN 'pdf_exports' THEN
      PERFORM reset_monthly_pdf_counter();
      SELECT pdf_exports_count INTO current_count FROM profiles
        WHERE user_id = user_uuid;
    ELSE
      RETURN jsonb_build_object('allowed', false, 'reason', 'invalid_feature_type');
  END CASE;

  IF max_allowed = -1 OR (COALESCE(current_count, 0) + feature_count) <= max_allowed THEN
    result := jsonb_build_object(
      'allowed', true,
      'current_count', COALESCE(current_count, 0),
      'max_allowed', max_allowed,
      'plan', plan_slug
    );
  ELSE
    result := jsonb_build_object(
      'allowed', false,
      'reason', 'limit_exceeded',
      'current_count', COALESCE(current_count, 0),
      'max_allowed', max_allowed,
      'plan', plan_slug
    );
  END IF;

  RETURN result;
END;
$function$;