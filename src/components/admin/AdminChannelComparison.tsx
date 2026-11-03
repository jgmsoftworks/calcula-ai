import type { AdminMetrics } from '@/hooks/useAdminDashboardMetrics';
export const AdminChannelComparison = ({ metrics }: { metrics: AdminMetrics }) => {
  if (metrics.error) return null;
  return <section className="rounded-2xl border p-5 space-y-3">
    <h3 className="text-lg font-semibold">Atividade dos links de afiliados</h3>
    <p className="text-xs text-muted-foreground">Contadores dos links. Receita, CAC, ROAS e LTV por canal indisponíveis até conciliar pagamentos, atribuição e custos. Cadastros sem vínculo não são classificados como orgânicos.</p>
    {metrics.channels.length > 0 ? <table className="w-full text-sm">
      <thead><tr><th scope="col" className="text-left py-2">Canal</th><th scope="col" className="text-right">Cliques</th><th scope="col" className="text-right">Conversões registradas no link</th></tr></thead>
      <tbody>{metrics.channels.map(ch => <tr key={ch.name} className="border-t">
        <th scope="row" className="text-left py-2 font-normal">{ch.name}</th><td className="text-right">{ch.clicks}</td><td className="text-right">{ch.conversions}</td>
      </tr>)}</tbody>
    </table> : <p className="text-sm text-muted-foreground">Sem atividade de links disponível.</p>}
  </section>;
};
