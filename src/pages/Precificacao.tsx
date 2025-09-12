import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { MediaFaturamento } from '@/components/precificacao/MediaFaturamento';
import { Markups } from '@/components/precificacao/Markups';

const Precificacao = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState("media-faturamento");
  
  // Inicializar período do query parameter ou usar padrão
  const [globalPeriod, setGlobalPeriod] = useState<string>(() => {
    return searchParams.get('periodo') || "12";
  });

  // Sincronizar estado com URL quando componente carrega
  useEffect(() => {
    const periodoFromUrl = searchParams.get('periodo');
    if (periodoFromUrl && periodoFromUrl !== globalPeriod) {
      setGlobalPeriod(periodoFromUrl);
    }
  }, [searchParams]);

  const handleGlobalPeriodChange = (value: string) => {
    setGlobalPeriod(value);
    
    // Atualizar URL com novo período
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.set('periodo', value);
    setSearchParams(newSearchParams, { replace: true });
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