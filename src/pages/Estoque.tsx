import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ListaProdutos } from '@/components/estoque/ListaProdutos';
import { HistoricoGeral } from '@/components/estoque/HistoricoGeral';
import { useTranslation } from 'react-i18next';

export default function Estoque() {
  const [activeTab, setActiveTab] = useState('produtos');
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="produtos">
            <span className="hidden md:inline">{t('pages.estoque.listaProdutos')}</span>
            <span className="md:hidden">Produtos</span>
          </TabsTrigger>
          <TabsTrigger value="historico">
            <span className="hidden md:inline">{t('pages.estoque.historicoGeral')}</span>
            <span className="md:hidden">Histórico</span>
          </TabsTrigger>
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
