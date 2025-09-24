-- Criar tabela para armazenar histórico de backups
CREATE TABLE public.backup_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  backup_type TEXT NOT NULL DEFAULT 'full',
  status TEXT NOT NULL DEFAULT 'in_progress',
  file_path TEXT,
  file_size BIGINT,
  tables_included TEXT[] NOT NULL DEFAULT '{}',
  records_count JSONB DEFAULT '{}',
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  created_by UUID REFERENCES auth.users(id),
  backup_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.backup_history ENABLE ROW LEVEL SECURITY;

-- Apenas admins podem gerenciar backups
CREATE POLICY "Apenas admins podem gerenciar backups" 
ON public.backup_history 
FOR ALL 
USING ((SELECT is_admin FROM profiles WHERE user_id = auth.uid()) = true);

-- Criar função para backup automático dos dados críticos
CREATE OR REPLACE FUNCTION public.create_system_backup(
  backup_type text DEFAULT 'full'
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  backup_id uuid;
  table_list text[] := ARRAY[
    'profiles', 'produtos', 'receitas', 'receita_ingredientes',
    'receita_embalagens', 'receita_mao_obra', 'receita_sub_receitas',
    'receita_passos_preparo', 'user_configurations', 'despesas_fixas',
    'folha_pagamento', 'encargos_venda', 'markups', 'movimentacoes',
    'movimentacoes_receitas', 'estoque_receitas', 'categorias',
    'marcas', 'fornecedores', 'tipos_produto'
  ];
  backup_data jsonb := '{}';
  table_name text;
  record_count integer;
  total_records jsonb := '{}';
BEGIN
  -- Criar registro de backup
  INSERT INTO public.backup_history (
    backup_type,
    status,
    tables_included,
    created_by
  ) VALUES (
    backup_type,
    'in_progress',
    table_list,
    auth.uid()
  ) RETURNING id INTO backup_id;

  -- Coletar dados de cada tabela
  FOREACH table_name IN ARRAY table_list
  LOOP
    EXECUTE format('SELECT COUNT(*) FROM %I', table_name) INTO record_count;
    total_records := total_records || jsonb_build_object(table_name, record_count);
  END LOOP;

  -- Atualizar registro com contagens
  UPDATE public.backup_history 
  SET 
    records_count = total_records,
    status = 'completed',
    completed_at = now()
  WHERE id = backup_id;

  RETURN backup_id;
END;
$$;

-- Criar função para restaurar backup
CREATE OR REPLACE FUNCTION public.get_backup_data(backup_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  backup_record record;
  result jsonb := '{}';
BEGIN
  -- Verificar se o usuário é admin
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND is_admin = true) THEN
    RAISE EXCEPTION 'Acesso negado. Apenas administradores podem acessar backups.';
  END IF;

  -- Buscar dados do backup
  SELECT * INTO backup_record FROM backup_history WHERE id = backup_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Backup não encontrado.';
  END IF;

  RETURN jsonb_build_object(
    'backup_info', to_jsonb(backup_record),
    'status', 'success'
  );
END;
$$;

-- Trigger para atualizar updated_at
CREATE TRIGGER update_backup_history_updated_at
  BEFORE UPDATE ON public.backup_history
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();