-- Criar tabela para configurações do usuário
CREATE TABLE public.user_configurations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type VARCHAR(50) NOT NULL, -- 'lista_produtos', 'dashboard', etc
  configuration JSONB NOT NULL, -- JSON com as configurações
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, type)
);

-- Habilitar RLS na tabela
ALTER TABLE public.user_configurations ENABLE ROW LEVEL SECURITY;

-- Criar políticas RLS
CREATE POLICY "Usuários podem ver suas próprias configurações"
ON public.user_configurations
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem criar suas próprias configurações"
ON public.user_configurations
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar suas próprias configurações"
ON public.user_configurations
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem deletar suas próprias configurações"
ON public.user_configurations
FOR DELETE
USING (auth.uid() = user_id);

-- Criar trigger para updated_at
CREATE TRIGGER update_user_configurations_updated_at
  BEFORE UPDATE ON public.user_configurations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();