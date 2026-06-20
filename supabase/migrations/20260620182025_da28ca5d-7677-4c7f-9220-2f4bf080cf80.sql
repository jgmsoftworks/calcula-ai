
CREATE TABLE public.perdas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('produto','receita')),
  produto_id UUID REFERENCES public.produtos(id) ON DELETE SET NULL,
  receita_id UUID REFERENCES public.receitas(id) ON DELETE SET NULL,
  nome_item TEXT NOT NULL,
  quantidade NUMERIC NOT NULL CHECK (quantidade > 0),
  custo_unitario NUMERIC NOT NULL DEFAULT 0,
  custo_total NUMERIC NOT NULL DEFAULT 0,
  motivo TEXT NOT NULL,
  motivo_outro TEXT,
  observacao TEXT,
  responsavel TEXT,
  data_perda TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.perdas TO authenticated;
GRANT ALL ON public.perdas TO service_role;

ALTER TABLE public.perdas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own perdas select" ON public.perdas FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users manage own perdas insert" ON public.perdas FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users manage own perdas update" ON public.perdas FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users manage own perdas delete" ON public.perdas FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX idx_perdas_user_data ON public.perdas(user_id, data_perda DESC);
CREATE INDEX idx_perdas_produto ON public.perdas(produto_id);
CREATE INDEX idx_perdas_receita ON public.perdas(receita_id);

CREATE TRIGGER update_perdas_updated_at
BEFORE UPDATE ON public.perdas
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
