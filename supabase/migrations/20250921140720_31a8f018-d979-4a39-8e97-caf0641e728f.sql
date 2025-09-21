-- Add peso_unitario column to receitas table
ALTER TABLE public.receitas 
ADD COLUMN IF NOT EXISTS peso_unitario numeric;