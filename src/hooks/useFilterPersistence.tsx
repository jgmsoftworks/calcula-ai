import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface FilterConfig {
  period: string;
  savedAt?: string;
}

export function useFilterPersistence(filterType: 'markup_filter' | 'custos_filter') {
  const { user } = useAuth();
  const [currentFilter, setCurrentFilter] = useState<string>('last_month');
  const [isLoading, setIsLoading] = useState(true);

  // Carregar filtro salvo do banco
  const loadFilter = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    try {
      console.log(`[FILTER] Carregando filtro ${filterType} para usuário ${user.id}`);
      
      // Inicializar filtros padrão se necessário
      await supabase.rpc('initialize_user_filters', { user_uuid: user.id });

      // Buscar configuração salva
      const { data, error } = await supabase
        .from('user_configurations')
        .select('configuration')
        .eq('user_id', user.id)
        .eq('type', filterType)
        .maybeSingle();

      if (error) {
        console.error(`[FILTER] Erro ao carregar ${filterType}:`, error);
        return;
      }

      if (data?.configuration) {
        const config = data.configuration as any;
        if (config && typeof config === 'object' && config.period) {
          console.log(`[FILTER] Filtro carregado para ${filterType}:`, config.period);
          setCurrentFilter(config.period);
        }
      }
    } catch (error) {
      console.error(`[FILTER] Erro ao carregar filtro ${filterType}:`, error);
    } finally {
      setIsLoading(false);
    }
  }, [user, filterType]);

  // Salvar filtro no banco
  const saveFilter = useCallback(async (period: string) => {
    if (!user) return;

    try {
      console.log(`[FILTER] Salvando filtro ${filterType}: ${period}`);
      
      const config: FilterConfig = {
        period,
        savedAt: new Date().toISOString()
      };

      const { error } = await supabase
        .from('user_configurations')
        .upsert({
          user_id: user.id,
          type: filterType,
          configuration: config as any,
          updated_at: new Date().toISOString()
        });

      if (error) {
        console.error(`[FILTER] Erro ao salvar ${filterType}:`, error);
        toast.error('Erro ao salvar filtro');
        return;
      }

      setCurrentFilter(period);
      console.log(`[FILTER] Filtro ${filterType} salvo com sucesso: ${period}`);
    } catch (error) {
      console.error(`[FILTER] Erro ao salvar filtro ${filterType}:`, error);
      toast.error('Erro ao salvar filtro');
    }
  }, [user, filterType]);

  // Carregar filtro quando componente montar
  useEffect(() => {
    loadFilter();
  }, [loadFilter]);

  return {
    currentFilter,
    setFilter: saveFilter,
    isLoading
  };
}