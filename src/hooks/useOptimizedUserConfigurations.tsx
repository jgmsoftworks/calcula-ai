import { useCallback, useRef } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';

interface CacheEntry { data: any; timestamp: number }
interface LoadOpts { fresh?: boolean }

export function useOptimizedUserConfigurations() {
  const { user } = useAuth();
  const cacheRef = useRef<Map<string, CacheEntry>>(new Map());
  const pendingRef = useRef<Map<string, Promise<any>>>(new Map());

  const CACHE_DURATION = 30_000; // 30s

  const invalidateCache = useCallback((type?: string) => {
    if (!type) {
      cacheRef.current.clear();
      return;
    }
    cacheRef.current.delete(type);
  }, []);

  const loadConfiguration = useCallback(
    async (type: string, opts?: LoadOpts): Promise<any | null> => {
      if (!user) {
        console.log(`⚠️ loadConfiguration: Usuário não logado para ${type}`);
        return null;
      }

      const fresh = !!opts?.fresh;
      const cacheKey = `${user.id}:${type}`;

      console.log(`🔍 Carregando configuração: ${type} (fresh: ${fresh})`);

      if (!fresh) {
        const cached = cacheRef.current.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
          console.log(`💾 Cache hit para ${type}:`, cached.data);
          return cached.data;
        }
      }

      if (pendingRef.current.has(cacheKey)) {
        console.log(`⏳ Aguardando request pendente para ${type}`);
        return pendingRef.current.get(cacheKey);
      }

      const p = (async () => {
        try {
          console.log(`📡 Buscando ${type} no banco de dados...`);
          const { data, error } = await supabase
            .from('user_configurations')
            .select('*')
            .eq('user_id', user.id)
            .eq('type', type)
            .maybeSingle();

          if (error && (error as any).code !== 'PGRST116') {
            console.error(`❌ Erro ao carregar ${type}:`, error);
            throw error;
          }

          const result = data?.configuration ?? null;
          console.log(`📋 Resultado carregado para ${type}:`, result);

          // sempre atualiza cache (mesmo fresh, para futuras leituras)
          cacheRef.current.set(cacheKey, { data: result, timestamp: Date.now() });
          return result;
        } finally {
          pendingRef.current.delete(cacheKey);
        }
      })();

      pendingRef.current.set(cacheKey, p);
      return p;
    },
    [user]
  );

  const saveConfiguration = useCallback(
    async (type: string, configuration: any): Promise<void> => {
      if (!user) {
        console.error('❌ saveConfiguration: Usuário não logado');
        return;
      }

      console.log(`💾 Salvando configuração: ${type}`, configuration);
      const cacheKey = `${user.id}:${type}`;

      try {
        // Verificar se já existe
        const { data: existing, error: selectError } = await supabase
          .from('user_configurations')
          .select('id')
          .eq('user_id', user.id)
          .eq('type', type)
          .maybeSingle();

        if (selectError && selectError.code !== 'PGRST116') {
          console.error('❌ Erro ao buscar configuração existente:', selectError);
          throw selectError;
        }

        console.log(`🔍 Configuração existente para ${type}:`, existing);

        if (existing) {
          // Atualizar
          const { error: updateError } = await supabase
            .from('user_configurations')
            .update({ 
              configuration,
              updated_at: new Date().toISOString() 
            })
            .eq('id', existing.id);

          if (updateError) {
            console.error('❌ Erro ao atualizar configuração:', updateError);
            throw updateError;
          }
          console.log(`✅ Configuração ${type} atualizada com sucesso`);
        } else {
          // Inserir
          const { error: insertError } = await supabase
            .from('user_configurations')
            .insert({ 
              user_id: user.id, 
              type, 
              configuration 
            });

          if (insertError) {
            console.error('❌ Erro ao inserir configuração:', insertError);
            throw insertError;
          }
          console.log(`✅ Configuração ${type} criada com sucesso`);
        }

        // Atualizar cache APENAS após sucesso
        cacheRef.current.set(cacheKey, { data: configuration, timestamp: Date.now() });

        // Verificar se foi realmente salvo
        const { data: verificacao } = await supabase
          .from('user_configurations')
          .select('configuration')
          .eq('user_id', user.id)
          .eq('type', type)
          .maybeSingle();

        console.log(`🔍 Verificação pós-salvamento para ${type}:`, verificacao?.configuration);

      } catch (error) {
        console.error(`❌ Falha crítica ao salvar ${type}:`, error);
        // Remover do cache se houve erro
        cacheRef.current.delete(cacheKey);
        throw error; // Re-throw para que o componente saiba que houve erro
      }
    },
    [user]
  );

  return { loadConfiguration, saveConfiguration, invalidateCache };
}
