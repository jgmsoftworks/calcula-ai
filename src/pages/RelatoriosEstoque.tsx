import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeftRight, Boxes, ChartBarDecreasing, LayoutDashboard } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RelatorioResumo } from '@/components/estoque/relatorios/RelatorioResumo';
import { RelatorioPosicao } from '@/components/estoque/relatorios/RelatorioPosicao';
import { RelatorioMovimentacoes } from '@/components/estoque/relatorios/RelatorioMovimentacoes';
import { RelatorioRanking } from '@/components/estoque/relatorios/RelatorioRanking';
import '@/components/estoque/relatorios/relatorios.css';

const views = [
  { id: 'resumo', icon: LayoutDashboard, component: RelatorioResumo },
  { id: 'posicao', icon: Boxes, component: RelatorioPosicao },
  { id: 'movimentacoes', icon: ArrowLeftRight, component: RelatorioMovimentacoes },
  { id: 'ranking', icon: ChartBarDecreasing, component: RelatorioRanking },
];

export default function RelatoriosEstoque() {
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();
  const active = views.find(view => view.id === params.get('aba'))?.id ?? 'resumo';
  function selectView(id: string) {
    setParams(previous => {
      const next = new URLSearchParams(previous);
      if (id === 'resumo') next.delete('aba');
      else next.set('aba', id);
      return next;
    });
  }
  return (
    <Tabs value={active} onValueChange={selectView} className="stock-reports" activationMode="manual">
      <TabsList className="stock-tabs" aria-label={t('stockReports.title')}>
        {views.map(({ id, icon: Icon }) => (
          <TabsTrigger key={id} value={id} className="stock-tab">
            <Icon aria-hidden="true" size={16} />{t('stockReports.' + id)}
          </TabsTrigger>
        ))}
      </TabsList>
      {views.map(({ id, component: View }) => <TabsContent key={id} value={id} className="stock-tab-body"><View /></TabsContent>)}
    </Tabs>
  );
}
