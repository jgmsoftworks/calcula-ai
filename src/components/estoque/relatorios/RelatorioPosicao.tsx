import { useMemo, useState } from 'react';
import { MetricCard } from '@/components/ui/metric-card';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, Boxes, Package, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { formatMoney } from '@/lib/business-region';
import { formatNumber } from '@/lib/formatters';
import { useProdutos } from '@/hooks/useProdutos';
import { useExportRelatorioEstoque, type ColunaExport } from '@/hooks/useExportRelatorioEstoque';
import { ReportExports, ReportHeading, ReportState } from './ReportLayout';

export function RelatorioPosicao() {
  const { t } = useTranslation();
  const { exportando, exportarRelatorioExcel, exportarRelatorioPDF } = useExportRelatorioEstoque();
  const { produtos, isPending: loading, isError: error, refetch } = useProdutos();
  const [search, setSearch] = useState('');
  const [soAbaixoMin, setSoAbaixoMin] = useState(false);
  const [ocultarZero, setOcultarZero] = useState(false);

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return produtos
      .filter((p) => {
        if (term && !(`${p.codigo_interno} ${p.nome}`.toLowerCase().includes(term))) return false;
        if (ocultarZero && (p.estoque_atual || 0) <= 0) return false;
        if (soAbaixoMin && !(p.estoque_minimo > 0 && p.estoque_atual < p.estoque_minimo)) return false;
        return true;
      })
      .map((p) => {
        const valor = (p.estoque_atual || 0) * (p.custo_unitario || 0);
        let status: 'OK' | 'Abaixo' | 'Zerado' = 'OK';
        if ((p.estoque_atual || 0) <= 0) status = 'Zerado';
        else if (p.estoque_minimo > 0 && p.estoque_atual < p.estoque_minimo) status = 'Abaixo';
        return {
          id: p.id,
          codigo_interno: p.codigo_interno,
          nome: p.nome,
          categoria: (p.categorias || []).join(', '),
          unidade: p.unidade_compra,
          estoque_atual: p.estoque_atual || 0,
          custo_unitario: p.custo_unitario || 0,
          valor_estoque: valor,
          estoque_minimo: p.estoque_minimo || 0,
          status,
        };
      });
  }, [produtos, search, soAbaixoMin, ocultarZero]);

  const totais = useMemo(() => {
    const valorTotal = rows.reduce((s, r) => s + r.valor_estoque, 0);
    return { skus: rows.length, valorTotal };
  }, [rows]);

  const colunas: ColunaExport[] = [
    { key: 'codigo_interno', header: 'Código', width: 1, format: 'int' },
    { key: 'nome', header: 'Produto', width: 4 },
    { key: 'categoria', header: 'Categoria', width: 2.5 },
    { key: 'unidade', header: 'Un.', width: 1, align: 'center' },
    { key: 'estoque_atual', header: 'Saldo', width: 1.4, format: 'number' },
    { key: 'estoque_minimo', header: 'Mínimo', width: 1.4, format: 'number' },
    { key: 'custo_unitario', header: 'Custo Un.', width: 1.8, format: 'currency' },
    { key: 'valor_estoque', header: 'Valor Estoque', width: 2.2, format: 'currency' },
    { key: 'status', header: 'Status', width: 1.4, align: 'center' },
  ];

  const filtros: string[] = [];
  if (search) filtros.push(`Busca: "${search}"`);
  if (soAbaixoMin) filtros.push('Apenas abaixo do mínimo');
  if (ocultarZero) filtros.push('Ocultar saldo zero');

  const totaisExport = {
    'Total de SKUs': totais.skus,
    'Valor total em estoque': `${formatMoney(totais.valorTotal)}`,
  };

  const handleExcel = () => exportarRelatorioExcel(
    { titulo: 'Posição de Estoque', filtros },
    colunas, rows, totaisExport,
  );
  const handlePDF = () => exportarRelatorioPDF(
    { titulo: 'Posição de Estoque', filtros },
    colunas, rows, totaisExport,
  );

  const below = rows.filter(row => row.estoque_minimo > 0 && row.estoque_atual < row.estoque_minimo).length;
  const ready = !loading && !error;
  return <div className="report-view">
    <ReportHeading title={t('stockReports.positionTitle')}>
      <ReportExports busy={exportando} disabled={!ready} excel={handleExcel} pdf={handlePDF} />
    </ReportHeading>
    <div className="report-metrics">
      <MetricCard icon={Package} tone="azure" label={t('stockReports.value')} value={ready ? formatMoney(totais.valorTotal) : '—'} />
      <MetricCard icon={Boxes} tone="blue" label={t('stockReports.products')} value={ready ? formatNumber(totais.skus, 0) : '—'} />
      <MetricCard icon={AlertTriangle} tone="orange" label={t('stockReports.below')} value={ready ? formatNumber(below, 0) : '—'} />
    </div>
    <section className="report-panel">
      <div className="report-stock-filters">
        <div className="relative min-w-0">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
          <Input aria-label={t('stockReports.search')} placeholder={t('stockReports.search')} className="pl-9"
            value={search} onChange={event => setSearch(event.target.value)} />
        </div>
        <div className="report-switch"><Switch id="abaixo" checked={soAbaixoMin} onCheckedChange={setSoAbaixoMin} />
          <Label htmlFor="abaixo">{t('stockReports.below')}</Label></div>
        <div className="report-switch"><Switch id="zero" checked={ocultarZero} onCheckedChange={setOcultarZero} />
          <Label htmlFor="zero">{t('stockReports.hideZero')}</Label></div>
      </div>
      {ready && rows.length ? <div className="report-list">
        <table className="report-table"><caption className="sr-only">{t('stockReports.positionTitle')}</caption>
          <thead><tr>{['product', 'status', 'balance', 'minimum', 'cost', 'value'].map(key =>
            <th key={key} scope="col">{t('stockReports.' + key)}</th>)}</tr></thead>
          <tbody>{rows.map(r => <tr key={r.id}>
            <th scope="row"><strong>{r.nome}</strong><small>{['#' + r.codigo_interno, r.categoria].filter(Boolean).join(' · ')}</small></th>
            <td className="report-tag-cell"><span className={'report-tag ' + (r.status === 'OK' ? 'status-ok' : r.status === 'Abaixo' ? 'status-low' : 'status-zero')}>
              {t('stockReports.' + r.status)}</span></td>
            <td data-label={t('stockReports.balance')}>{formatNumber(r.estoque_atual, 2)} {r.unidade}</td>
            <td data-label={t('stockReports.minimum')}>{formatNumber(r.estoque_minimo, 2)} {r.unidade}</td>
            <td data-label={t('stockReports.cost')}>{formatMoney(r.custo_unitario)}</td>
            <td data-label={t('stockReports.value')}><b>{formatMoney(r.valor_estoque)}</b></td>
          </tr>)}</tbody>
        </table>
      </div> : <ReportState loading={loading} error={error} retry={() => refetch()} empty={t('stockReports.noProduct')} />}
    </section>
  </div>;
}
