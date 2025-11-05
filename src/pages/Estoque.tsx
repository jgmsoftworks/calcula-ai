// Estoque Management - All SelectItem values verified as non-empty
import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ListaProdutos } from '@/components/estoque/ListaProdutos';
import { HistoricoGeral } from '@/components/estoque/HistoricoGeral';

export default function Estoque() {
  const [activeTab, setActiveTab] = useState('produtos');

  return (
    <div className="space-y-6">
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
