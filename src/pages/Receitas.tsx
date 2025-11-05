import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ListaReceitas } from '@/components/receitas/ListaReceitas';
import { HistoricoGeralReceitas } from '@/components/receitas/HistoricoGeralReceitas';

export default function Receitas() {
  const [activeTab, setActiveTab] = useState('receitas');

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="receitas">Lista de Receitas</TabsTrigger>
          <TabsTrigger value="historico">Histórico Geral</TabsTrigger>
        </TabsList>

        <TabsContent value="receitas">
          <ListaReceitas />
        </TabsContent>

        <TabsContent value="historico">
          <HistoricoGeralReceitas />
        </TabsContent>
      </Tabs>
    </div>
  );
}
