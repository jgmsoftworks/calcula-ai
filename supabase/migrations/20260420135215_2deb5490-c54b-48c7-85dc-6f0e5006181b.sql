-- Tabela de tarefas avulsas (não-receitas)
CREATE TABLE public.tarefas_avulsas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  nome TEXT NOT NULL,
  descricao TEXT,
  tempo_estimado_minutos INTEGER DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.tarefas_avulsas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own tarefas_avulsas" ON public.tarefas_avulsas
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own tarefas_avulsas" ON public.tarefas_avulsas
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own tarefas_avulsas" ON public.tarefas_avulsas
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own tarefas_avulsas" ON public.tarefas_avulsas
  FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER trg_tarefas_avulsas_updated
  BEFORE UPDATE ON public.tarefas_avulsas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Tabela de ordens de produção
CREATE TABLE public.ordens_producao (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  numero_sequencial INTEGER NOT NULL,
  titulo TEXT NOT NULL,
  descricao TEXT,
  data_prevista DATE,
  status TEXT NOT NULL DEFAULT 'pendente',
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ordens_producao ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own ordens" ON public.ordens_producao
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own ordens" ON public.ordens_producao
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own ordens" ON public.ordens_producao
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own ordens" ON public.ordens_producao
  FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER trg_ordens_producao_updated
  BEFORE UPDATE ON public.ordens_producao
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Função para gerar próximo número sequencial
CREATE OR REPLACE FUNCTION public.gerar_proximo_numero_op(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  proximo INTEGER;
BEGIN
  SELECT COALESCE(MAX(numero_sequencial), 0) + 1 INTO proximo
  FROM public.ordens_producao WHERE user_id = p_user_id;
  RETURN proximo;
END;
$$;

-- Tabela de itens da ordem de produção
CREATE TABLE public.ordens_producao_itens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ordem_id UUID NOT NULL REFERENCES public.ordens_producao(id) ON DELETE CASCADE,
  tipo_item TEXT NOT NULL, -- 'receita' ou 'tarefa_avulsa'
  receita_id UUID REFERENCES public.receitas(id) ON DELETE SET NULL,
  tarefa_avulsa_id UUID REFERENCES public.tarefas_avulsas(id) ON DELETE SET NULL,
  descricao_customizada TEXT,
  quantidade NUMERIC DEFAULT 1,
  funcionario_id UUID REFERENCES public.folha_pagamento(id) ON DELETE SET NULL,
  funcionario_nome TEXT,
  hora_inicio_prevista TIMESTAMPTZ,
  hora_fim_prevista TIMESTAMPTZ,
  hora_inicio_real TIMESTAMPTZ,
  hora_fim_real TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pendente',
  observacoes TEXT,
  ordem INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ordens_producao_itens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view itens of own ordens" ON public.ordens_producao_itens
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.ordens_producao op
    WHERE op.id = ordens_producao_itens.ordem_id AND op.user_id = auth.uid()
  ));
CREATE POLICY "Users insert itens in own ordens" ON public.ordens_producao_itens
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM public.ordens_producao op
    WHERE op.id = ordens_producao_itens.ordem_id AND op.user_id = auth.uid()
  ));
CREATE POLICY "Users update itens of own ordens" ON public.ordens_producao_itens
  FOR UPDATE USING (EXISTS (
    SELECT 1 FROM public.ordens_producao op
    WHERE op.id = ordens_producao_itens.ordem_id AND op.user_id = auth.uid()
  ));
CREATE POLICY "Users delete itens of own ordens" ON public.ordens_producao_itens
  FOR DELETE USING (EXISTS (
    SELECT 1 FROM public.ordens_producao op
    WHERE op.id = ordens_producao_itens.ordem_id AND op.user_id = auth.uid()
  ));

CREATE TRIGGER trg_ordens_producao_itens_updated
  BEFORE UPDATE ON public.ordens_producao_itens
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_op_user ON public.ordens_producao(user_id);
CREATE INDEX idx_op_itens_ordem ON public.ordens_producao_itens(ordem_id);