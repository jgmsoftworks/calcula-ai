-- Tabela de auditoria para ações de administradores
CREATE TABLE IF NOT EXISTS public.admin_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type text NOT NULL,
  old_value jsonb,
  new_value jsonb,
  reason text,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Índices para performance
CREATE INDEX idx_admin_actions_admin ON public.admin_actions(admin_user_id);
CREATE INDEX idx_admin_actions_target ON public.admin_actions(target_user_id);
CREATE INDEX idx_admin_actions_created_at ON public.admin_actions(created_at DESC);

-- RLS para admin_actions
ALTER TABLE public.admin_actions ENABLE ROW LEVEL SECURITY;

-- Apenas admins podem ver logs de auditoria
CREATE POLICY "Admins podem ver logs de auditoria"
ON public.admin_actions
FOR SELECT
TO authenticated
USING (has_role_or_higher('admin'::app_role));

-- Sistema pode inserir logs
CREATE POLICY "Sistema pode inserir logs de auditoria"
ON public.admin_actions
FOR INSERT
TO authenticated
WITH CHECK (true);