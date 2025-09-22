import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface ActivityLog {
  id: string;
  action: string;
  description: string;
  time: string;
  type: 'login' | 'create' | 'update' | 'delete' | 'cost' | 'report' | 'auth' | 'info';
  value?: string;
  status: 'success' | 'warning' | 'error' | 'info';
  table_name?: string;
  record_id?: string;
  created_at: string;
}

const ACTION_DESCRIPTIONS = {
  login: 'Login realizado',
  create_produto: 'Produto cadastrado',
  update_produto: 'Produto atualizado', 
  delete_produto: 'Produto removido',
  create_receita: 'Receita criada',
  update_receita: 'Receita atualizada',
  delete_receita: 'Receita removida',
  create_markup: 'Markup configurado',
  update_markup: 'Markup atualizado',
  create_despesa: 'Despesa cadastrada',
  update_despesa: 'Despesa atualizada',
  create_funcionario: 'Funcionário cadastrado',
  update_funcionario: 'Funcionário atualizado',
};

export const useActivityLog = () => {
  const { user } = useAuth();
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return 'Agora';
    if (diffInMinutes < 60) return `${diffInMinutes} min atrás`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h atrás`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays} dia${diffInDays > 1 ? 's' : ''} atrás`;
    
    return date.toLocaleDateString('pt-BR');
  };

  const logActivity = useCallback(async (
    action: string,
    tableName?: string,
    recordId?: string,
    description?: string,
    value?: string
  ) => {
    if (!user?.id) return;

    try {
      // Inserir no log de atividades (usando user_configurations para armazenar)
      const activityData = {
        id: crypto.randomUUID(),
        action,
        description: description || ACTION_DESCRIPTIONS[action as keyof typeof ACTION_DESCRIPTIONS] || action,
        type: action.includes('create') ? 'create' as const :
              action.includes('update') ? 'update' as const :
              action.includes('delete') ? 'delete' as const :
              action.includes('login') ? 'auth' as const : 'info' as const,
        value,
        status: 'success' as const,
        table_name: tableName,
        record_id: recordId,
        created_at: new Date().toISOString(),
      };

      // Buscar logs existentes
      const { data: existingLogs } = await supabase
        .from('user_configurations')
        .select('configuration, id')
        .eq('user_id', user.id)
        .eq('type', 'activity_logs')
        .single();

      let currentLogs = [];
      if (existingLogs?.configuration && Array.isArray(existingLogs.configuration)) {
        currentLogs = existingLogs.configuration;
      }

      // Adicionar nova atividade e manter apenas as últimas 50
      const updatedLogs = [activityData, ...currentLogs].slice(0, 50);

      if (existingLogs?.id) {
        // Atualizar logs existentes
        await supabase
          .from('user_configurations')
          .update({ configuration: updatedLogs })
          .eq('id', existingLogs.id);
      } else {
        // Criar nova entrada de logs
        await supabase
          .from('user_configurations')
          .insert({
            user_id: user.id,
            type: 'activity_logs',
            configuration: updatedLogs
          });
      }

      // Atualizar estado local
      setActivities(updatedLogs.map(log => ({
        ...log,
        time: formatTimeAgo(log.created_at)
      })));

    } catch (error) {
      console.error('Erro ao registrar atividade:', error);
    }
  }, [user?.id]);

  const fetchActivities = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);

      const { data } = await supabase
        .from('user_configurations')
        .select('configuration')
        .eq('user_id', user.id)
        .eq('type', 'activity_logs')
        .single();

      if (data?.configuration && Array.isArray(data.configuration)) {
        const formattedActivities = data.configuration.map((log: any) => ({
          ...log,
          time: formatTimeAgo(log.created_at)
        }));
        setActivities(formattedActivities);
      } else {
        setActivities([]);
      }
    } catch (error) {
      console.error('Erro ao buscar atividades:', error);
      setActivities([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Log de login automático
  useEffect(() => {
    if (user?.id) {
      const hasLoggedToday = localStorage.getItem(`last_login_${user.id}`);
      const today = new Date().toDateString();
      
      if (hasLoggedToday !== today) {
        logActivity('login', 'auth', user.id, 'Usuário fez login no sistema');
        localStorage.setItem(`last_login_${user.id}`, today);
      }
      
      fetchActivities();
    }
  }, [user?.id, logActivity, fetchActivities]);

  // Atualizar tempo "atrás" a cada minuto
  useEffect(() => {
    const interval = setInterval(() => {
      setActivities(prev => prev.map(activity => ({
        ...activity,
        time: formatTimeAgo(activity.created_at)
      })));
    }, 60000); // 1 minuto

    return () => clearInterval(interval);
  }, []);

  return {
    activities,
    loading,
    logActivity,
    refreshActivities: fetchActivities,
  };
};