import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CadastroProdutoForm } from '@/components/estoque/CadastroProdutoForm';
import { ListaProdutos } from '@/components/estoque/ListaProdutos';
import { Historico } from '@/components/estoque/Historico';
import { PlanRestrictedArea } from '@/components/planos/PlanRestrictedArea';
import { ProductCounter } from '@/components/estoque/ProductCounter';
import { usePlanLimits } from '@/hooks/usePlanLimits';

const Estoque = () => {
  const [activeTab, setActiveTab] = useState("cadastro");
  const { hasAccess } = usePlanLimits();

  const handleProductCadastrado = () => {
    setActiveTab("lista");
  };

  const handleTabChange = (value: string) => {
    // Bloquear tabs premium para usuários gratuitos
    const premiumTabs = ['historico'];
    if (premiumTabs.includes(value) && !hasAccess('professional')) {
      return;
    }
    setActiveTab(value);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Controle de Estoque</h1>
        <ProductCounter />
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="cadastro">Cadastro</TabsTrigger>
          <TabsTrigger value="lista">Lista</TabsTrigger>
          
          <PlanRestrictedArea requiredPlan="professional" feature="Histórico de movimentações" variant="tab">
            <TabsTrigger 
              value="historico"
              disabled={!hasAccess('professional')}
              className="disabled:opacity-60"
            >
              Histórico
            </TabsTrigger>
          </PlanRestrictedArea>
        </TabsList>

        <TabsContent value="cadastro" className="space-y-4">
          <CadastroProdutoForm onProductCadastrado={handleProductCadastrado} />
        </TabsContent>

        <TabsContent value="lista" className="space-y-4">
          <ListaProdutos />
        </TabsContent>

        <TabsContent value="historico" className="space-y-4">
          <PlanRestrictedArea requiredPlan="professional" feature="Histórico completo de movimentações">
            <Historico />
          </PlanRestrictedArea>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Estoque;