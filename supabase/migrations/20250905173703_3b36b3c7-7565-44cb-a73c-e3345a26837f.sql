-- Create categorias_despesas_fixas table
CREATE TABLE public.categorias_despesas_fixas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  nome TEXT NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.categorias_despesas_fixas ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Usuários podem ver suas próprias categorias de despesas fixas" 
ON public.categorias_despesas_fixas 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem criar suas próprias categorias de despesas fixas" 
ON public.categorias_despesas_fixas 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar suas próprias categorias de despesas fixas" 
ON public.categorias_despesas_fixas 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem deletar suas próprias categorias de despesas fixas" 
ON public.categorias_despesas_fixas 
FOR DELETE 
USING (auth.uid() = user_id);

-- Add trigger for automatic timestamp updates
CREATE TRIGGER update_categorias_despesas_fixas_updated_at
BEFORE UPDATE ON public.categorias_despesas_fixas
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add categoria_id field to despesas_fixas table
ALTER TABLE public.despesas_fixas 
ADD COLUMN categoria_id UUID REFERENCES public.categorias_despesas_fixas(id);

-- Create index for better performance
CREATE INDEX idx_despesas_fixas_categoria ON public.despesas_fixas(categoria_id);
CREATE INDEX idx_categorias_despesas_fixas_user ON public.categorias_despesas_fixas(user_id);