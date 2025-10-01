-- Adicionar colunas faltantes se não existirem
DO $$ 
BEGIN
  -- Adicionar coluna processed se não existir
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'stripe_events' 
                 AND column_name = 'processed') THEN
    ALTER TABLE public.stripe_events ADD COLUMN processed BOOLEAN DEFAULT false;
  END IF;

  -- Adicionar coluna processed_at se não existir
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'stripe_events' 
                 AND column_name = 'processed_at') THEN
    ALTER TABLE public.stripe_events ADD COLUMN processed_at TIMESTAMP WITH TIME ZONE;
  END IF;

  -- Adicionar coluna error_message se não existir
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'stripe_events' 
                 AND column_name = 'error_message') THEN
    ALTER TABLE public.stripe_events ADD COLUMN error_message TEXT;
  END IF;
END $$;

-- Garantir que RLS está habilitado
ALTER TABLE public.stripe_events ENABLE ROW LEVEL SECURITY;

-- Remover TODAS as políticas perigosas existentes
DROP POLICY IF EXISTS "stripe_events_public_access" ON public.stripe_events;
DROP POLICY IF EXISTS "Allow public access to stripe_events" ON public.stripe_events;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.stripe_events;
DROP POLICY IF EXISTS "Enable insert for all users" ON public.stripe_events;
DROP POLICY IF EXISTS "Enable update for all users" ON public.stripe_events;
DROP POLICY IF EXISTS "Enable delete for all users" ON public.stripe_events;
DROP POLICY IF EXISTS "Public read access" ON public.stripe_events;
DROP POLICY IF EXISTS "Public write access" ON public.stripe_events;

-- POLÍTICA CRÍTICA: Apenas admins podem visualizar eventos de pagamento
DROP POLICY IF EXISTS "Apenas admins podem visualizar stripe_events" ON public.stripe_events;
CREATE POLICY "Apenas admins podem visualizar stripe_events"
ON public.stripe_events
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.is_admin = true
  )
);

-- POLÍTICA CRÍTICA: Apenas service role pode inserir eventos (webhooks)
DROP POLICY IF EXISTS "Apenas sistema pode inserir stripe_events" ON public.stripe_events;
CREATE POLICY "Apenas sistema pode inserir stripe_events"
ON public.stripe_events
FOR INSERT
TO service_role
WITH CHECK (true);

-- POLÍTICA CRÍTICA: Apenas service role pode atualizar eventos
DROP POLICY IF EXISTS "Apenas sistema pode atualizar stripe_events" ON public.stripe_events;
CREATE POLICY "Apenas sistema pode atualizar stripe_events"
ON public.stripe_events
FOR UPDATE
TO service_role
USING (true)
WITH CHECK (true);

-- POLÍTICA CRÍTICA: Apenas admins podem deletar eventos (cleanup)
DROP POLICY IF EXISTS "Apenas admins podem deletar stripe_events" ON public.stripe_events;
CREATE POLICY "Apenas admins podem deletar stripe_events"
ON public.stripe_events
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.is_admin = true
  )
);

-- Adicionar índices para performance (se não existirem)
CREATE INDEX IF NOT EXISTS idx_stripe_events_event_id ON public.stripe_events(stripe_event_id);
CREATE INDEX IF NOT EXISTS idx_stripe_events_processed ON public.stripe_events(processed);
CREATE INDEX IF NOT EXISTS idx_stripe_events_created_at ON public.stripe_events(created_at DESC);

-- Comentários para documentação
COMMENT ON TABLE public.stripe_events IS '🔒 TABELA CRÍTICA DE SEGURANÇA - Armazena eventos de webhook do Stripe. ACESSO RESTRITO APENAS PARA ADMINS E SISTEMA. NÃO REMOVER POLÍTICAS RLS.';
COMMENT ON POLICY "Apenas admins podem visualizar stripe_events" ON public.stripe_events IS '🔒 SEGURANÇA CRÍTICA: Apenas administradores podem ver eventos de pagamento sensíveis';
COMMENT ON POLICY "Apenas sistema pode inserir stripe_events" ON public.stripe_events IS '🔒 SEGURANÇA CRÍTICA: Apenas service role (webhooks) pode inserir eventos';
COMMENT ON POLICY "Apenas sistema pode atualizar stripe_events" ON public.stripe_events IS '🔒 SEGURANÇA CRÍTICA: Apenas service role pode processar eventos';
COMMENT ON POLICY "Apenas admins podem deletar stripe_events" ON public.stripe_events IS '🔒 SEGURANÇA CRÍTICA: Apenas admins podem fazer cleanup de eventos antigos';