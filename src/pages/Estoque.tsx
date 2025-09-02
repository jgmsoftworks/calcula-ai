import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CadastroProdutos } from '@/components/estoque/CadastroProdutos';
import { Entradas } from '@/components/estoque/Entradas';
import { Saidas } from '@/components/estoque/Saidas';
import { Fornecedores } from '@/components/estoque/Fornecedores';
import { Historico } from '@/components/estoque/Historico';

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
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="cadastro">Cadastro</TabsTrigger>
          <TabsTrigger value="entradas">Entradas</TabsTrigger>
          <TabsTrigger value="saidas">Saídas</TabsTrigger>
          <TabsTrigger value="fornecedores">Fornecedores</TabsTrigger>
          <TabsTrigger value="historico">Histórico</TabsTrigger>
        </TabsList>

        <TabsContent value="cadastro" className="space-y-4">
          <CadastroProdutos />
        </TabsContent>

        <TabsContent value="entradas" className="space-y-4">
          <Entradas />
        </TabsContent>

        <TabsContent value="saidas" className="space-y-4">
          <Saidas />
        </TabsContent>

        <TabsContent value="fornecedores" className="space-y-4">
          <Fornecedores />
        </TabsContent>

        <TabsContent value="historico" className="space-y-4">
          <Historico />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Estoque;