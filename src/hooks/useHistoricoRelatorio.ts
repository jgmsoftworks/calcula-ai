import { useEffect, useState } from 'react';
import { useMovimentacoes } from './useMovimentacoes';
import type { FiltrosHistoricoEstoque, MovimentoHistorico } from '@/lib/historicoEstoqueData';

// Callers keep draft filters separate and replace this object when Apply is clicked.
export function useHistoricoRelatorio(filters: FiltrosHistoricoEstoque) {
  const { fetchHistoricoGeral } = useMovimentacoes();
  const [movimentacoes, setMovimentacoes] = useState<MovimentoHistorico[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(false);
    setMovimentacoes([]);
    fetchHistoricoGeral(filters)
      .then(data => { if (active) setMovimentacoes(data); })
      .catch(() => { if (active) setError(true); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [filters, fetchHistoricoGeral]);

  return { movimentacoes, loading, error };
}
