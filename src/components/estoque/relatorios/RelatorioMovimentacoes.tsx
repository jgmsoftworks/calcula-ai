import { useMemo, useState } from 'react';
import { MetricCard } from '@/components/ui/metric-card';
import { useTranslation } from 'react-i18next';
import { formatInTimeZone } from 'date-fns-tz';
import { Label } from '@/components/ui/label';
import { useHistoricoRelatorio } from '@/hooks/useHistoricoRelatorio';
import type { FiltrosHistoricoEstoque } from '@/lib/historicoEstoqueData';
import { formatNumber } from '@/lib/formatters';
import { useExportRelatorioEstoque, type ColunaExport } from '@/hooks/useExportRelatorioEstoque';
import { ArrowDownLeft, ArrowUpRight, ArrowLeftRight, Scale } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { getBusinessRegion, formatMoney, formatRegionalDate } from '@/lib/business-region';
import { ReportExports, ReportHeading, ReportPeriodFilters, ReportState } from './ReportLayout';

export function RelatorioMovimentacoes() {
  const { t } = useTranslation();
  const { exportando, exportarRelatorioExcel, exportarRelatorioPDF } = useExportRelatorioEstoque();
  const [dataInicio, setDataInicio] = useState(() => formatInTimeZone(new Date(), getBusinessRegion().timeZone, "yyyy-MM-01"));
  const [dataFim, setDataFim] = useState(() => formatInTimeZone(new Date(), getBusinessRegion().timeZone, "yyyy-MM-dd"));
  const [tipo, setTipo] = useState<string>('todos');
  const [responsavel, setResponsavel] = useState('');
  const readFilters = (): FiltrosHistoricoEstoque => ({
    dataInicio: dataInicio || undefined,
    dataFim: dataFim || undefined,
    tipo: tipo === 'entrada' || tipo === 'saida' ? tipo : undefined,
    responsavel: responsavel.trim() || undefined,
  });
  const [filtrosAplicados, setFiltrosAplicados] = useState(readFilters);
  const { movimentacoes: movs, loading, error } = useHistoricoRelatorio(filtrosAplicados);
  const load = () => setFiltrosAplicados(readFilters());

  const rows = useMemo(() => movs.map((m) => ({
    id: m.origem_estoque + m.id,
    data: formatRegionalDate(m.data_hora, { dateStyle: "short", timeStyle: "short" }),
    produto: m.produtos?.nome || '-',
    tipo: m.tipo,
    quantidade: m.quantidade || 0,
    custo: m.custo_aplicado || 0,
    valor: m.subtotal || 0,
    motivo: m.motivo || '-',
    responsavel: m.responsavel || '-',
  })), [movs]);

  const resumo = useMemo(() => {
    const r = { qtdEntrada: 0, qtdSaida: 0, valEntrada: 0, valSaida: 0 };
    rows.forEach((x) => {
      if (x.tipo === 'entrada') { r.qtdEntrada += x.quantidade; r.valEntrada += x.valor; }
      else if (x.tipo === 'saida') { r.qtdSaida += x.quantidade; r.valSaida += x.valor; }
    });
    return r;
  }, [rows]);

  const colunas: ColunaExport[] = [
    { key: 'data', header: 'Data', width: 2.4 },
    { key: 'produto', header: 'Produto', width: 3.5 },
    { key: 'tipo', header: 'Tipo', width: 1, align: 'center' },
    { key: 'quantidade', header: 'Qtd.', width: 1.2, format: 'number' },
    { key: 'custo', header: 'Custo Un.', width: 1.6, format: 'currency' },
    { key: 'valor', header: 'Valor Total', width: 1.8, format: 'currency' },
    { key: 'motivo', header: 'Motivo', width: 2 },
    { key: 'responsavel', header: 'Responsável', width: 2 },
  ];

  const filtrosTxt = [
    `Período: ${filtrosAplicados.dataInicio || ""} a ${filtrosAplicados.dataFim || ""}`,
    `Tipo: ${filtrosAplicados.tipo || 'Todos'}`,
    filtrosAplicados.responsavel ? `Responsável: ${filtrosAplicados.responsavel}` : '',
  ].filter(Boolean);

  const totaisExport = {
    'Entradas (qtd)': formatNumber(resumo.qtdEntrada, 2),
    [`Entradas (${getBusinessRegion().currency})`]: `${formatMoney(resumo.valEntrada)}`,
    'Saídas (qtd)': formatNumber(resumo.qtdSaida, 2),
    [`Saídas (${getBusinessRegion().currency})`]: `${formatMoney(resumo.valSaida)}`,
    [`Saldo líquido (${getBusinessRegion().currency})`]: `${formatMoney(resumo.valEntrada - resumo.valSaida)}`,
  };

  const meta = { titulo: 'Movimentações por Período', filtros: filtrosTxt };
  const ready = !loading && !error;
  return <div className="report-view">
    <ReportHeading title={t('stockReports.movementsTitle')}>
      <ReportExports busy={exportando} disabled={!ready}
        excel={() => exportarRelatorioExcel(meta, colunas, rows, totaisExport)}
        pdf={() => exportarRelatorioPDF(meta, colunas, rows, totaisExport)} />
    </ReportHeading>
    <ReportPeriodFilters start={dataInicio} end={dataFim} type={tipo} setStart={setDataInicio}
      setEnd={setDataFim} setType={setTipo} apply={load}>
      <div><Label htmlFor="report-person">{t('stockReports.person')}</Label>
        <Input id="report-person" value={responsavel} onChange={e => setResponsavel(e.target.value)} placeholder={t('stockReports.name')} /></div>
    </ReportPeriodFilters>
    <div className="report-metrics">
      <MetricCard label={t('dashboard.entries')} value={ready ? formatMoney(resumo.valEntrada) : '—'} icon={ArrowDownLeft} tone="azure"
        note={ready ? t('stockReports.movedQuantity', { quantity: formatNumber(resumo.qtdEntrada, 2) }) : undefined} />
      <MetricCard label={t('dashboard.exits')} value={ready ? formatMoney(resumo.valSaida) : '—'} icon={ArrowUpRight} tone="purple"
        note={ready ? t('stockReports.movedQuantity', { quantity: formatNumber(resumo.qtdSaida, 2) }) : undefined} />
      <MetricCard label={t('stockReports.net')} value={ready ? formatMoney(resumo.valEntrada - resumo.valSaida) : '—'} icon={Scale} tone="blue" />
      <MetricCard label={t('stockReports.movimentacoes')} value={ready ? formatNumber(rows.length, 0) : '—'} icon={ArrowLeftRight} />
    </div>
    <section className="report-panel">
      {ready && rows.length ? <div className="report-list">
        <table className="report-table"><caption className="sr-only">{t('stockReports.movementsTitle')}</caption>
          <thead><tr>{['productDate', 'type', 'quantity', 'cost', 'total', 'personReason'].map(key =>
            <th key={key} scope="col">{t('stockReports.' + key)}</th>)}</tr></thead>
          <tbody>{rows.map(r => <tr key={r.id}>
            <th scope="row"><strong>{r.produto}</strong><small>{r.data}</small></th>
            <td className="report-tag-cell"><span className={'report-tag ' + (r.tipo === 'entrada' ? 'movement-in' : 'movement-out')}>
              {t(r.tipo === 'entrada' ? 'stockReports.entry' : 'stockReports.exit')}</span></td>
            <td data-label={t('stockReports.quantity')}>{formatNumber(r.quantidade, 2)}</td>
            <td data-label={t('stockReports.cost')}>{formatMoney(r.custo)}</td>
            <td data-label={t('stockReports.total')}><b>{formatMoney(r.valor)}</b></td>
            <td className="report-detail" data-label={t('stockReports.personReason')}>{r.responsavel}<small>{r.motivo}</small></td>
          </tr>)}</tbody>
        </table>
      </div> : <ReportState loading={loading} error={error} retry={load} empty={t('stockReports.noMovement')} />}
    </section>
  </div>;
}
