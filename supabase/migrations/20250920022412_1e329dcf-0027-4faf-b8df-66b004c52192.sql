-- Create table for recipe preparation steps
CREATE TABLE public.receita_passos_preparo (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  receita_id UUID NOT NULL,
  ordem INTEGER NOT NULL,
  descricao TEXT NOT NULL,
  imagem_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.receita_passos_preparo ENABLE ROW LEVEL SECURITY;

-- Create policies for recipe steps
CREATE POLICY "Usuários podem ver passos de suas receitas" 
ON public.receita_passos_preparo 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM receitas 
  WHERE receitas.id = receita_passos_preparo.receita_id 
  AND receitas.user_id = auth.uid()
));

CREATE POLICY "Usuários podem criar passos em suas receitas" 
ON public.receita_passos_preparo 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM receitas 
  WHERE receitas.id = receita_passos_preparo.receita_id 
  AND receitas.user_id = auth.uid()
));

CREATE POLICY "Usuários podem atualizar passos de suas receitas" 
ON public.receita_passos_preparo 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM receitas 
  WHERE receitas.id = receita_passos_preparo.receita_id 
  AND receitas.user_id = auth.uid()
));

CREATE POLICY "Usuários podem deletar passos de suas receitas" 
ON public.receita_passos_preparo 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM receitas 
  WHERE receitas.id = receita_passos_preparo.receita_id 
  AND receitas.user_id = auth.uid()
));

-- Add imagem_url field to receitas table for main recipe image
ALTER TABLE public.receitas 
ADD COLUMN imagem_url TEXT;

-- Create storage bucket for recipe images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('receitas-images', 'receitas-images', true);

-- Create storage policies for recipe images
CREATE POLICY "Recipe images are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'receitas-images');

CREATE POLICY "Users can upload their own recipe images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'receitas-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own recipe images" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'receitas-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own recipe images" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'receitas-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Add trigger for updating timestamps
CREATE TRIGGER update_receita_passos_preparo_updated_at
BEFORE UPDATE ON public.receita_passos_preparo
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();