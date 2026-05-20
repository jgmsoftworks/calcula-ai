/**
 * Logger central — silencia debug/info em produção sem perder warn/error.
 *
 * Ativar logs em produção (no DevTools):
 *   localStorage.setItem('debug', '*')         // tudo
 *   localStorage.setItem('debug', 'markup,auth') // namespaces específicos
 *   localStorage.removeItem('debug')            // desliga
 */

type Level = 'debug' | 'info' | 'warn' | 'error';

const isDev = typeof import.meta !== 'undefined' && (import.meta as any).env?.DEV;

function getEnabledNamespaces(): string[] | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem('debug');
    if (!raw) return null;
    return raw.split(',').map((s) => s.trim()).filter(Boolean);
  } catch {
    return null;
  }
}

function shouldLog(level: Level, namespace: string): boolean {
  if (level === 'warn' || level === 'error') return true;
  if (isDev) return true;
  const enabled = getEnabledNamespaces();
  if (!enabled) return false;
  return enabled.includes('*') || enabled.includes(namespace);
}

export function createLogger(namespace: string) {
  const prefix = `[${namespace.toUpperCase()}]`;
  return {
    debug: (...args: unknown[]) => {
      if (shouldLog('debug', namespace)) console.log(prefix, ...args);
    },
    info: (...args: unknown[]) => {
      if (shouldLog('info', namespace)) console.info(prefix, ...args);
    },
    warn: (...args: unknown[]) => {
      if (shouldLog('warn', namespace)) console.warn(prefix, ...args);
    },
    error: (...args: unknown[]) => {
      if (shouldLog('error', namespace)) console.error(prefix, ...args);
    },
  };
}

export const logger = createLogger('app');
