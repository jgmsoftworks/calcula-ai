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
      if (!user) return null;

      const fresh = !!opts?.fresh;
      const cacheKey = `${user.id}:${type}`;

      if (!fresh) {
        const cached = cacheRef.current.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
          return cached.data;
        }
      }

      if (pendingRef.current.has(cacheKey)) {
        return pendingRef.current.get(cacheKey);
      }

      const p = (async () => {
        try {
          const { data, error } = await supabase
            .from('user_configurations')
            .select('*')
            .eq('user_id', user.id)
            .eq('type', type)
            .maybeSingle();

          // PGRST116 = no rows
          if (error && (error as any).code !== 'PGRST116') {
            throw error;
          }
          const result = data?.configuration ?? null;

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
      if (!user) return;

      const cacheKey = `${user.id}:${type}`;
      cacheRef.current.delete(cacheKey);

      const { data: existing } = await supabase
        .from('user_configurations')
        .select('id')
        .eq('user_id', user.id)
        .eq('type', type)
        .maybeSingle();

      if (existing) {
        await supabase.from('user_configurations').update({ configuration }).eq('id', existing.id);
      } else {
        await supabase.from('user_configurations').insert({ user_id: user.id, type, configuration });
      }

      cacheRef.current.set(cacheKey, { data: configuration, timestamp: Date.now() });
    },
    [user]
  );

  return { loadConfiguration, saveConfiguration, invalidateCache };
}
