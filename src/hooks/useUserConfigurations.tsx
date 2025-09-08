import { useState, useEffect, useCallback } from 'react';
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
    }
  }, [user, toast]);

  return {
    loadConfiguration,
    saveConfiguration
  };
};