-- Criar tabela de marcas
CREATE TABLE public.marcas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  nome TEXT NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, nome)
);

-- Enable Row Level Security
ALTER TABLE public.marcas ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for marcas
CREATE POLICY "Usuários podem ver suas próprias marcas" 
ON public.marcas 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem criar suas próprias marcas" 
ON public.marcas 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar suas próprias marcas" 
ON public.marcas 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem deletar suas próprias marcas" 
ON public.marcas 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_marcas_updated_at
BEFORE UPDATE ON public.marcas
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();