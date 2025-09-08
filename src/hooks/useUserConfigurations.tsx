import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export interface UserConfiguration {
  id?: string;
  type: string;
  configuration: any;
}

export const useUserConfigurations = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const pendingRequests = useRef<Map<string, Promise<void>>>(new Map());

  const loadConfiguration = useCallback(async (type: string) => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('user_configurations')
        .select('*')
        .eq('user_id', user.id)
        .eq('type', type)
        .maybeSingle();

      if (error) throw error;
      return data?.configuration || null;
    } catch (error) {
      console.error('Erro ao carregar configuração:', error);
      return null;
    }
  }, [user]);

  const saveConfiguration = useCallback(async (type: string, configuration: any) => {
    if (!user) return;

    const requestKey = `${user.id}-${type}`;
    
    // Se já existe uma requisição pendente para esse tipo, aguarda ela terminar
    if (pendingRequests.current.has(requestKey)) {
      await pendingRequests.current.get(requestKey);
    }

    // Cria uma nova promise para esta requisição
    const requestPromise = (async () => {
      try {
        const { error } = await supabase
          .from('user_configurations')
          .upsert({
            user_id: user.id,
            type: type,
            configuration: configuration
          }, {
            onConflict: 'user_id,type'
          });

        if (error) throw error;
      } catch (error) {
        console.error('Erro ao salvar configuração:', error);
        toast({
          title: "Erro ao salvar configurações",
          description: "Suas configurações não foram salvas",
          variant: "destructive"
        });
      } finally {
        // Remove a requisição da lista de pendentes
        pendingRequests.current.delete(requestKey);
      }
    })();

    // Adiciona a promise na lista de pendentes
    pendingRequests.current.set(requestKey, requestPromise);
    
    return requestPromise;
  }, [user, toast]);

  return {
    loadConfiguration,
    saveConfiguration
  };
};