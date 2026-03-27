import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ListaReceitas } from '@/components/receitas/ListaReceitas';
import { HistoricoGeralReceitas } from '@/components/receitas/HistoricoGeralReceitas';
import { useTranslation } from 'react-i18next';

export default function Receitas() {
  const [activeTab, setActiveTab] = useState('receitas');
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="receitas">{t('pages.receitas.listaReceitas')}</TabsTrigger>
          <TabsTrigger value="historico">{t('pages.receitas.historicoGeral')}</TabsTrigger>
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
