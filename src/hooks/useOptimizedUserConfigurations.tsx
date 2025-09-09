import { useCallback, useEffect, useRef } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';

type ConfigValue = any;

interface CachedItem {
  data: ConfigValue;
  timestamp: number;
}

export function useOptimizedUserConfigurations() {
  const { user } = useAuth();

  const cacheRef = useRef<Map<string, CachedItem>>(new Map());
  const pendingRequests = useRef<Map<string, Promise<ConfigValue | null>>>(new Map());

  const CACHE_DURATION = 30_000; // 30s

  const keyFor = (type: string) => `${user?.id ?? 'anon'}:${type}`;

  const invalidateCache = useCallback((type?: string) => {
    if (type) {
      cacheRef.current.delete(keyFor(type));
    } else {
      cacheRef.current.clear();
    }
  }, [user?.id]);

  // Limpa cache quando trocar o usuário
  useEffect(() => {
    cacheRef.current.clear();
    pendingRequests.current.clear();
  }, [user?.id]);

  const loadConfiguration = useCallback(
    async (type: string): Promise<ConfigValue | null> => {
      if (!user?.id) return null;

      const cacheK = keyFor(type);

      // cache válido?
      const cached = cacheRef.current.get(cacheK);
      if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        return cached.data;
      }

      // requisição já em andamento?
      if (pendingRequests.current.has(cacheK)) {
        return pendingRequests.current.get(cacheK)!;
      }

      const req = (async () => {
        try {
          // ⚠️ Sempre ler a versão mais recente
          const { data, error } = await supabase
            .from('user_configurations')
            .select('configuration, updated_at, id')
            .eq('user_id', user.id)
            .eq('type', type)
            .order('updated_at', { ascending: false })
            .order('id', { ascending: false })
            .limit(1)
            .maybeSingle();

          // Ignora erro "no rows" do PostgREST; qualquer outro, propaga
          // (em algumas versões, no rows pode vir como null sem erro)
          // @ts-ignore
          if (error && error.code !== 'PGRST116') {
            throw error;
          }

          const value = data?.configuration ?? null;

          cacheRef.current.set(cacheK, { data: value, timestamp: Date.now() });
          return value;
        } catch (err) {
          console.error('[useOptimizedUserConfigurations] loadConfiguration error:', err);
          return null;
        } finally {
          pendingRequests.current.delete(cacheK);
        }
      })();

      pendingRequests.current.set(cacheK, req);
      return req;
    },
    [user?.id]
  );

  const saveConfiguration = useCallback(
    async (type: string, configuration: ConfigValue): Promise<void> => {
      if (!user?.id) return;

      // invalida cache antes de gravar
      invalidateCache(type);

      const payload = {
        user_id: user.id,
        type,
        configuration,
        updated_at: new Date().toISOString()
      };

      // 🔐 Upsert com conflito em (user_id, type) → evita duplicatas
      const { error } = await supabase
        .from('user_configurations')
        .upsert(payload, { onConflict: 'user_id,type' });

      if (error) {
        console.error('[useOptimizedUserConfigurations] saveConfiguration error:', error);
        throw error;
      }

      // atualiza cache local imediatamente
      cacheRef.current.set(keyFor(type), { data: configuration, timestamp: Date.now() });
    },
    [user?.id, invalidateCache]
  );

  return {
    loadConfiguration,
    saveConfiguration,
    invalidateCache,
  };
}
