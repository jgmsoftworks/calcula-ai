
DO $$ BEGIN
  CREATE TYPE public.producao_status AS ENUM ('a_fazer', 'em_producao', 'feito');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE public.producao_tarefas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  data_producao date NOT NULL,
  titulo text NOT NULL,
  receita_id uuid REFERENCES public.receitas(id) ON DELETE SET NULL,
  quantidade numeric,
  funcionario_id uuid NOT NULL REFERENCES public.folha_pagamento(id) ON DELETE RESTRICT,
  status public.producao_status NOT NULL DEFAULT 'a_fazer',
  observacoes text,
  ordem integer NOT NULL DEFAULT 0,
  iniciado_em timestamptz,
  concluido_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.producao_tarefas TO authenticated;
GRANT ALL ON public.producao_tarefas TO service_role;

ALTER TABLE public.producao_tarefas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own producao_tarefas"
ON public.producao_tarefas FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_producao_tarefas_user_date ON public.producao_tarefas(user_id, data_producao);

CREATE TRIGGER trg_producao_tarefas_updated
BEFORE UPDATE ON public.producao_tarefas
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.producao_tarefas_historico (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  tarefa_id uuid NOT NULL REFERENCES public.producao_tarefas(id) ON DELETE CASCADE,
  de_status public.producao_status,
  para_status public.producao_status NOT NULL,
  movido_em timestamptz NOT NULL DEFAULT now(),
  movido_por uuid
);

GRANT SELECT, INSERT ON public.producao_tarefas_historico TO authenticated;
GRANT ALL ON public.producao_tarefas_historico TO service_role;

ALTER TABLE public.producao_tarefas_historico ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own producao_historico"
ON public.producao_tarefas_historico FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users insert own producao_historico"
ON public.producao_tarefas_historico FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_producao_historico_tarefa ON public.producao_tarefas_historico(tarefa_id, movido_em);
