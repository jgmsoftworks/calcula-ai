import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { TrendingDown, Info, AlertTriangle } from 'lucide-react';
import { formatBRL } from '@/lib/formatters';
import type { CmvResult } from '@/lib/cmvCalculations';

interface CmvCardProps {
  cmvResult: CmvResult;
  animationDelay?: string;
}

export function CmvCard({ cmvResult, animationDelay = '0ms' }: CmvCardProps) {
  const { cmvDisponivel, cmvValor, cmvPercentual, breakdown } = cmvResult;

  return (
    <Card
      className="glass-card overflow-hidden group hover:shadow-elevated transition-all duration-300 animate-slide-up"
      style={{ animationDelay }}
    >
      {/* Top gradient accent */}
      <div className="h-1 bg-gradient-to-r from-[#f96e0c] to-[#dd0b52]" />
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                CMV (mês atual)
              </p>
              {/* Popover de breakdown */}
              <Popover>
                <PopoverTrigger asChild>
                  <button className="text-muted-foreground/60 hover:text-muted-foreground transition-colors">
                    <Info className="h-3.5 w-3.5" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-72 p-4" side="bottom" align="start">
                  <BreakdownContent breakdown={breakdown} cmvValor={cmvValor} cmvPercentual={cmvPercentual} cmvDisponivel={cmvDisponivel} />
                </PopoverContent>
              </Popover>
            </div>

            {cmvDisponivel && cmvValor !== null ? (
              <>
                <div className="flex items-baseline gap-2">
                  <p className="text-2xl font-bold font-display text-foreground">
                    R$ {formatBRL(cmvValor)}
                  </p>
                  {cmvPercentual !== null ? (
                    <Badge variant="secondary" className="text-xs font-medium px-1.5 py-0.5 rounded-md">
                      {cmvPercentual.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs font-medium px-1.5 py-0.5 rounded-md text-muted-foreground">
                      % pendente
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  EI + Compras − EF
                </p>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  <p className="text-sm font-medium text-foreground">
                    Indisponível
                  </p>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Aguardando fechamento do estoque do mês anterior
                </p>
              </>
            )}
          </div>
          <div className="p-2.5 rounded-xl bg-[#f96e0c]/10 group-hover:scale-110 transition-transform">
            <TrendingDown className="h-5 w-5 text-[#f96e0c]" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Componente interno para o breakdown detalhado
function BreakdownContent({
  breakdown,
  cmvValor,
  cmvPercentual,
  cmvDisponivel,
}: {
  breakdown: CmvResult['breakdown'];
  cmvValor: number | null;
  cmvPercentual: number | null;
  cmvDisponivel: boolean;
}) {
  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold text-foreground">Memória de cálculo</p>
      <div className="space-y-1.5 text-xs">
        <Row
          label="Estoque inicial"
          value={breakdown.estoqueInicial !== null ? `R$ ${formatBRL(breakdown.estoqueInicial)}` : '—'}
          muted={breakdown.estoqueInicial === null}
        />
        <Row label="(+) Compras líquidas" value={`R$ ${formatBRL(breakdown.comprasLiquidas)}`} />
        <Row label="(−) Estoque final" value={`R$ ${formatBRL(breakdown.estoqueFinal)}`} />
        <div className="border-t border-border my-1.5" />
        <Row
          label="(=) CMV"
          value={cmvDisponivel && cmvValor !== null ? `R$ ${formatBRL(cmvValor)}` : '—'}
          bold
          muted={!cmvDisponivel}
        />
        <div className="border-t border-border my-1.5" />
        <Row
          label="Faturamento líquido"
          value={breakdown.faturamentoLiquido !== null ? `R$ ${formatBRL(breakdown.faturamentoLiquido)}` : '—'}
          muted={breakdown.faturamentoLiquido === null}
        />
        <Row
          label="CMV %"
          value={
            cmvPercentual !== null
              ? `${cmvPercentual.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`
              : '—'
          }
          muted={cmvPercentual === null}
        />
      </div>

      {!cmvDisponivel && (
        <p className="text-[10px] text-amber-600 dark:text-amber-400 leading-relaxed mt-2">
          Realize o fechamento do mês anterior para habilitar o cálculo do CMV.
        </p>
      )}

      {cmvDisponivel && breakdown.faturamentoLiquido === null && (
        <p className="text-[10px] text-muted-foreground leading-relaxed mt-2">
          CMV% será calculado quando houver vendas registradas no mês.
        </p>
      )}
    </div>
  );
}

function Row({
  label,
  value,
  bold = false,
  muted = false,
}: {
  label: string;
  value: string;
  bold?: boolean;
  muted?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className={`${muted ? 'text-muted-foreground/60' : 'text-muted-foreground'} ${bold ? 'font-semibold' : ''}`}>
        {label}
      </span>
      <span className={`font-mono ${muted ? 'text-muted-foreground/60' : 'text-foreground'} ${bold ? 'font-bold' : 'font-medium'}`}>
        {value}
      </span>
    </div>
  );
}
