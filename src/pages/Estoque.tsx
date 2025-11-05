import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ListaProdutos } from '@/components/estoque/ListaProdutos';
import { HistoricoGeral } from '@/components/estoque/HistoricoGeral';

export default function Estoque() {
  const [activeTab, setActiveTab] = useState('produtos');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gradient-primary">📦 Estoque</h1>
        <p className="text-muted-foreground mt-2">
          Gerencie seus produtos e matérias-primas
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="produtos">Lista de Produtos</TabsTrigger>
          <TabsTrigger value="historico">Histórico Geral</TabsTrigger>
        </TabsList>

        <TabsContent value="produtos">
          <ListaProdutos />
        </TabsContent>

        <TabsContent value="historico">
          <HistoricoGeral />
        </TabsContent>
      </Tabs>
    </div>
  );
}
