import { AdminMetrics } from '@/hooks/useAdminDashboardMetrics';
import { Card, CardContent } from '@/components/ui/card';
import { DollarSign, TrendingUp, Users, Target, BarChart3, Percent, Repeat, Award } from 'lucide-react';

interface Props {
  metrics: AdminMetrics;
}

const fmt = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtPct = (v: number) => `${v.toFixed(1)}%`;

export const AdminKPICards = ({ metrics }: Props) => {
  const kpis = [
    { label: 'MRR', value: fmt(metrics.mrr), icon: DollarSign, gradient: 'from-[#0483e4] to-[#2c4dc7]', iconBg: 'bg-[#0483e4]/10', iconColor: 'text-[#0483e4]' },
    { label: 'ARR', value: fmt(metrics.arr), icon: TrendingUp, gradient: 'from-[#2c4dc7] to-[#7328b1]', iconBg: 'bg-[#2c4dc7]/10', iconColor: 'text-[#2c4dc7]' },
    { label: 'Ticket Médio', value: fmt(metrics.ticketMedio), icon: Target, gradient: 'from-[#7328b1] to-[#af1188]', iconBg: 'bg-[#7328b1]/10', iconColor: 'text-[#7328b1]' },
    { label: 'Churn Estimado', value: fmtPct(metrics.churnRate), icon: Percent, gradient: 'from-[#dd0b52] to-[#f96e0c]', iconBg: 'bg-[#dd0b52]/10', iconColor: 'text-[#dd0b52]' },
    { label: 'LTV Estimado', value: fmt(metrics.ltv), icon: Repeat, gradient: 'from-[#16a34a] to-[#15803d]', iconBg: 'bg-[#16a34a]/10', iconColor: 'text-[#16a34a]' },
    { label: 'Conversão', value: fmtPct(metrics.totalCadastros > 0 ? (metrics.assinantes / metrics.totalCadastros) * 100 : 0), icon: BarChart3, gradient: 'from-[#0483e4] to-[#7328b1]', iconBg: 'bg-[#0483e4]/10', iconColor: 'text-[#0483e4]' },
    { label: 'Afiliados Ativos', value: metrics.totalAfiliados.toString(), icon: Users, gradient: 'from-[#af1188] to-[#dd0b52]', iconBg: 'bg-[#af1188]/10', iconColor: 'text-[#af1188]' },
    { label: 'ROAS Afiliados', value: metrics.roas > 0 ? `${metrics.roas.toFixed(1)}x` : 'N/A', icon: Award, gradient: 'from-[#f96e0c] to-[#dd0b52]', iconBg: 'bg-[#f96e0c]/10', iconColor: 'text-[#f96e0c]' },
  ];

  return (
    <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
      {kpis.map((kpi, i) => {
        const Icon = kpi.icon;
        return (
          <Card key={kpi.label} className="glass-card overflow-hidden group hover:shadow-elevated transition-all duration-300 animate-slide-up" style={{ animationDelay: `${i * 50}ms` }}>
            <div className={`h-1 bg-gradient-to-r ${kpi.gradient}`} />
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="space-y-1.5 flex-1 min-w-0">
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{kpi.label}</p>
                  <p className="text-xl font-bold font-display text-foreground truncate">{kpi.value}</p>
                </div>
                <div className={`p-2 rounded-lg ${kpi.iconBg} group-hover:scale-110 transition-transform shrink-0`}>
                  <Icon className={`h-4 w-4 ${kpi.iconColor}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
