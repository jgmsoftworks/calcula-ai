-- Tabela de registro de consentimentos LGPD (versionada e auditável)
CREATE TABLE IF NOT EXISTS public.user_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID, -- NULL quando consentimento dado antes do login (cookies pré-cadastro)
  anonymous_id TEXT, -- identificador anônimo do navegador (localStorage uuid) quando user_id é null
  consent_type TEXT NOT NULL CHECK (consent_type IN (
    'cookies_necessary',
    'cookies_analytics',
    'cookies_marketing',
    'terms_of_use',
    'privacy_policy',
    'marketing_emails'
  )),
  accepted BOOLEAN NOT NULL,
  version TEXT NOT NULL DEFAULT '1.0.0',
  ip TEXT,
  user_agent TEXT,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_consents_user_id ON public.user_consents(user_id);
CREATE INDEX IF NOT EXISTS idx_user_consents_anonymous_id ON public.user_consents(anonymous_id);
CREATE INDEX IF NOT EXISTS idx_user_consents_type ON public.user_consents(consent_type);

ALTER TABLE public.user_consents ENABLE ROW LEVEL SECURITY;

-- Usuário autenticado pode ver os próprios registros
CREATE POLICY "Usuarios podem ver seus proprios consentimentos"
ON public.user_consents
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Usuário autenticado pode inserir registros vinculados ao próprio user_id
CREATE POLICY "Usuarios podem registrar seus proprios consentimentos"
ON public.user_consents
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Usuários anônimos podem inserir registros de cookies pré-login (sem user_id)
CREATE POLICY "Anonimos podem registrar consentimento de cookies"
ON public.user_consents
FOR INSERT
TO anon
WITH CHECK (
  user_id IS NULL
  AND consent_type IN ('cookies_necessary', 'cookies_analytics', 'cookies_marketing')
);

-- Admins podem ver tudo (auditoria)
CREATE POLICY "Admins podem ver todos os consentimentos"
ON public.user_consents
FOR SELECT
TO authenticated
USING (has_role_or_higher('admin'::app_role));

-- Sem UPDATE/DELETE para autenticados/anon: registros são imutáveis (prova jurídica)
-- Apenas service_role pode atualizar revoked_at via edge function
CREATE POLICY "Service role pode atualizar revogacao"
ON public.user_consents
FOR UPDATE
TO service_role
USING (true)
WITH CHECK (true);
