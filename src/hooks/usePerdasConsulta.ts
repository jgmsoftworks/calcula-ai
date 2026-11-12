import { useCallback, useEffect, useState } from 'react';
import { usePerdas } from './usePerdas';
import type { FiltrosPerdas } from '@/lib/perdasData';
import type { Perda } from '@/types/perdas';

const SEM_FILTROS: FiltrosPerdas = {};

export function usePerdasConsulta(filters: FiltrosPerdas = SEM_FILTROS) {
  const { fetchPerdas } = usePerdas();
  const [perdas, setPerdas] = useState<Perda[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [revision, setRevision] = useState(0);
  const reload = useCallback(() => setRevision(value => value + 1), []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(false);
    setPerdas([]);
    fetchPerdas(filters)
      .then(data => { if (active) setPerdas(data); })
      .catch(() => { if (active) setError(true); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [filters, fetchPerdas, revision]);

  return { perdas, loading, error, reload };
}
