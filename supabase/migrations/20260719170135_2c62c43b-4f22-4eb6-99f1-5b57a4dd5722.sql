ALTER TABLE public.producao_tarefas
  ADD COLUMN IF NOT EXISTS inicio_previsto timestamptz,
  ADD COLUMN IF NOT EXISTS fim_previsto timestamptz;