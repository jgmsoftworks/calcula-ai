-- 1. Fechar tudo para visitantes
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM anon;

-- 2. Reabrir apenas o necessário para páginas públicas
GRANT SELECT ON public.planos TO anon;
GRANT SELECT ON public.payment_links TO anon;
GRANT INSERT ON public.user_consents TO anon;

-- 3. Histórico de preços: somente usuários logados
DROP POLICY IF EXISTS "Historico de precos visivel" ON public.planos_precos_historico;
CREATE POLICY "Historico de precos visivel para autenticados"
ON public.planos_precos_historico FOR SELECT TO authenticated USING (true);

-- 4. Avaliações de fornecedores: somente usuários logados
DROP POLICY IF EXISTS "Todos podem ver avaliações" ON public.avaliacoes_fornecedores;
CREATE POLICY "Autenticados podem ver avaliações"
ON public.avaliacoes_fornecedores FOR SELECT TO authenticated USING (true);

-- 5. Promoções: somente usuários logados
DROP POLICY IF EXISTS "Promoções visíveis para todos autenticados" ON public.promocoes_fornecedores;
CREATE POLICY "Promoções visíveis para autenticados"
ON public.promocoes_fornecedores FOR SELECT TO authenticated
USING (ativa = true AND data_fim > now());

-- 6. CSP: gravação apenas pelo servidor
DROP POLICY IF EXISTS "Service role can insert CSP violations" ON public.csp_violations;
CREATE POLICY "Somente service role insere CSP violations"
ON public.csp_violations FOR INSERT TO service_role WITH CHECK (true);

-- 7. Tabela de limite de chamadas (uso exclusivo do servidor)
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bucket text NOT NULL,
  identifier text NOT NULL,
  count integer NOT NULL DEFAULT 0,
  window_start timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (bucket, identifier)
);

GRANT ALL ON public.rate_limits TO service_role;

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Somente service role gerencia rate limits"
ON public.rate_limits FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS rate_limits_window_idx ON public.rate_limits (window_start);

CREATE TRIGGER update_rate_limits_updated_at
BEFORE UPDATE ON public.rate_limits
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();