import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DespesasFixas } from '@/components/custos/DespesasFixas';
import { FolhaPagamento } from '@/components/custos/FolhaPagamento';
import { EncargosVenda } from '@/components/custos/EncargosVenda';
import { PlanRestrictedArea } from '@/components/planos/PlanRestrictedArea';
import { usePlanLimits } from '@/hooks/usePlanLimits';

const Custos = () => {
  const [activeTab, setActiveTab] = useState("despesas-fixas");
  const { hasAccess } = usePlanLimits();

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="despesas-fixas">Despesas Fixas</TabsTrigger>
          <TabsTrigger value="folha-pagamento">Folha de Pagamento</TabsTrigger>
          <TabsTrigger value="encargos-venda">Encargos sobre Venda</TabsTrigger>
        </TabsList>

        <TabsContent value="despesas-fixas" className="space-y-4">
          <DespesasFixas />
        </TabsContent>

        <TabsContent value="folha-pagamento" className="space-y-4">
          <PlanRestrictedArea
            requiredPlan="professional"
            feature="Folha de Pagamento Completa"
            variant="overlay"
          >
            <FolhaPagamento />
          </PlanRestrictedArea>
        </TabsContent>

        <TabsContent value="encargos-venda" className="space-y-4">
          <EncargosVenda />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Custos;