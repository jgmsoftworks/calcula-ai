ALTER TABLE public.producao_tarefas_historico
  ADD COLUMN IF NOT EXISTS evento_tipo text NOT NULL DEFAULT 'status'
    CHECK (evento_tipo IN ('status', 'responsavel')),
  ADD COLUMN IF NOT EXISTS funcionario_anterior_id uuid
    REFERENCES public.folha_pagamento(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS funcionario_novo_id uuid
    REFERENCES public.folha_pagamento(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.registrar_troca_responsavel_producao()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF OLD.funcionario_id IS DISTINCT FROM NEW.funcionario_id THEN
    INSERT INTO public.producao_tarefas_historico (
      user_id,
      tarefa_id,
      de_status,
      para_status,
      movido_por,
      origem,
      evento_tipo,
      funcionario_anterior_id,
      funcionario_novo_id
    ) VALUES (
      OLD.user_id,
      OLD.id,
      OLD.status,
      NEW.status,
      auth.uid(),
      'app',
      'responsavel',
      OLD.funcionario_id,
      NEW.funcionario_id
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_producao_tarefas_responsavel_historico
  ON public.producao_tarefas;

CREATE TRIGGER trg_producao_tarefas_responsavel_historico
AFTER UPDATE OF funcionario_id ON public.producao_tarefas
FOR EACH ROW
EXECUTE FUNCTION public.registrar_troca_responsavel_producao();

CREATE INDEX IF NOT EXISTS idx_producao_historico_evento
  ON public.producao_tarefas_historico(tarefa_id, evento_tipo, movido_em DESC);

