-- CORREÇÃO CRÍTICA DE SEGURANÇA: Isolar dados de folha de pagamento por usuário
-- Remove políticas antigas que permitiam acesso de admin

DROP POLICY IF EXISTS "Only owners and admins can view payroll data" ON public.folha_pagamento;
DROP POLICY IF EXISTS "Only owners and admins can create payroll data" ON public.folha_pagamento;
DROP POLICY IF EXISTS "Only owners and admins can update payroll data" ON public.folha_pagamento;
DROP POLICY IF EXISTS "Only owners and admins can delete payroll data" ON public.folha_pagamento;

-- Cria novas políticas que garantem isolamento total de dados por usuário
CREATE POLICY "Users can only view their own payroll data"
ON public.folha_pagamento
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can only create their own payroll data"
ON public.folha_pagamento
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can only update their own payroll data"
ON public.folha_pagamento
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can only delete their own payroll data"
ON public.folha_pagamento
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Adiciona índice para melhorar performance das queries filtradas por user_id
CREATE INDEX IF NOT EXISTS idx_folha_pagamento_user_id ON public.folha_pagamento(user_id);