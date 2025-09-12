import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { MediaFaturamento } from '@/components/precificacao/MediaFaturamento';
import { Markups } from '@/components/precificacao/Markups';

const Precificacao = () => {
  const [activeTab, setActiveTab] = useState("media-faturamento");
  const [globalPeriod, setGlobalPeriod] = useState<string>("12");

  const handleGlobalPeriodChange = (value: string) => {
    setGlobalPeriod(value);
  };

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="media-faturamento">Média de Faturamento</TabsTrigger>
          <TabsTrigger value="markups">Markups</TabsTrigger>
        </TabsList>

        <TabsContent value="media-faturamento" className="space-y-4">
          <MediaFaturamento />
        </TabsContent>

        <TabsContent value="markups" className="space-y-4">
          {/* Filtro Global de Período */}
          <div className="flex items-center gap-4 mb-6 p-4 border border-border rounded-lg bg-card">
            <Label htmlFor="global-period" className="text-sm font-medium whitespace-nowrap">
              Visualizar dados do período:
            </Label>
            <Select value={globalPeriod} onValueChange={handleGlobalPeriodChange}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Selecione o período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Último mês</SelectItem>
                <SelectItem value="3">Últimos 3 meses</SelectItem>
                <SelectItem value="6">Últimos 6 meses</SelectItem>
                <SelectItem value="12">Últimos 12 meses</SelectItem>
                <SelectItem value="todos">Todos</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <Markups globalPeriod={globalPeriod} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Precificacao;