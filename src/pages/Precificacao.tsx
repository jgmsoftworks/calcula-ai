import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MediaFaturamento } from '@/components/precificacao/MediaFaturamento';
import { Markups } from '@/components/precificacao/Markups';
import { useTranslation } from 'react-i18next';

const Precificacao = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState("media-faturamento");
  const { t } = useTranslation();
  
  const [globalPeriod, setGlobalPeriod] = useState<string>(() => {
    return searchParams.get('periodo') || "12";
  });

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="media-faturamento">{t('pages.precificacao.mediaFaturamento')}</TabsTrigger>
          <TabsTrigger value="markups">{t('pages.precificacao.markups')}</TabsTrigger>
        </TabsList>

        <TabsContent value="media-faturamento" className="space-y-4">
          <MediaFaturamento />
        </TabsContent>

        <TabsContent value="markups" className="space-y-4">
          <Markups globalPeriod={globalPeriod} />
        </TabsContent>

      </Tabs>
    </div>
  );
};

export default Precificacao;