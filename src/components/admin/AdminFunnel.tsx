import type { AdminMetrics } from '@/hooks/useAdminDashboardMetrics';
export const AdminFunnel = ({ metrics }: { metrics: AdminMetrics }) => {
  if (metrics.error) return <p role="alert">{metrics.error}</p>;
  const rows = [ ['Cadastros não administrativos', metrics.totalCadastros], ['Usuários com login registrado', metrics.usuariosComLogin],
    ['Usuários com login nos últimos 30 dias', metrics.usuariosAtivos], ['Afiliados ativos', metrics.totalAfiliados] ] as const;
  return <section className="rounded-2xl border p-6 space-y-4">
    <h3 className="text-lg font-semibold">Cadastro e atividade</h3>
    <p className="text-xs text-muted-foreground">Estes dados medem uso. Não indicam pagamento, receita ou churn de assinatura.</p>
    <dl className="space-y-3">{rows.map(([label, value]) => <div key={label} className="flex justify-between gap-3 text-sm">
      <dt>{label}</dt><dd className="font-semibold">{value.toLocaleString('pt-BR')}</dd>
    </div>)}</dl>
  </section>;
};
