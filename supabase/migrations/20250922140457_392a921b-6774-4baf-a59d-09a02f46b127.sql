-- Criar tabela de sugestões
CREATE TABLE public.suggestions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('bug', 'improvement', 'feature')),
  impact TEXT NOT NULL CHECK (impact IN ('low', 'medium', 'high')),
  urgency TEXT NOT NULL CHECK (urgency IN ('low', 'medium', 'high')),
  attachment_url TEXT,
  allow_contact BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'review', 'in_progress', 'released', 'rejected')),
  plan TEXT,
  app_version TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela do roadmap
CREATE TABLE public.roadmap_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'released')),
  eta TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de votos do roadmap
CREATE TABLE public.roadmap_votes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  roadmap_item_id UUID NOT NULL REFERENCES public.roadmap_items(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, roadmap_item_id)
);

-- Criar tabela de notificações
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error')),
  read BOOLEAN NOT NULL DEFAULT false,
  related_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Adicionar campo is_admin ao profiles se não existir
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT false;

-- Enable RLS
ALTER TABLE public.suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roadmap_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roadmap_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Policies para suggestions
CREATE POLICY "Usuários podem criar suas próprias sugestões" 
ON public.suggestions FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem ver suas próprias sugestões" 
ON public.suggestions FOR SELECT 
USING (auth.uid() = user_id OR (SELECT is_admin FROM public.profiles WHERE user_id = auth.uid()) = true);

CREATE POLICY "Admins podem atualizar sugestões" 
ON public.suggestions FOR UPDATE 
USING ((SELECT is_admin FROM public.profiles WHERE user_id = auth.uid()) = true);

-- Policies para roadmap_items
CREATE POLICY "Todos podem ver itens do roadmap" 
ON public.roadmap_items FOR SELECT 
USING (true);

CREATE POLICY "Apenas admins podem gerenciar roadmap" 
ON public.roadmap_items FOR ALL 
USING ((SELECT is_admin FROM public.profiles WHERE user_id = auth.uid()) = true);

-- Policies para roadmap_votes
CREATE POLICY "Usuários podem gerenciar seus próprios votos" 
ON public.roadmap_votes FOR ALL 
USING (auth.uid() = user_id);

CREATE POLICY "Todos podem ver votos" 
ON public.roadmap_votes FOR SELECT 
USING (true);

-- Policies para notifications
CREATE POLICY "Usuários podem ver suas próprias notificações" 
ON public.notifications FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Sistema pode criar notificações" 
ON public.notifications FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Usuários podem atualizar suas próprias notificações" 
ON public.notifications FOR UPDATE 
USING (auth.uid() = user_id);

-- Triggers para updated_at
CREATE TRIGGER update_suggestions_updated_at
  BEFORE UPDATE ON public.suggestions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_roadmap_items_updated_at
  BEFORE UPDATE ON public.roadmap_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes para performance
CREATE INDEX idx_suggestions_user_id ON public.suggestions(user_id);
CREATE INDEX idx_suggestions_status ON public.suggestions(status);
CREATE INDEX idx_suggestions_created_at ON public.suggestions(created_at DESC);
CREATE INDEX idx_roadmap_items_status ON public.roadmap_items(status);
CREATE INDEX idx_roadmap_votes_roadmap_item_id ON public.roadmap_votes(roadmap_item_id);
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_read ON public.notifications(read);

-- Função para contar sugestões do usuário nas últimas 24h
CREATE OR REPLACE FUNCTION public.count_user_suggestions_24h(check_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::integer
  FROM public.suggestions 
  WHERE user_id = check_user_id 
    AND created_at >= (now() - interval '24 hours');
$$;