import { AdminMetrics } from '@/hooks/useAdminDashboardMetrics';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface Props {
  metrics: AdminMetrics;
}

const fmt = (v: number) => v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const AdminChannelComparison = ({ metrics }: Props) => {
  if (metrics.channels.length === 0) return null;

  return (
    <div className="rounded-2xl border border-border/30 bg-card shadow-soft overflow-hidden">
      <div className="p-5 border-b border-border/30">
        <h3 className="text-lg font-semibold font-display">Comparativo de Canais</h3>
        <p className="text-xs text-muted-foreground mt-0.5">Performance por canal de aquisição</p>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-border/30">
              <TableHead className="text-[10px] uppercase tracking-wider font-semibold">Canal</TableHead>
              <TableHead className="text-[10px] uppercase tracking-wider font-semibold text-right">Leads</TableHead>
              <TableHead className="text-[10px] uppercase tracking-wider font-semibold text-right">Conversões</TableHead>
              <TableHead className="text-[10px] uppercase tracking-wider font-semibold text-right">Conv. %</TableHead>
              <TableHead className="text-[10px] uppercase tracking-wider font-semibold text-right">Receita</TableHead>
              <TableHead className="text-[10px] uppercase tracking-wider font-semibold text-right">Custo</TableHead>
              <TableHead className="text-[10px] uppercase tracking-wider font-semibold text-right">CPL</TableHead>
              <TableHead className="text-[10px] uppercase tracking-wider font-semibold text-right">LTV</TableHead>
              <TableHead className="text-[10px] uppercase tracking-wider font-semibold text-right">LTV/CAC</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {metrics.channels.map((ch) => (
              <TableRow key={ch.name} className="border-border/20 hover:bg-muted/30 transition-colors">
                <TableCell className="font-medium text-sm">{ch.name}</TableCell>
                <TableCell className="text-right text-sm tabular-nums">{ch.leads.toLocaleString('pt-BR')}</TableCell>
                <TableCell className="text-right text-sm tabular-nums">{ch.conversions}</TableCell>
                <TableCell className="text-right text-sm tabular-nums">
                  <span className={ch.conversionRate > 5 ? 'text-green-600' : 'text-muted-foreground'}>
                    {ch.conversionRate.toFixed(1)}%
                  </span>
                </TableCell>
                <TableCell className="text-right text-sm tabular-nums font-medium">R$ {fmt(ch.revenue)}</TableCell>
                <TableCell className="text-right text-sm tabular-nums">R$ {fmt(ch.cost)}</TableCell>
                <TableCell className="text-right text-sm tabular-nums">R$ {fmt(ch.cpl)}</TableCell>
                <TableCell className="text-right text-sm tabular-nums">R$ {fmt(ch.ltv)}</TableCell>
                <TableCell className="text-right text-sm tabular-nums">
                  <span className={ch.ltvCac > 3 ? 'text-green-600 font-semibold' : ch.ltvCac > 1 ? 'text-foreground' : 'text-destructive'}>
                    {ch.ltvCac > 0 ? `${ch.ltvCac.toFixed(1)}x` : '—'}
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
