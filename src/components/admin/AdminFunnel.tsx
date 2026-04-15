import { AdminMetrics } from '@/hooks/useAdminDashboardMetrics';
import { ArrowDown } from 'lucide-react';

interface Props {
  metrics: AdminMetrics;
}

const funnelSteps = (m: AdminMetrics) => [
  { label: 'Cadastros Totais', value: m.totalCadastros, color: 'from-[hsl(205,96%,60%)] to-[hsl(205,96%,46%)]' },
  { label: 'Email Verificado', value: m.emailVerificados, color: 'from-[hsl(228,63%,58%)] to-[hsl(228,63%,48%)]' },
  { label: 'Usuários Ativos (30d)', value: m.usuariosAtivos, color: 'from-[hsl(273,63%,52%)] to-[hsl(273,63%,42%)]' },
  { label: 'Assinantes Pagos', value: m.assinantes, color: 'from-[hsl(315,82%,48%)] to-[hsl(315,82%,38%)]' },
  { label: 'Enterprise', value: m.enterprise, color: 'from-[hsl(340,91%,55%)] to-[hsl(340,91%,45%)]' },
];

export const AdminFunnel = ({ metrics }: Props) => {
  const steps = funnelSteps(metrics);
  const maxWidth = 100;
  const minWidth = 36;

  return (
    <div className="rounded-2xl border border-border/30 bg-card p-6 shadow-soft">
      <h3 className="text-lg font-semibold font-display mb-6">Funil de Conversão</h3>
      <div className="flex flex-col items-center gap-1">
        {steps.map((step, i) => {
          const widthPct = maxWidth - ((maxWidth - minWidth) / (steps.length - 1)) * i;
          const prevValue = i > 0 ? steps[i - 1].value : step.value;
          const convRate = prevValue > 0 ? ((step.value / prevValue) * 100).toFixed(1) : '0.0';
          const totalRate = steps[0].value > 0 ? ((step.value / steps[0].value) * 100).toFixed(1) : '0.0';

          return (
            <div key={step.label} className="w-full flex flex-col items-center">
              {i > 0 && (
                <div className="flex items-center gap-2 py-1 text-xs text-muted-foreground">
                  <ArrowDown className="h-3 w-3" />
                  <span className="font-medium">{convRate}%</span>
                </div>
              )}
              <div
                className={`bg-gradient-to-r ${step.color} rounded-xl py-3.5 px-4 flex items-center justify-between transition-all duration-300 hover:scale-[1.02] hover:shadow-lg cursor-default`}
                style={{ width: `${widthPct}%` }}
              >
                <span className="text-white/90 text-xs font-medium truncate">{step.label}</span>
                <div className="flex items-center gap-2">
                  <span className="text-white text-xl font-bold font-display">{step.value.toLocaleString('pt-BR')}</span>
                  {i > 0 && (
                    <span className="text-white/60 text-[10px] font-medium bg-white/10 rounded-full px-1.5 py-0.5">
                      {totalRate}%
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
