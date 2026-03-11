
-- ============================================
-- PRIORIDADE 2: Corrigir RLS policies permissivas (WITH CHECK true)
-- ============================================

-- 1. admin_actions - INSERT com WITH CHECK (true) -> restringir a admins
DROP POLICY IF EXISTS "Sistema pode inserir logs de auditoria" ON public.admin_actions;
CREATE POLICY "Sistema pode inserir logs de auditoria" ON public.admin_actions
  FOR INSERT TO authenticated
  WITH CHECK (has_role_or_higher('admin'::app_role));

-- 2. coupon_redemptions - INSERT com WITH CHECK (true) -> restringir ao próprio usuário
DROP POLICY IF EXISTS "Sistema pode criar resgates" ON public.coupon_redemptions;
CREATE POLICY "Sistema pode criar resgates" ON public.coupon_redemptions
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 3. notifications - INSERT com WITH CHECK (true) -> restringir ao próprio usuário
DROP POLICY IF EXISTS "Sistema pode criar notificações" ON public.notifications;
CREATE POLICY "Sistema pode criar notificações" ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- PRIORIDADE 3: Restringir dados de fornecedores no marketplace
-- Criar uma view segura para dados públicos
-- ============================================

-- Atualizar a policy de SELECT para fornecedores marketplace
-- Para fornecedores públicos, usar uma policy que limita campos via view
DROP POLICY IF EXISTS "Fornecedores marketplace visíveis" ON public.fornecedores;

-- Criar view segura para marketplace (sem dados pessoais)
CREATE OR REPLACE VIEW public.fornecedores_marketplace AS
SELECT 
  id,
  nome,
  descricao,
  cidade,
  estado,
  logo_url,
  catalogo_url,
  entrega_disponivel,
  raio_entrega_km,
  formas_pagamento,
  horario_atendimento,
  eh_fornecedor
FROM public.fornecedores
WHERE eh_fornecedor = true AND ativo = true;

-- Recriar policy - apenas donos veem seus próprios dados completos
-- Marketplace deve usar a view fornecedores_marketplace
CREATE POLICY "Fornecedores marketplace visíveis" ON public.fornecedores
  FOR SELECT USING (auth.uid() = user_id);
