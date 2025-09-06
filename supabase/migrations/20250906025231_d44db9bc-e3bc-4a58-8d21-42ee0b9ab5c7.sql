-- Adicionar colunas para valor percentual e valor fixo separadamente
ALTER TABLE public.encargos_venda 
ADD COLUMN valor_percentual numeric DEFAULT 0,
ADD COLUMN valor_fixo numeric DEFAULT 0;

-- Migrar dados existentes baseado no tipo
UPDATE public.encargos_venda 
SET valor_percentual = valor 
WHERE tipo = 'percentual';

UPDATE public.encargos_venda 
SET valor_fixo = valor 
WHERE tipo = 'fixo';

-- O campo tipo não é mais necessário mas vamos manter por compatibilidade
-- O campo valor original também mantemos por compatibilidade