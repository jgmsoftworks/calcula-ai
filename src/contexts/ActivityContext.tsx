import { createContext, useContext, ReactNode, useCallback, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface ActivityContextType {
  logActivity: (
    action: string,
    tableName?: string,
    recordId?: string,
    description?: string,
    value?: string
  ) => Promise<void>;
}

const ActivityContext = createContext<ActivityContextType | undefined>(undefined);

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

export const ActivityProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();

  const logActivity = useCallback(async (
    action: string,
    tableName?: string,
    recordId?: string,
    description?: string,
    value?: string
  ) => {
    if (!user?.id) return;

    try {
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

      const updatedLogs = [activityData, ...currentLogs].slice(0, 50);

      if (existingLogs?.id) {
        await supabase
          .from('user_configurations')
          .update({ configuration: updatedLogs })
          .eq('id', existingLogs.id);
      } else {
        await supabase
          .from('user_configurations')
          .insert({
            user_id: user.id,
            type: 'activity_logs',
            configuration: updatedLogs
          });
      }
    } catch (error) {
      console.error('Erro ao registrar atividade:', error);
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
    }
  }, [user?.id, logActivity]);

  return (
    <ActivityContext.Provider value={{ logActivity }}>
      {children}
    </ActivityContext.Provider>
  );
};

export const useActivity = () => {
  const context = useContext(ActivityContext);
  if (!context) {
    throw new Error('useActivity must be used within an ActivityProvider');
  }
  return context;
};
