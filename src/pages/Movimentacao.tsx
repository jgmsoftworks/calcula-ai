import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EntradasForm } from '@/components/estoque/EntradasForm';
import { SaidasForm } from '@/components/estoque/SaidasForm';

const Movimentacao = () => {
  const [activeTab, setActiveTab] = useState("entradas");

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Movimentação de Estoque</h1>
        <p className="text-muted-foreground">
          Registre entradas e saídas de produtos no estoque
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="entradas">Entradas</TabsTrigger>
          <TabsTrigger value="saidas">Saídas</TabsTrigger>
        </TabsList>

        <TabsContent value="entradas" className="space-y-4">
          <EntradasForm />
        </TabsContent>

        <TabsContent value="saidas" className="space-y-4">
          <SaidasForm />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Movimentacao;
