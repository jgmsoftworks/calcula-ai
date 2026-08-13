CREATE TABLE public.producao_links_compartilhados (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  data_producao date NOT NULL,
  token_hash text NOT NULL UNIQUE,
  expira_em timestamptz NOT NULL,
  revogado_em timestamptz,
  ultimo_acesso_em timestamptz,
  janela_requisicoes_inicio timestamptz NOT NULL DEFAULT now(),
  janela_requisicoes_total integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT producao_link_expiracao_valida CHECK (expira_em > created_at)
);

ALTER TABLE public.producao_links_compartilhados ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON public.producao_links_compartilhados TO authenticated;
GRANT ALL ON public.producao_links_compartilhados TO service_role;
REVOKE ALL ON public.producao_links_compartilhados FROM anon;

CREATE POLICY "Users read own production links"
ON public.producao_links_compartilhados FOR SELECT
TO authenticated
USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users create own production links"
ON public.producao_links_compartilhados FOR INSERT
TO authenticated
WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users update own production links"
ON public.producao_links_compartilhados FOR UPDATE
TO authenticated
USING ((SELECT auth.uid()) = user_id)
WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE INDEX idx_producao_links_owner_date
  ON public.producao_links_compartilhados(user_id, data_producao, created_at DESC);

CREATE UNIQUE INDEX idx_producao_links_active_day
  ON public.producao_links_compartilhados(user_id, data_producao)
  WHERE revogado_em IS NULL;

ALTER TABLE public.producao_tarefas_historico
  ADD COLUMN IF NOT EXISTS origem text NOT NULL DEFAULT 'app'
  CHECK (origem IN ('app', 'link_compartilhado'));

COMMENT ON TABLE public.producao_links_compartilhados IS
  'Tokens temporarios, armazenados somente como hash, para operacao compartilhada da producao diaria.';

