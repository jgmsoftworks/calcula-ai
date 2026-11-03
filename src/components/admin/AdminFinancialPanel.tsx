import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { financialMoney, type StripeDashboardData } from '@/lib/adminFinancial';

export function AdminFinancialPanel({ data, error, showTransactions = false }: { data: StripeDashboardData | null; error?: string | null; showTransactions?: boolean }) {
  const [source, setSource] = useState('current');
  const [currency, setCurrency] = useState('brl');
  if (error || !data) return <p role="alert" className="rounded-xl border p-4 text-sm">{error ?? 'Dados financeiros indisponíveis.'}</p>;
  const account = source === 'legacy' && data.legacy ? data.legacy : data.current;
  const report = account.financial;
  const metric = report?.currencies.find(c => c.currency === currency) ?? report?.currencies[0];
  const money = (value: number | null) => financialMoney(value, metric?.currency ?? 'brl');
  const cards = metric ? [
    { label: 'MRR adimplente', value: money(metric.mrr), hint: metric.mrrReason ?? 'Contratos ativos com pagamento confirmado. Anuais divididos por 12; inadimplentes e testes excluídos.' },
    { label: 'ARR projetado', value: money(metric.arr), hint: 'MRR × 12. Projeção recorrente, não dinheiro recebido.' },
    { label: 'Clientes pagantes ativos', value: String(metric.payingCustomers), hint: `${metric.paidSubscriptions} assinaturas pagas. Clientes Stripe distintos nesta moeda e conta.` },
    { label: 'ARPU mensal', value: money(metric.arpu), hint: 'MRR ÷ clientes pagantes ativos.' },
    { label: 'Churn da base — 30 dias', value: metric.churnRate == null ? 'Indisponível' : `${metric.churnRate.toFixed(1)}%`, hint: metric.churnReason ?? `${metric.churnedCustomers} de ${metric.churnBase} clientes da base inicial sem assinatura ao fim. Atraso isolado não é churn.` },
    { label: 'LTV de receita estimado', value: money(metric.ltv), hint: metric.ltvReason ?? 'ARPU ÷ churn de 30 dias. Estimativa sensível ao tamanho da base; sem ajuste de margem.' },
    { label: 'Recebido bruto — 30 dias', value: money(metric.grossReceived30d), hint: 'Cobranças efetivamente capturadas no Stripe, antes de taxas e reembolsos. Inclui pagamentos avulsos.' },
    { label: 'Reembolsado — 30 dias', value: money(metric.refunded30d), hint: 'Reembolsos concluídos no período, inclusive de cobranças antigas.' },
    { label: 'Recebido após reembolsos', value: money(metric.netReceived30d), hint: 'Últimos 30 dias. Bruto menos reembolsos, antes de taxas, impostos e disputas.' },
    { label: 'Assinaturas em atraso', value: String(metric.pastDueSubscriptions), hint: 'Fora do MRR adimplente; não contam como cancelamento enquanto estão em recuperação de cobrança.' },
  ] : [];
  return <section className="space-y-4" aria-label="Indicadores financeiros">
    <div className="rounded-xl border p-4 space-y-2 text-sm">
      <p className="font-medium">Contratos e pagamentos reais do Stripe</p>
      <p className="text-muted-foreground">{data.scopeNote}</p>
      <div className="flex flex-wrap items-center gap-4">
        <label>Conta <select aria-label="Conta financeira" className="ml-2 rounded border bg-background p-1" value={source} onChange={e => setSource(e.target.value)}>
          <option value="current">Atual — {data.current.account?.name ?? 'Stripe'}</option>
          {data.legacy && <option value="legacy">Legada — {data.legacy.account?.name ?? 'Stripe'}</option>}
        </select></label>
        {report && <label>Moeda <select aria-label="Moeda financeira" className="ml-2 rounded border bg-background p-1" value={metric?.currency} onChange={e => setCurrency(e.target.value)}>
          {report.currencies.map(c => <option key={c.currency} value={c.currency}>{c.currency.toUpperCase()}</option>)}
        </select></label>}
      </div>
      {report && <p className="text-xs text-muted-foreground">Atualizado em {new Date(report.generatedAt).toLocaleString('pt-BR')}. Valores por moeda, sem conversão cambial. Datas financeiras em UTC.</p>}
    </div>
    {account.error || !metric ? <p role="alert">{account.error ?? 'Dados financeiros indisponíveis.'}</p> : <>
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(card => <Card key={card.label} className="glass-card"><CardContent className="p-4 space-y-2">
          <p className="text-xs font-medium text-muted-foreground">{card.label}</p>
          <p className="text-xl font-bold font-display">{card.value}</p>
          <p className="text-xs text-muted-foreground">{card.hint}</p>
        </CardContent></Card>)}
      </div>
      {report.warnings.map(warning => <p key={warning} className="text-sm text-muted-foreground">{warning}</p>)}
      <Card><CardContent className="p-4 overflow-x-auto">
        <h3 className="font-semibold mb-1">Histórico de recebimentos</h3>
        <p className="text-xs text-muted-foreground mb-3">Movimentações confirmadas, por mês UTC. O mês atual está em andamento. Valores antes de taxas; não é histórico de MRR.</p>
        <table className="w-full text-sm"><thead><tr className="border-b">
          <th scope="col" className="text-left p-2">Mês</th><th scope="col" className="text-right p-2">Bruto</th>
          <th scope="col" className="text-right p-2">Reembolsos</th><th scope="col" className="text-right p-2">Após reembolsos</th>
        </tr></thead><tbody>{metric.revenueHistory.map(row => <tr key={row.month} className="border-b last:border-0">
          <th scope="row" className="text-left p-2 font-normal">{row.month}</th><td className="text-right p-2">{money(row.gross)}</td>
          <td className="text-right p-2">{money(row.refunds)}</td><td className="text-right p-2">{money(row.net)}</td>
        </tr>)}</tbody></table>
      </CardContent></Card>
      {showTransactions && <Card><CardContent className="p-4 space-y-4 overflow-x-auto">
        <h3 className="font-semibold">Saldo e últimas cobranças</h3>
        {(account.balances ?? []).map(balance => <p key={balance.currency} className="text-sm">
          {balance.currency.toUpperCase()}: disponível {financialMoney(balance.available, balance.currency)} · pendente {financialMoney(balance.pending, balance.currency)}
        </p>)}
        <table className="w-full text-sm"><thead><tr className="border-b">
          <th scope="col" className="text-left p-2">Data</th><th scope="col" className="text-left p-2">Cliente</th>
          <th scope="col" className="text-left p-2">Status</th><th scope="col" className="text-right p-2">Valor</th>
        </tr></thead><tbody>{(account.recent_charges ?? []).map(charge => <tr key={charge.id} className="border-b">
          <td className="p-2">{new Date(charge.created * 1000).toLocaleDateString('pt-BR')}</td><td className="p-2">{charge.customer_email ?? '—'}</td>
          <td className="p-2">{charge.status}</td><td className="text-right p-2">{financialMoney(charge.amount, charge.currency)}</td>
        </tr>)}</tbody></table>
        {!account.recent_charges?.length && <p className="text-sm text-muted-foreground">Sem cobranças recentes.</p>}
      </CardContent></Card>}
    </>}
  </section>;
}
