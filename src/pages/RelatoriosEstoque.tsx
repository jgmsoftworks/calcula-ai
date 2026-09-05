import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Package, ArrowLeftRight, TrendingUp } from 'lucide-react';
import { RelatorioPosicao } from '@/components/estoque/relatorios/RelatorioPosicao';
import { RelatorioMovimentacoes } from '@/components/estoque/relatorios/RelatorioMovimentacoes';
import { RelatorioRanking } from '@/components/estoque/relatorios/RelatorioRanking';

export default function RelatoriosEstoque() {
  const [tab, setTab] = useState('posicao');

  return (
    <div className="space-y-6">
      <Tabs value={tab} onValueChange={setTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 h-auto">
          <TabsTrigger value="posicao" className="gap-2 py-2.5">
            <Package className="h-4 w-4" />
            <span className="hidden sm:inline">Posição de Estoque</span>
            <span className="sm:hidden">Posição</span>
          </TabsTrigger>
          <TabsTrigger value="movimentacoes" className="gap-2 py-2.5">
            <ArrowLeftRight className="h-4 w-4" />
            <span className="hidden sm:inline">Movimentações por Período</span>
            <span className="sm:hidden">Mov.</span>
          </TabsTrigger>
          <TabsTrigger value="ranking" className="gap-2 py-2.5">
            <TrendingUp className="h-4 w-4" />
            <span className="hidden sm:inline">Mais Movimentados</span>
            <span className="sm:hidden">Ranking</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="posicao"><RelatorioPosicao /></TabsContent>
        <TabsContent value="movimentacoes"><RelatorioMovimentacoes /></TabsContent>
        <TabsContent value="ranking"><RelatorioRanking /></TabsContent>
      </Tabs>
    </div>
  );
}
