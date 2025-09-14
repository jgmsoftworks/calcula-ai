-- Criar tabela principal de receitas
CREATE TABLE public.receitas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  nome TEXT NOT NULL,
  tempo_preparo_total INTEGER DEFAULT 0,
  tempo_preparo_mao_obra INTEGER DEFAULT 0,
  tipo_produto TEXT,
  rendimento_valor NUMERIC,
  rendimento_unidade TEXT,
  observacoes TEXT,
  status TEXT DEFAULT 'rascunho',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de ingredientes da receita
CREATE TABLE public.receita_ingredientes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  receita_id UUID NOT NULL REFERENCES public.receitas(id) ON DELETE CASCADE,
  produto_id UUID NOT NULL,
  nome TEXT NOT NULL,
  quantidade NUMERIC NOT NULL,
  unidade TEXT NOT NULL,
  custo_unitario NUMERIC DEFAULT 0,
  custo_total NUMERIC DEFAULT 0,
  marcas TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de sub-receitas
CREATE TABLE public.receita_sub_receitas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  receita_id UUID NOT NULL REFERENCES public.receitas(id) ON DELETE CASCADE,
  sub_receita_id UUID NOT NULL REFERENCES public.receitas(id),
  nome TEXT NOT NULL,
  quantidade NUMERIC NOT NULL,
  unidade TEXT NOT NULL,
  custo_unitario NUMERIC DEFAULT 0,
  custo_total NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de embalagens da receita
CREATE TABLE public.receita_embalagens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  receita_id UUID NOT NULL REFERENCES public.receitas(id) ON DELETE CASCADE,
  produto_id UUID NOT NULL,
  nome TEXT NOT NULL,
  quantidade NUMERIC NOT NULL,
  unidade TEXT NOT NULL,
  custo_unitario NUMERIC DEFAULT 0,
  custo_total NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de mão de obra da receita
CREATE TABLE public.receita_mao_obra (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  receita_id UUID NOT NULL REFERENCES public.receitas(id) ON DELETE CASCADE,
  funcionario_id UUID NOT NULL,
  funcionario_nome TEXT NOT NULL,
  funcionario_cargo TEXT NOT NULL,
  custo_por_hora NUMERIC NOT NULL,
  tempo NUMERIC NOT NULL,
  unidade_tempo TEXT DEFAULT 'minutos',
  valor_total NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS nas tabelas
ALTER TABLE public.receitas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receita_ingredientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receita_sub_receitas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receita_embalagens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receita_mao_obra ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para receitas
CREATE POLICY "Usuários podem ver suas próprias receitas"
ON public.receitas FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem criar suas próprias receitas"
ON public.receitas FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar suas próprias receitas"
ON public.receitas FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem deletar suas próprias receitas"
ON public.receitas FOR DELETE
USING (auth.uid() = user_id);

-- Políticas RLS para receita_ingredientes
CREATE POLICY "Usuários podem ver ingredientes de suas receitas"
ON public.receita_ingredientes FOR SELECT
USING (EXISTS (SELECT 1 FROM public.receitas WHERE receitas.id = receita_ingredientes.receita_id AND receitas.user_id = auth.uid()));

CREATE POLICY "Usuários podem criar ingredientes em suas receitas"
ON public.receita_ingredientes FOR INSERT
WITH CHECK (EXISTS (SELECT 1 FROM public.receitas WHERE receitas.id = receita_ingredientes.receita_id AND receitas.user_id = auth.uid()));

CREATE POLICY "Usuários podem atualizar ingredientes de suas receitas"
ON public.receita_ingredientes FOR UPDATE
USING (EXISTS (SELECT 1 FROM public.receitas WHERE receitas.id = receita_ingredientes.receita_id AND receitas.user_id = auth.uid()));

CREATE POLICY "Usuários podem deletar ingredientes de suas receitas"
ON public.receita_ingredientes FOR DELETE
USING (EXISTS (SELECT 1 FROM public.receitas WHERE receitas.id = receita_ingredientes.receita_id AND receitas.user_id = auth.uid()));

-- Políticas RLS para receita_sub_receitas
CREATE POLICY "Usuários podem ver sub-receitas de suas receitas"
ON public.receita_sub_receitas FOR SELECT
USING (EXISTS (SELECT 1 FROM public.receitas WHERE receitas.id = receita_sub_receitas.receita_id AND receitas.user_id = auth.uid()));

CREATE POLICY "Usuários podem criar sub-receitas em suas receitas"
ON public.receita_sub_receitas FOR INSERT
WITH CHECK (EXISTS (SELECT 1 FROM public.receitas WHERE receitas.id = receita_sub_receitas.receita_id AND receitas.user_id = auth.uid()));

CREATE POLICY "Usuários podem atualizar sub-receitas de suas receitas"
ON public.receita_sub_receitas FOR UPDATE
USING (EXISTS (SELECT 1 FROM public.receitas WHERE receitas.id = receita_sub_receitas.receita_id AND receitas.user_id = auth.uid()));

CREATE POLICY "Usuários podem deletar sub-receitas de suas receitas"
ON public.receita_sub_receitas FOR DELETE
USING (EXISTS (SELECT 1 FROM public.receitas WHERE receitas.id = receita_sub_receitas.receita_id AND receitas.user_id = auth.uid()));

-- Políticas RLS para receita_embalagens
CREATE POLICY "Usuários podem ver embalagens de suas receitas"
ON public.receita_embalagens FOR SELECT
USING (EXISTS (SELECT 1 FROM public.receitas WHERE receitas.id = receita_embalagens.receita_id AND receitas.user_id = auth.uid()));

CREATE POLICY "Usuários podem criar embalagens em suas receitas"
ON public.receita_embalagens FOR INSERT
WITH CHECK (EXISTS (SELECT 1 FROM public.receitas WHERE receitas.id = receita_embalagens.receita_id AND receitas.user_id = auth.uid()));

CREATE POLICY "Usuários podem atualizar embalagens de suas receitas"
ON public.receita_embalagens FOR UPDATE
USING (EXISTS (SELECT 1 FROM public.receitas WHERE receitas.id = receita_embalagens.receita_id AND receitas.user_id = auth.uid()));

CREATE POLICY "Usuários podem deletar embalagens de suas receitas"
ON public.receita_embalagens FOR DELETE
USING (EXISTS (SELECT 1 FROM public.receitas WHERE receitas.id = receita_embalagens.receita_id AND receitas.user_id = auth.uid()));

-- Políticas RLS para receita_mao_obra
CREATE POLICY "Usuários podem ver mão de obra de suas receitas"
ON public.receita_mao_obra FOR SELECT
USING (EXISTS (SELECT 1 FROM public.receitas WHERE receitas.id = receita_mao_obra.receita_id AND receitas.user_id = auth.uid()));

CREATE POLICY "Usuários podem criar mão de obra em suas receitas"
ON public.receita_mao_obra FOR INSERT
WITH CHECK (EXISTS (SELECT 1 FROM public.receitas WHERE receitas.id = receita_mao_obra.receita_id AND receitas.user_id = auth.uid()));

CREATE POLICY "Usuários podem atualizar mão de obra de suas receitas"
ON public.receita_mao_obra FOR UPDATE
USING (EXISTS (SELECT 1 FROM public.receitas WHERE receitas.id = receita_mao_obra.receita_id AND receitas.user_id = auth.uid()));

CREATE POLICY "Usuários podem deletar mão de obra de suas receitas"
ON public.receita_mao_obra FOR DELETE
USING (EXISTS (SELECT 1 FROM public.receitas WHERE receitas.id = receita_mao_obra.receita_id AND receitas.user_id = auth.uid()));

-- Triggers para atualizar updated_at
CREATE TRIGGER update_receitas_updated_at
  BEFORE UPDATE ON public.receitas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_receita_ingredientes_updated_at
  BEFORE UPDATE ON public.receita_ingredientes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_receita_sub_receitas_updated_at
  BEFORE UPDATE ON public.receita_sub_receitas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_receita_embalagens_updated_at
  BEFORE UPDATE ON public.receita_embalagens
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_receita_mao_obra_updated_at
  BEFORE UPDATE ON public.receita_mao_obra
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();