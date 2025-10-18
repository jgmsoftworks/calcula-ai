import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CadastroProdutoForm } from '@/components/estoque/CadastroProdutoForm';
import { ListaProdutos } from '@/components/estoque/ListaProdutos';
import { EntradasForm } from '@/components/estoque/EntradasForm';
import { SaidasForm } from '@/components/estoque/SaidasForm';
import { FornecedoresTabela } from '@/components/estoque/FornecedoresTabela';
import { HistoricoLista } from '@/components/estoque/HistoricoLista';
import { PlanRestrictedArea } from '@/components/planos/PlanRestrictedArea';
import { ProductCounter } from '@/components/estoque/ProductCounter';
import { ImportacaoProdutos } from '@/components/estoque/ImportacaoProdutos';
import { usePlanLimits } from '@/hooks/usePlanLimits';

const Estoque = () => {
  const [activeTab, setActiveTab] = useState("cadastro");
  const { hasAccess } = usePlanLimits();

  const handleProductCadastrado = () => {
    setActiveTab("lista");
  };

  const handleTabChange = (value: string) => {
    // Bloquear tabs premium para usuários gratuitos
    const premiumTabs = ['entradas', 'saidas', 'historico'];
    if (premiumTabs.includes(value) && !hasAccess('professional')) {
      return; // Não permite mudança de tab
    }
    setActiveTab(value);
  };

  return (
    <div className="space-y-6">
      {/* Header com contador de produtos */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Controle de Estoque</h1>
        <ProductCounter />
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="cadastro">Cadastro</TabsTrigger>
          <TabsTrigger value="lista">Lista</TabsTrigger>
          
          <PlanRestrictedArea requiredPlan="professional" feature="Movimentação de estoque" variant="tab">
            <TabsTrigger 
              value="entradas" 
              disabled={!hasAccess('professional')}
              className="disabled:opacity-60"
            >
              Entradas
            </TabsTrigger>
          </PlanRestrictedArea>
          
          <PlanRestrictedArea requiredPlan="professional" feature="Movimentação de estoque" variant="tab">
            <TabsTrigger 
              value="saidas"
              disabled={!hasAccess('professional')}
              className="disabled:opacity-60"
            >
              Saídas
            </TabsTrigger>
          </PlanRestrictedArea>
          
          <TabsTrigger value="fornecedores">Fornecedores</TabsTrigger>
          
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

        <TabsContent value="entradas" className="space-y-4">
          <PlanRestrictedArea requiredPlan="professional" feature="Controle de entradas de estoque">
            <EntradasForm />
          </PlanRestrictedArea>
        </TabsContent>

        <TabsContent value="saidas" className="space-y-4">
          <PlanRestrictedArea requiredPlan="professional" feature="Controle de saídas de estoque">
            <SaidasForm />
          </PlanRestrictedArea>
        </TabsContent>

        <TabsContent value="fornecedores" className="space-y-4">
          <FornecedoresTabela />
        </TabsContent>

        <TabsContent value="historico" className="space-y-4">
          <PlanRestrictedArea requiredPlan="professional" feature="Histórico completo de movimentações">
            <HistoricoLista />
          </PlanRestrictedArea>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Estoque;