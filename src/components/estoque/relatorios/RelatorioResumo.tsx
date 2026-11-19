import { MetricCard } from '@/components/ui/metric-card';
import { useTranslation } from 'react-i18next';
import { ArrowDownLeft, ArrowUpRight, Package, RefreshCw, Warehouse, Percent } from 'lucide-react';
import { BarChart, Bar, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Button } from '@/components/ui/button';
import { formatMoney, getBusinessRegion } from '@/lib/business-region';
import { useDashboardData } from '@/hooks/useDashboardData';
import { ReportHeading, ReportState } from './ReportLayout';

export function RelatorioResumo() {
  const { t, i18n } = useTranslation();
  const { data, refreshData } = useDashboardData();
  const { estoqueInicial } = data.cmvResult.breakdown;
  const month = new Intl.DateTimeFormat(i18n.resolvedLanguage, {
    month: 'long', year: 'numeric', timeZone: getBusinessRegion().timeZone,
  }).format(new Date());
  const activity = data.dailyMovements.some(day => day.entradas !== 0 || day.saidas !== 0);
  return <div className="report-view">
    <ReportHeading title={t('stockReports.monthly')} context={month}>
      <Button variant="outline" size="sm" onClick={refreshData} disabled={data.updating}>
        <RefreshCw size={15} className={data.updating ? 'animate-spin' : ''} />{t('dashboard.refresh')}
      </Button>
    </ReportHeading>
    {!data.hasData ? <ReportState loading={data.loading} error={!!data.error} empty={t('dashboard.noData')} retry={refreshData} /> : <>
      {data.error && <p role="alert">{t('home.refreshError')}</p>}
      <div className="report-metrics">
        <MetricCard label={t('dashboard.stockValue')} value={formatMoney(data.valorEmEstoque)} icon={Package} tone="azure" />
        <MetricCard label={t('dashboard.entries')} value={formatMoney(data.totalEntradasMes)} icon={ArrowDownLeft} tone="azure" />
        <MetricCard label={t('dashboard.exits')} value={formatMoney(data.totalSaidasMes)} icon={ArrowUpRight} tone="purple" />
      </div>
      <div className="report-overview">
        <section className="report-panel min-w-0">
          <div className="brand-line" aria-hidden="true" />
          <div className="report-panel-heading"><h2>{t('stockReports.daily')}</h2>
            <div className="report-legend"><span>{t('dashboard.entries')}</span><span>{t('dashboard.exits')}</span></div>
          </div>
          {activity ? <div className="report-chart">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart accessibilityLayer data={data.dailyMovements} margin={{ top: 10, right: 12, bottom: 0, left: 0 }} barGap={2}>
                <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeDasharray="3 4" />
                <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} tickMargin={8} fontSize={11} minTickGap={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} fontSize={11}
                  width={64} tickFormatter={v => formatMoney(v, { notation: 'compact', maximumFractionDigits: 1 })} />
                <Tooltip cursor={{ fill: 'hsl(var(--muted))' }}
                  itemStyle={{ color: 'hsl(var(--foreground))' }}
                  contentStyle={{ borderRadius: 10, background: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}
                  labelFormatter={day => t('dashboard.day') + ' ' + day}
                  formatter={(value: number, name: string) => [formatMoney(value), t(name === 'entradas' ? 'dashboard.entries' : 'dashboard.exits')]} />
                <Bar isAnimationActive={false} dataKey="entradas" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} maxBarSize={14} />
                <Bar isAnimationActive={false} dataKey="saidas" fill="hsl(var(--accent))" radius={[3, 3, 0, 0]} maxBarSize={14} />
              </BarChart>
            </ResponsiveContainer>
          </div> : <ReportState loading={false} empty={t('stockReports.noDaily')} />}
        </section>
        <section className="report-reference" aria-label={t('stockReports.indicators')}>
          <MetricCard label={t('stockReports.opening')} icon={Warehouse}
            value={estoqueInicial === null ? '—' : formatMoney(estoqueInicial)}
            note={estoqueInicial === null ? t('stockReports.missingClosing') : t('stockReports.previousClosing')} />
          <MetricCard label={t('dashboard.cmvPercent')} icon={Percent} tone="blue"
            value={data.cmvMedioReceitas === null ? '—' : new Intl.NumberFormat(getBusinessRegion().locale, {
              style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1,
            }).format(data.cmvMedioReceitas / 100)}
            note={data.cmvMedioReceitas === null ? t('dashboard.noPricedRecipes') : undefined}
            details={t('dashboard.cmvAverageHint')} detailsLabel={t('stockReports.about', { label: t('dashboard.cmvPercent') })} />
        </section>
      </div>
    </>}
  </div>;
}
