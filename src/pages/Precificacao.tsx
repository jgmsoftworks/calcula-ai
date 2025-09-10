import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MediaFaturamento } from '@/components/precificacao/MediaFaturamento';
import { Markups } from '@/components/precificacao/Markups';

const Precificacao = () => {
  const [activeTab, setActiveTab] = useState("media-faturamento");

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="w-full grid grid-cols-2 bg-muted p-1 rounded-md">
          <TabsTrigger className="rounded-sm" value="media-faturamento">
            Média de Faturamento
          </TabsTrigger>
          <TabsTrigger className="rounded-sm" value="markups">
            Markups
          </TabsTrigger>
        </TabsList>

        <TabsContent value="media-faturamento" className="space-y-4">
          <MediaFaturamento />
        </TabsContent>

        <TabsContent value="markups" className="space-y-4">
          <Markups />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Precificacao;