-- Corrigir políticas de acesso aos dados de folha de pagamento
-- Restringir acesso sensível de salários apenas aos proprietários do negócio e administradores

-- Remover políticas atuais que permitem HR managers acessarem dados salariais sensíveis
DROP POLICY IF EXISTS "Role-based access to payroll data" ON public.folha_pagamento;
DROP POLICY IF EXISTS "Only owners and HR managers can update payroll data" ON public.folha_pagamento;
DROP POLICY IF EXISTS "Only owners and HR managers can create payroll data" ON public.folha_pagamento;

-- Política SELECT: Apenas proprietário do negócio e admins podem visualizar dados salariais
CREATE POLICY "Only owners and admins can view payroll data"
ON public.folha_pagamento 
FOR SELECT 
USING (
  (auth.uid() = user_id) OR 
  has_role_or_higher('admin'::app_role)
);

-- Política INSERT: Apenas proprietário do negócio e admins podem criar registros de folha
CREATE POLICY "Only owners and admins can create payroll data"
ON public.folha_pagamento 
FOR INSERT 
WITH CHECK (
  (auth.uid() = user_id) OR 
  has_role_or_higher('admin'::app_role)
);

-- Política UPDATE: Apenas proprietário do negócio e admins podem atualizar dados salariais
CREATE POLICY "Only owners and admins can update payroll data"
ON public.folha_pagamento 
FOR UPDATE 
USING (
  (auth.uid() = user_id) OR 
  has_role_or_higher('admin'::app_role)
);

-- Manter política DELETE existente (já restrita a owners e admins)
-- A política "Only owners and admins can delete payroll data" já está correta

-- Criar função para HR managers acessarem apenas dados não sensíveis dos funcionários
CREATE OR REPLACE FUNCTION public.get_employee_summary()
RETURNS TABLE (
  employee_name text,
  cargo text,
  tipo_mao_obra text,
  ativo boolean,
  horas_por_dia numeric,
  dias_por_semana numeric
) 
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  -- HR managers podem ver apenas informações básicas dos funcionários, sem dados salariais
  SELECT 
    fp.nome as employee_name,
    fp.cargo,
    fp.tipo_mao_obra,
    fp.ativo,
    fp.horas_por_dia,
    fp.dias_por_semana
  FROM public.folha_pagamento fp
  INNER JOIN public.profiles p ON fp.user_id = p.user_id
  WHERE has_role_or_higher('hr_manager'::app_role)
    AND fp.ativo = true;
$$;

-- Comentários sobre as correções de segurança
COMMENT ON POLICY "Only owners and admins can view payroll data" ON public.folha_pagamento IS 
'Política de segurança: Restringe acesso aos dados salariais sensíveis apenas ao proprietário do negócio e administradores do sistema.';

COMMENT ON POLICY "Only owners and admins can create payroll data" ON public.folha_pagamento IS 
'Política de segurança: Apenas proprietários do negócio e administradores podem criar registros de folha de pagamento.';

COMMENT ON POLICY "Only owners and admins can update payroll data" ON public.folha_pagamento IS 
'Política de segurança: Apenas proprietários do negócio e administradores podem modificar dados salariais sensíveis.';

COMMENT ON FUNCTION public.get_employee_summary() IS 
'Função para HR managers acessarem apenas informações básicas dos funcionários, sem expor dados salariais sensíveis como salário, benefícios e descontos.';