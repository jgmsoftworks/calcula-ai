
-- Áreas de produção
CREATE TABLE public.producao_areas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  nome text NOT NULL,
  cor text NOT NULL DEFAULT '#3b82f6',
  ordem integer NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.producao_areas TO authenticated;
GRANT ALL ON public.producao_areas TO service_role;
ALTER TABLE public.producao_areas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own areas" ON public.producao_areas FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_producao_areas_updated BEFORE UPDATE ON public.producao_areas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Tarefas recorrentes (templates definidos no Cronograma)
CREATE TABLE public.producao_tarefas_recorrentes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  area_id uuid NOT NULL REFERENCES public.producao_areas(id) ON DELETE CASCADE,
  titulo text NOT NULL,
  receita_id uuid REFERENCES public.receitas(id) ON DELETE SET NULL,
  quantidade numeric,
  funcionario_id uuid NOT NULL REFERENCES public.folha_pagamento(id) ON DELETE RESTRICT,
  dias_semana integer[] NOT NULL DEFAULT '{}',
  hora_inicio time,
  hora_fim time,
  data_inicio date,
  data_fim date,
  observacoes text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.producao_tarefas_recorrentes TO authenticated;
GRANT ALL ON public.producao_tarefas_recorrentes TO service_role;
ALTER TABLE public.producao_tarefas_recorrentes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own recorrentes" ON public.producao_tarefas_recorrentes FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_producao_recorrentes_updated BEFORE UPDATE ON public.producao_tarefas_recorrentes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Adicionar area_id e recorrente_id em producao_tarefas
ALTER TABLE public.producao_tarefas
  ADD COLUMN area_id uuid REFERENCES public.producao_areas(id) ON DELETE SET NULL,
  ADD COLUMN recorrente_id uuid REFERENCES public.producao_tarefas_recorrentes(id) ON DELETE SET NULL;

CREATE INDEX idx_producao_tarefas_recorrente ON public.producao_tarefas(recorrente_id, data_producao);
CREATE INDEX idx_producao_tarefas_area ON public.producao_tarefas(area_id);
