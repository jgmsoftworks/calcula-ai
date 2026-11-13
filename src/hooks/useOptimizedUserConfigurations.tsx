import type { FaturamentoParaSalvar, MarkupBlock } from '@/types/configurations';
import { useCallback, useRef } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import { createLogger } from '@/lib/logger';

const log = createLogger('configurations');
const CACHE_DURATION = 30000;

function createAccountCache(userId: string | undefined) {
  return {
    userId,
    cache: new Map<string, { data: Json; timestamp: number }>(),
    pending: new Map<string, { version: number; promise: Promise<Json> }>(),
    versions: new Map<string, number>(),
  };
}

function invalidate(account: ReturnType<typeof createAccountCache>, type: string) {
  account.versions.set(type, (account.versions.get(type) ?? 0) + 1);
  account.cache.delete(type);
  account.pending.delete(type);
}

export function useOptimizedUserConfigurations() {
  const { user } = useAuth();
  const userId = user?.id;
  const accountRef = useRef(createAccountCache(userId));
  // A new account gets a new container, including when returning after logout.
  if (accountRef.current.userId !== userId) accountRef.current = createAccountCache(userId);
  const account = accountRef.current;

  const invalidateCache = useCallback((type?: string) => {
    if (type) invalidate(account, type);
    else {
      const types = new Set([...account.cache.keys(), ...account.pending.keys(), ...account.versions.keys()]);
      types.forEach(key => invalidate(account, key));
    }
  }, [account]);

  const loadConfiguration = useCallback(async <T = Json>(type: string): Promise<T | null> => {
    if (!userId || accountRef.current !== account) return null;
    const cached = account.cache.get(type);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) return cached.data as T;
    const pending = account.pending.get(type);
    if (pending) return pending.promise as Promise<T>;

    const version = account.versions.get(type) ?? 0;
    const request = (async (): Promise<Json> => {
      try {
        const { data, error } = await supabase.from('user_configurations')
          .select('configuration').eq('user_id', userId).eq('type', type).maybeSingle();
        if (accountRef.current !== account) return null;
        // An invalidation or save supersedes this read. Join the current request/cache.
        if ((account.versions.get(type) ?? 0) !== version) return loadConfiguration(type);
        if (error) throw error;
        const result = data?.configuration ?? null;
        account.cache.set(type, { data: result, timestamp: Date.now() });
        return result;
      } catch {
        log.error('Não foi possível carregar a configuração.');
        // Preserve the existing read API; failed reads are never cached.
        return null;
      } finally {
        if (account.pending.get(type)?.version === version) account.pending.delete(type);
      }
    })();
    account.pending.set(type, { version, promise: request });
    return request as Promise<T>;
  }, [account, userId]);

  const saveConfiguration = useCallback(async (type: string, configuration: Json | FaturamentoParaSalvar[] | MarkupBlock[]): Promise<void> => {
    if (!userId || accountRef.current !== account) throw new Error('Conta indisponível para salvar a configuração.');
    invalidate(account, type);
    const version = account.versions.get(type);
    try {
      const { error } = configuration == null
        ? await supabase.from('user_configurations').delete().eq('user_id', userId).eq('type', type)
        : await supabase.from('user_configurations').upsert({
          user_id: userId, type, configuration: configuration as Json,
        }, { onConflict: 'user_id,type' });
      if (error) throw error;
      const unchanged = account.versions.get(type) === version;
      // Reads made during the write may still contain the previous database value.
      invalidate(account, type);
      if (accountRef.current === account && unchanged) {
        account.cache.set(type, { data: configuration as Json ?? null, timestamp: Date.now() });
      }
    } catch (error) {
      invalidate(account, type);
      log.error('Não foi possível salvar a configuração.');
      throw error;
    }
  }, [account, userId]);

  const deleteConfiguration = useCallback((type: string): Promise<void> => saveConfiguration(type, null), [saveConfiguration]);
  const deleteMultipleConfigurations = useCallback(async (types: string[]): Promise<void> => {
    const results = await Promise.allSettled(types.map(type => deleteConfiguration(type)));
    const failures = results.filter(result => result.status === 'rejected').length;
    if (failures) throw new Error(`Não foi possível remover ${failures} configuração(ões). Tente novamente.`);
  }, [deleteConfiguration]);

  return { loadConfiguration, saveConfiguration, invalidateCache, deleteConfiguration, deleteMultipleConfigurations };
}
