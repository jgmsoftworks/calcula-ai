import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CadastroProdutoForm } from '@/components/estoque/CadastroProdutoForm';
import { ListaProdutos } from '@/components/estoque/ListaProdutos';
import { EntradasForm } from '@/components/estoque/EntradasForm';
import { SaidasForm } from '@/components/estoque/SaidasForm';
import { FornecedoresTabela } from '@/components/estoque/FornecedoresTabela';
import { HistoricoLista } from '@/components/estoque/HistoricoLista';

const Estoque = () => {
  const [activeTab, setActiveTab] = useState("cadastro");

  const handleProductCadastrado = () => {
    setActiveTab("lista");
  };

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="cadastro">Cadastro</TabsTrigger>
          <TabsTrigger value="lista">Lista</TabsTrigger>
          <TabsTrigger value="entradas">Entradas</TabsTrigger>
          <TabsTrigger value="saidas">Saídas</TabsTrigger>
          <TabsTrigger value="fornecedores">Fornecedores</TabsTrigger>
          <TabsTrigger value="historico">Histórico</TabsTrigger>
        </TabsList>

        <TabsContent value="cadastro" className="space-y-4">
          <CadastroProdutoForm onProductCadastrado={handleProductCadastrado} />
        </TabsContent>

        <TabsContent value="lista" className="space-y-4">
          <ListaProdutos />
        </TabsContent>

        <TabsContent value="entradas" className="space-y-4">
          <EntradasForm />
        </TabsContent>

        <TabsContent value="saidas" className="space-y-4">
          <SaidasForm />
        </TabsContent>

        <TabsContent value="fornecedores" className="space-y-4">
          <FornecedoresTabela />
        </TabsContent>

        <TabsContent value="historico" className="space-y-4">
          <HistoricoLista />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Estoque;