
-- Tabela de fechamentos mensais de estoque
CREATE TABLE public.estoque_fechamentos_mensais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  competencia text NOT NULL,
  valor_estoque_fechamento numeric NOT NULL DEFAULT 0,
  qtd_produtos_ativos integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, competencia)
);

ALTER TABLE public.estoque_fechamentos_mensais ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver seus fechamentos"
  ON public.estoque_fechamentos_mensais
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem inserir seus fechamentos"
  ON public.estoque_fechamentos_mensais
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar seus fechamentos"
  ON public.estoque_fechamentos_mensais
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);
