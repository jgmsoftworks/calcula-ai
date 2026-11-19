import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatInTimeZone } from 'date-fns-tz';
import { Label } from '@/components/ui/label';
import { useHistoricoRelatorio } from '@/hooks/useHistoricoRelatorio';
import type { FiltrosHistoricoEstoque } from '@/lib/historicoEstoqueData';
import { formatNumber } from '@/lib/formatters';
import { useExportRelatorioEstoque, type ColunaExport } from '@/hooks/useExportRelatorioEstoque';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getBusinessRegion, formatMoney } from '@/lib/business-region';
import { ReportExports, ReportHeading, ReportPeriodFilters, ReportState } from './ReportLayout';

export function RelatorioRanking() {
  const { t } = useTranslation();
  const { exportando, exportarRelatorioExcel, exportarRelatorioPDF } = useExportRelatorioEstoque();
  const [dataInicio, setDataInicio] = useState(() => formatInTimeZone(new Date(), getBusinessRegion().timeZone, "yyyy-MM-01"));
  const [dataFim, setDataFim] = useState(() => formatInTimeZone(new Date(), getBusinessRegion().timeZone, "yyyy-MM-dd"));
  const [tipo, setTipo] = useState<string>('saida');
  const [topN, setTopN] = useState('10');
  const readFilters = (): FiltrosHistoricoEstoque => ({
    dataInicio: dataInicio || undefined,
    dataFim: dataFim || undefined,
    tipo: tipo === 'entrada' || tipo === 'saida' ? tipo : undefined,
  });
  const [filtrosAplicados, setFiltrosAplicados] = useState(readFilters);
  const { movimentacoes: movs, loading, error } = useHistoricoRelatorio(filtrosAplicados);
  const load = () => setFiltrosAplicados(readFilters());

  const rows = useMemo(() => {
    const map = new Map<string, { produto: string; qtd: number; vezes: number; valor: number }>();
    movs.forEach((m) => {
      const key = m.produto_id || m.produtos?.nome || 'sem-id';
      const cur = map.get(key) || { produto: m.produtos?.nome || '-', qtd: 0, vezes: 0, valor: 0 };
      cur.qtd += m.quantidade || 0;
      cur.vezes += 1;
      cur.valor += m.subtotal || 0;
      map.set(key, cur);
    });
    const limit = parseInt(topN);
    return Array.from(map.values())
      .sort((a, b) => b.qtd - a.qtd)
      .slice(0, limit)
      .map((r, i) => ({ posicao: i + 1, ...r }));
  }, [movs, topN]);

  const colunas: ColunaExport[] = [
    { key: 'posicao', header: '#', width: 0.6, format: 'int', align: 'center' },
    { key: 'produto', header: 'Produto', width: 4 },
    { key: 'qtd', header: 'Quantidade', width: 1.6, format: 'number' },
    { key: 'vezes', header: 'Movimentações', width: 1.6, format: 'int' },
    { key: 'valor', header: 'Valor Total', width: 2, format: 'currency' },
  ];

  const filtrosTxt = [
    `Período: ${filtrosAplicados.dataInicio || ""} a ${filtrosAplicados.dataFim || ""}`,
    `Tipo: ${filtrosAplicados.tipo || 'Todos'}`,
    `Top ${topN}`,
  ];

  const meta = { titulo: 'Produtos Mais Movimentados', filtros: filtrosTxt };
  const maxQuantity = Math.max(rows[0]?.qtd ?? 0, 0);
  return <div className="report-view">
    <ReportHeading title={t('stockReports.rankingTitle')}>
      <ReportExports busy={exportando} disabled={loading || error}
        excel={() => exportarRelatorioExcel(meta, colunas, rows)} pdf={() => exportarRelatorioPDF(meta, colunas, rows)} />
    </ReportHeading>
    <ReportPeriodFilters start={dataInicio} end={dataFim} type={tipo} setStart={setDataInicio}
      setEnd={setDataFim} setType={setTipo} apply={load}>
      <div><Label htmlFor="report-rank-limit">{t('stockReports.show')}</Label>
        <Select value={topN} onValueChange={setTopN}>
          <SelectTrigger id="report-rank-limit"><SelectValue /></SelectTrigger>
          <SelectContent>{['10', '25', '50', '100'].map(limit =>
            <SelectItem key={limit} value={limit}>{t('stockReports.productCount', { count: Number(limit) })}</SelectItem>)}</SelectContent>
        </Select></div>
    </ReportPeriodFilters>
    <section className="report-panel">
      {!loading && !error && rows.length ? <div className="report-list">
        <table className="report-table report-ranking"><caption className="sr-only">{t('stockReports.rankingTitle')}</caption>
          <thead><tr>{['product', 'quantity', 'movimentacoes', 'total'].map(key =>
            <th key={key} scope="col">{t('stockReports.' + key)}</th>)}</tr></thead>
          <tbody>{rows.map(r => <tr key={r.posicao}>
            <th scope="row"><div className="report-rank-name"><span className="report-rank-number">{r.posicao}</span><strong>{r.produto}</strong></div></th>
            <td data-label={t('stockReports.quantity')}><div className="report-ranked-quantity">
              <div aria-hidden="true" className="report-bar"><i style={{ width: (maxQuantity ? Math.max(r.qtd, 0) / maxQuantity * 100 : 0) + '%' }} /></div>
              <b>{formatNumber(r.qtd, 2)}</b>
            </div></td>
            <td data-label={t('stockReports.movimentacoes')}>{formatNumber(r.vezes, 0)}</td>
            <td data-label={t('stockReports.total')}>{formatMoney(r.valor)}</td>
          </tr>)}</tbody>
        </table>
      </div> : <ReportState loading={loading} error={error} retry={load} empty={t('stockReports.noMovement')} />}
    </section>
  </div>;
}
