import { useCallback, useRef } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';

interface UserConfiguration {
  id?: string;
  type: string;
  configuration: any;
}

export function useOptimizedUserConfigurations() {
  const { user } = useAuth();
  const cacheRef = useRef<Map<string, { data: any; timestamp: number }>>(new Map());
  const pendingRequests = useRef<Map<string, Promise<any>>>(new Map());
  
  const CACHE_DURATION = 30000; // 30 segundos de cache

  const loadConfiguration = useCallback(async (type: string): Promise<any | null> => {
    if (!user) return null;

    // Verificar cache
    const cached = cacheRef.current.get(type);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data;
    }

    // Verificar se já existe uma requisição pendente
    const pendingKey = `${user.id}-${type}`;
    if (pendingRequests.current.has(pendingKey)) {
      return pendingRequests.current.get(pendingKey);
    }

    const request = (async () => {
      try {
        const { data, error } = await supabase
          .from('user_configurations')
          .select('*')
          .eq('user_id', user.id)
          .eq('type', type)
          .single();

        if (error && error.code !== 'PGRST116') {
          throw error;
        }

        const result = data?.configuration || null;
        
        // Armazenar no cache
        cacheRef.current.set(type, {
          data: result,
          timestamp: Date.now()
        });

        return result;
      } catch (error) {
        console.error('Erro ao carregar configuração:', error);
        return null;
      } finally {
        pendingRequests.current.delete(pendingKey);
      }
    })();

    pendingRequests.current.set(pendingKey, request);
    return request;
  }, [user]);

  const saveConfiguration = useCallback(async (type: string, configuration: any): Promise<void> => {
    if (!user) return;

    try {
      // Invalidar cache
      cacheRef.current.delete(type);

      const { data: existing } = await supabase
        .from('user_configurations')
        .select('id')
        .eq('user_id', user.id)
        .eq('type', type)
        .single();

      if (existing) {
        await supabase
          .from('user_configurations')
          .update({ configuration })
          .eq('id', existing.id);
      } else {
        await supabase
          .from('user_configurations')
          .insert({
            user_id: user.id,
            type,
            configuration
          });
      }

      // Atualizar cache com novos dados
      cacheRef.current.set(type, {
        data: configuration,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('Erro ao salvar configuração:', error);
      throw error;
    }
  }, [user]);

  return {
    loadConfiguration,
    saveConfiguration
  };
}