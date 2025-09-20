-- Add conservacao field to receitas table to store conservation data
ALTER TABLE public.receitas 
ADD COLUMN conservacao jsonb DEFAULT NULL;

-- Add comment for clarity
COMMENT ON COLUMN public.receitas.conservacao IS 'Stores conservation data including local, temperatura, and tempo as JSON';