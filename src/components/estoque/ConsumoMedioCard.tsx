import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, BarChart3 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { formatNumber } from '@/lib/formatters';
import { Skeleton } from '@/components/ui/skeleton';

interface ConsumoMedioCardProps {
  produtoId: string;
  unidade: string;
}

export function ConsumoMedioCard({ produtoId, unidade }: ConsumoMedioCardProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [entradas, setEntradas] = useState(0);
  const [saidas, setSaidas] = useState(0);

  useEffect(() => {
    if (!user || !produtoId) return;

    const load = async () => {
      setLoading(true);
      const desde = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from('movimentacoes')
        .select('tipo, quantidade')
        .eq('produto_id', produtoId)
        .eq('user_id', user.id)
        .gte('data_hora', desde);

      if (!error && data) {
        let e = 0, s = 0;
        for (const m of data) {
          const q = Number(m.quantidade) || 0;
          if (m.tipo === 'entrada') e += q;
          else if (m.tipo === 'saida') s += q;
        }
        setEntradas(e);
        setSaidas(s);
      }
      setLoading(false);
    };

    load();
  }, [produtoId, user]);

  if (loading) {
    return (
      <div className="rounded-lg bg-muted/30 p-3 space-y-2">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-full" />
      </div>
    );
  }

  const semMovimento = entradas === 0 && saidas === 0;
  const mediaMensal = saidas / 3;

  return (
    <div className="rounded-lg bg-muted/30 p-3 space-y-2 border border-border/50">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        Consumo (90 dias)
      </p>

      {semMovimento ? (
        <p className="text-xs text-muted-foreground italic">
          Sem movimentações nos últimos 90 dias
        </p>
      ) : (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <TrendingUp className="h-3.5 w-3.5 text-green-600" />
              Entradas
            </span>
            <span className="font-medium">
              {formatNumber(entradas, 2)} {unidade}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <TrendingDown className="h-3.5 w-3.5 text-red-600" />
              Saídas
            </span>
            <span className="font-medium">
              {formatNumber(saidas, 2)} {unidade}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs pt-1.5 border-t border-border/50">
            <span className="flex items-center gap-1.5 text-foreground font-medium">
              <BarChart3 className="h-3.5 w-3.5 text-primary" />
              Média/mês
            </span>
            <span className="font-semibold text-primary">
              {formatNumber(mediaMensal, 2)} {unidade}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
