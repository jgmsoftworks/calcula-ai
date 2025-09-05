-- Add new required fields for supplier representatives
ALTER TABLE public.fornecedores 
ADD COLUMN representante text,
ADD COLUMN telefone_representante text;

-- Update existing suppliers to have empty string for new required fields (avoid null issues)
UPDATE public.fornecedores 
SET representante = '', telefone_representante = ''
WHERE representante IS NULL OR telefone_representante IS NULL;