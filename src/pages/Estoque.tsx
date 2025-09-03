import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CadastroProdutoForm } from '@/components/estoque/CadastroProdutoForm';
import { ListaProdutos } from '@/components/estoque/ListaProdutos';
import { EntradasForm } from '@/components/estoque/EntradasForm';
import { SaidasForm } from '@/components/estoque/SaidasForm';
import { FornecedoresTabela } from '@/components/estoque/FornecedoresTabela';
import { HistoricoLista } from '@/components/estoque/HistoricoLista';

const Estoque = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Estoque</h1>
        <p className="text-muted-foreground">
          Gerencie produtos, fornecedores e movimentações de estoque
        </p>
      </div>

      <Tabs defaultValue="cadastro" className="space-y-4">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="cadastro">Cadastro</TabsTrigger>
          <TabsTrigger value="lista">Lista</TabsTrigger>
          <TabsTrigger value="entradas">Entradas</TabsTrigger>
          <TabsTrigger value="saidas">Saídas</TabsTrigger>
          <TabsTrigger value="fornecedores">Fornecedores</TabsTrigger>
          <TabsTrigger value="historico">Histórico</TabsTrigger>
        </TabsList>

        <TabsContent value="cadastro" className="space-y-4">
          <CadastroProdutoForm />
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