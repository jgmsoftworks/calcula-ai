import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MediaFaturamento } from '@/components/precificacao/MediaFaturamento';
import { Markups } from '@/components/precificacao/Markups';

const Precificacao = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState("media-faturamento");
  
  // Inicializar período do query parameter ou usar padrão
  const [globalPeriod, setGlobalPeriod] = useState<string>(() => {
    return searchParams.get('periodo') || "12";
  });

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="media-faturamento">Média de Faturamento</TabsTrigger>
          <TabsTrigger value="markups">Markups</TabsTrigger>
          <TabsTrigger value="planos">Planos</TabsTrigger>
        </TabsList>

        <TabsContent value="media-faturamento" className="space-y-4">
          <MediaFaturamento />
        </TabsContent>

        <TabsContent value="markups" className="space-y-4">
          <Markups globalPeriod={globalPeriod} />
        </TabsContent>

        <TabsContent value="planos" className="space-y-4">
          <div className="p-6">
            <h2 className="text-2xl font-semibold mb-4">Gerenciar Planos</h2>
            <p className="text-muted-foreground mb-6">
              Gerencie sua assinatura e veja os limites do seu plano atual.
            </p>
            <iframe 
              src="/planos" 
              className="w-full h-screen border rounded-lg"
              title="Gerenciar Planos"
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Precificacao;