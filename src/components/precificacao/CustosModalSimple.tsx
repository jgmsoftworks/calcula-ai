import { useState, useEffect, useMemo, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useOptimizedUserConfigurations } from '@/hooks/useOptimizedUserConfigurations';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

interface MarkupBlock {
  id: string;
  nome: string;
  gastoSobreFaturamento: number;
  impostos: number;
  taxasMeiosPagamento: number;
  comissoesPlataformas: number;
  outros: number;
  valorEmReal: number;
  lucroDesejado: number;
}

interface PeriodoFiltro {
  tipo: 'mes_atual' | 'periodo_personalizado';
  dataInicio?: Date;
  dataFim?: Date;
}

interface FaturamentoHistorico {
  id: string;
  valor: number;
  mes: Date;
}

interface DespesaFixa {
  id: string;
  nome: string;
  valor: number;
  ativo: boolean;
}

interface FolhaPagamento {
  id: string;
  nome: string;
  custo_por_hora: number;
  ativo: boolean;
  salario_base: number;
  horas_totais_mes: number;
}

interface EncargoVenda {
  id: string;
  nome: string;
  valor: number;
  tipo: string;
  valor_percentual: number;
  valor_fixo: number;
  ativo: boolean;
}

interface CustosModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  markupBlock?: MarkupBlock;
  onMarkupUpdate?: (markupData: Partial<MarkupBlock>) => void;
}

export function CustosModal({ open, onOpenChange, markupBlock, onMarkupUpdate }: CustosModalProps) {
  const [despesasFixas, setDespesasFixas] = useState<DespesaFixa[]>([]);
  const [folhaPagamento, setFolhaPagamento] = useState<FolhaPagamento[]>([]);
  const [encargosVenda, setEncargosVenda] = useState<EncargoVenda[]>([]);
  const [loading, setLoading] = useState(false);
  const [checkboxStates, setCheckboxStates] = useState<Record<string, boolean>>({});
  const [tempCheckboxStates, setTempCheckboxStates] = useState<Record<string, boolean>>({});
  const [currentMarkupValues, setCurrentMarkupValues] = useState<Partial<MarkupBlock>>(markupBlock || {});
  const [faturamentosHistoricos, setFaturamentosHistoricos] = useState<FaturamentoHistorico[]>([]);
  
  // Estados do filtro personalizado
  const [filtroPersonalizado, setFiltroPersonalizado] = useState<PeriodoFiltro>({ tipo: 'mes_atual' });
  const [tipoFiltro, setTipoFiltro] = useState<'mes_atual' | 'periodo_personalizado'>('mes_atual');
  const [dataInicio, setDataInicio] = useState<Date | undefined>(undefined);
  const [dataFim, setDataFim] = useState<Date | undefined>(undefined);
  
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [selectAllStates, setSelectAllStates] = useState({
    despesasFixas: false,
    folhaPagamento: false,
    encargosVenda: false
  });
  
  const { user } = useAuth();
  const { toast } = useToast();
  const { loadConfiguration, saveConfiguration } = useOptimizedUserConfigurations();

  // Atualizar valores locais quando markupBlock mudar
  useEffect(() => {
    if (markupBlock) {
      setCurrentMarkupValues(markupBlock);
      carregarFiltroSalvo();
    }
  }, [markupBlock]);

  // Carregar filtro salvo
  const carregarFiltroSalvo = async () => {
    try {
      const configKey = markupBlock ? `filtro-periodo-${markupBlock.id}` : 'filtro-periodo-default';
      const filtroSalvo = await loadConfiguration(configKey);
      
      if (filtroSalvo && typeof filtroSalvo === 'object' && 'tipo' in filtroSalvo) {
        const periodo = filtroSalvo as PeriodoFiltro;
        setFiltroPersonalizado(periodo);
        setTipoFiltro(periodo.tipo);
        if (periodo.tipo === 'periodo_personalizado') {
          setDataInicio(periodo.dataInicio);
          setDataFim(periodo.dataFim);
        }
      } else {
        const padraoFiltro: PeriodoFiltro = { tipo: 'mes_atual' };
        setFiltroPersonalizado(padraoFiltro);
        setTipoFiltro('mes_atual');
      }
    } catch (error) {
      console.error('Erro ao carregar filtro:', error);
      const padraoFiltro: PeriodoFiltro = { tipo: 'mes_atual' };
      setFiltroPersonalizado(padraoFiltro);
      setTipoFiltro('mes_atual');
    }
  };

  const carregarDados = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Carregar despesas fixas
      const { data: despesas, error: despesasError } = await supabase
        .from('despesas_fixas')
        .select('id, nome, valor, ativo')
        .eq('user_id', user.id)
        .eq('ativo', true)
        .order('nome');

      if (despesasError) throw despesasError;
      setDespesasFixas(despesas || []);

      // Carregar folha de pagamento
      const { data: folha, error: folhaError } = await supabase
        .from('folha_pagamento')
        .select('id, nome, custo_por_hora, ativo, tipo_mao_obra, salario_base, horas_totais_mes')
        .eq('user_id', user.id)
        .eq('tipo_mao_obra', 'indireta')
        .eq('ativo', true)
        .order('nome');

      if (folhaError) throw folhaError;
      setFolhaPagamento(folha || []);

      // Carregar encargos sobre venda
      const { data: encargos, error: encargosError } = await supabase
        .from('encargos_venda')
        .select('id, nome, valor, tipo, valor_percentual, valor_fixo, ativo')
        .eq('user_id', user.id)
        .eq('ativo', true)
        .order('nome');

      if (encargosError) throw encargosError;
      const encargosFormatados = (encargos || []).map(encargo => ({
        ...encargo,
        valor_percentual: encargo.valor_percentual || 0,
        valor_fixo: encargo.valor_fixo || 0
      }));
      setEncargosVenda(encargosFormatados);

      // Carregar faturamentos históricos
      const configFaturamentos = await loadConfiguration('faturamentos_historicos');
      if (configFaturamentos && Array.isArray(configFaturamentos)) {
        const faturamentos = configFaturamentos.map((f: any) => ({
          ...f,
          mes: new Date(f.mes)
        })).sort((a, b) => b.mes.getTime() - a.mes.getTime());
        setFaturamentosHistoricos(faturamentos);
      }

      // Carregar estados dos checkboxes salvos
      const configKey = markupBlock ? `checkbox-states-${markupBlock.id}` : 'checkbox-states-default';
      const savedStates = await loadConfiguration(configKey);
      
      let statesParaUsar: Record<string, boolean> = {};
      
      if (savedStates && typeof savedStates === 'object') {
        statesParaUsar = savedStates as Record<string, boolean>;
      } else {
        [...(despesas || []), ...(folha || []), ...encargosFormatados].forEach(item => {
          statesParaUsar[item.id] = false;
        });
      }
      
      setCheckboxStates(statesParaUsar);
      setTempCheckboxStates(statesParaUsar);
      calcularMarkup(statesParaUsar);
      setHasUnsavedChanges(false);

    } catch (error) {
      toast({
        title: "Erro ao carregar dados",
        description: "Não foi possível carregar os dados de custos",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      carregarDados();
      carregarFiltroSalvo();
    }
  }, [open, user, markupBlock?.id]);

  // Função para calcular média mensal baseada no filtro personalizado
  const calcularMediaPorPeriodo = useCallback((periodo: PeriodoFiltro) => {
    if (faturamentosHistoricos.length === 0) return 0;

    let faturamentosSelecionados = [...faturamentosHistoricos];
    
    if (periodo.tipo === 'mes_atual') {
      const agora = new Date();
      const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1);
      const fimMes = new Date(agora.getFullYear(), agora.getMonth() + 1, 0);
      
      faturamentosSelecionados = faturamentosHistoricos.filter(f => 
        f.mes >= inicioMes && f.mes <= fimMes
      );
    } else if (periodo.tipo === 'periodo_personalizado' && periodo.dataInicio && periodo.dataFim) {
      faturamentosSelecionados = faturamentosHistoricos.filter(f => 
        f.mes >= periodo.dataInicio! && f.mes <= periodo.dataFim!
      );
    }

    if (faturamentosSelecionados.length === 0) return 0;

    const totalFaturamento = faturamentosSelecionados.reduce((acc, f) => acc + f.valor, 0);
    return totalFaturamento / faturamentosSelecionados.length;
  }, [faturamentosHistoricos]);

  const calcularMediaMensal = useMemo(() => {
    return calcularMediaPorPeriodo(filtroPersonalizado);
  }, [faturamentosHistoricos, filtroPersonalizado, calcularMediaPorPeriodo]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatPercentage = (value: number) => value.toFixed(2);

  // Mapear categorias
  const categoriasMap = useMemo(() => ({
    impostos: new Set(['ICMS', 'ISS', 'PIS/COFINS', 'IRPJ/CSLL', 'IPI']),
    meios_pagamento: new Set(['Cartão de débito', 'Cartão de crédito', 'Boleto bancário', 'PIX', 'Gateway de pagamento']),
    comissoes: new Set(['Marketing', 'Aplicativo de delivery', 'Plataforma SaaS', 'Colaboradores (comissão)'])
  }), []);

  const getCategoriaByNome = useCallback((nome: string): 'impostos' | 'meios_pagamento' | 'comissoes' | 'outros' => {
    if (categoriasMap.impostos.has(nome)) return 'impostos';
    if (categoriasMap.meios_pagamento.has(nome)) return 'meios_pagamento';
    if (categoriasMap.comissoes.has(nome)) return 'comissoes';
    return 'outros';
  }, [categoriasMap]);

  const calcularMarkup = useCallback((states: Record<string, boolean>) => {
    const mediaMensal = calcularMediaMensal;
    
    // Calcular gastos sobre faturamento
    const despesasConsideradas = despesasFixas.filter(d => states[d.id]);
    const totalDespesasFixas = despesasConsideradas.reduce((acc, d) => acc + Number(d.valor), 0);
    
    const folhaConsiderada = folhaPagamento.filter(f => states[f.id]);
    const totalFolhaPagamento = folhaConsiderada.reduce((acc, func) => {
      const custoMensal = func.custo_por_hora > 0 
        ? func.custo_por_hora * (func.horas_totais_mes || 173.2) 
        : func.salario_base;
      return acc + Number(custoMensal);
    }, 0);

    const totalGastos = totalDespesasFixas + totalFolhaPagamento;
    let gastosSobreFaturamento = 0;
    
    if (mediaMensal > 0 && totalGastos > 0) {
      gastosSobreFaturamento = (totalGastos / mediaMensal) * 100;
    }

    // Calcular encargos
    const encargosConsiderados = encargosVenda.filter(e => states[e.id]);
    const valorEmReal = encargosConsiderados.reduce((acc, enc) => acc + Number(enc.valor_fixo || 0), 0);

    const categorias = encargosConsiderados.reduce((acc, encargo) => {
      const categoria = getCategoriaByNome(encargo.nome);
      const valor = Number(encargo.valor_percentual || 0);
      
      switch (categoria) {
        case 'impostos':
          acc.impostos += valor;
          break;
        case 'meios_pagamento':
          acc.taxasMeiosPagamento += valor;
          break;
        case 'comissoes':
          acc.comissoesPlataformas += valor;
          break;
        case 'outros':
          acc.outros += valor;
          break;
      }
      return acc;
    }, {
      gastoSobreFaturamento: Math.round(gastosSobreFaturamento * 100) / 100,
      impostos: 0,
      taxasMeiosPagamento: 0,
      comissoesPlataformas: 0,
      outros: 0,
      valorEmReal,
      lucroDesejado: markupBlock?.lucroDesejado || 0
    });

    setCurrentMarkupValues(categorias);
  }, [despesasFixas, folhaPagamento, encargosVenda, calcularMediaMensal, getCategoriaByNome, markupBlock?.lucroDesejado]);

  // Aplicar período selecionado
  const handleAplicarPeriodo = async () => {
    const periodo: PeriodoFiltro = {
      tipo: tipoFiltro,
      ...(tipoFiltro === 'periodo_personalizado' && { dataInicio, dataFim })
    };
    
    if (tipoFiltro === 'periodo_personalizado' && (!dataInicio || !dataFim)) {
      toast({
        title: 'Erro',
        description: 'Selecione as datas de início e fim para o período personalizado.',
        variant: 'destructive'
      });
      return;
    }
    
    try {
      const configKey = markupBlock ? `filtro-periodo-${markupBlock.id}` : 'filtro-periodo-default';
      await saveConfiguration(configKey, periodo);
      
      setFiltroPersonalizado(periodo);
      
      const descricao = periodo.tipo === 'mes_atual' 
        ? 'mês atual'
        : `período de ${format(periodo.dataInicio!, 'MMM/yyyy', { locale: ptBR })} a ${format(periodo.dataFim!, 'MMM/yyyy', { locale: ptBR })}`;
      
      toast({
        title: "Período aplicado!",
        description: `Cálculos atualizados para ${descricao}`,
        duration: 3000
      });
      
      // Recalcular markup
      calcularMarkup(tempCheckboxStates);
      
    } catch (error) {
      console.error('Erro ao aplicar período:', error);
      toast({
        title: "Erro ao aplicar período",
        description: "Tente novamente em alguns segundos.",
        variant: "destructive"
      });
    }
  };

  const handleCheckboxChange = (itemId: string, checked: boolean) => {
    const newStates = { ...tempCheckboxStates, [itemId]: checked };
    setTempCheckboxStates(newStates);
    setHasUnsavedChanges(true);
    calcularMarkup(newStates);
  };

  const handleSalvarConfiguracao = async () => {
    try {
      const configKey = markupBlock ? `checkbox-states-${markupBlock.id}` : 'checkbox-states-default';
      await saveConfiguration(configKey, tempCheckboxStates);
      
      setCheckboxStates(tempCheckboxStates);
      setHasUnsavedChanges(false);
      
      if (onMarkupUpdate) {
        onMarkupUpdate(currentMarkupValues);
      }
      
      toast({
        title: "Configuração salva!",
        description: "Os custos selecionados foram salvos com sucesso.",
        duration: 3000
      });
      
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar a configuração.",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-4xl">
          <div className="flex items-center justify-center py-8">
            <LoadingSpinner className="h-8 w-8" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configurações de Custos - {markupBlock?.nome || 'Novo Markup'}</DialogTitle>
          <DialogDescription>
            Visualize os custos que serão considerados no cálculo do markup
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Seção de Filtro de Período */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Período de Análise</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select 
                value={tipoFiltro} 
                onValueChange={(value: 'mes_atual' | 'periodo_personalizado') => {
                  setTipoFiltro(value);
                  if (value === 'mes_atual') {
                    setDataInicio(undefined);
                    setDataFim(undefined);
                  }
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione o tipo de filtro" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mes_atual">Mês Atual</SelectItem>
                  <SelectItem value="periodo_personalizado">Período Personalizado</SelectItem>
                </SelectContent>
              </Select>

              {tipoFiltro === 'periodo_personalizado' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Data de Início</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !dataInicio && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {dataInicio ? format(dataInicio, "MMM/yyyy", { locale: ptBR }) : "Selecionar mês"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={dataInicio}
                          onSelect={setDataInicio}
                          initialFocus
                          className={cn("p-3 pointer-events-auto")}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <Label>Data de Fim</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !dataFim && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {dataFim ? format(dataFim, "MMM/yyyy", { locale: ptBR }) : "Selecionar mês"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={dataFim}
                          onSelect={setDataFim}
                          initialFocus
                          className={cn("p-3 pointer-events-auto")}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              )}

              <Button 
                onClick={handleAplicarPeriodo}
                className="w-full"
              >
                Aplicar Período Selecionado
              </Button>

              {/* Exibir média mensal */}
              <div className="p-3 bg-muted/20 rounded-md">
                <Label className="text-sm font-medium">
                  Média Mensal ({
                    filtroPersonalizado.tipo === 'mes_atual' 
                      ? 'Mês Atual'
                      : filtroPersonalizado.tipo === 'periodo_personalizado' && filtroPersonalizado.dataInicio && filtroPersonalizado.dataFim
                      ? `${format(filtroPersonalizado.dataInicio, 'MMM/yyyy', { locale: ptBR })} a ${format(filtroPersonalizado.dataFim, 'MMM/yyyy', { locale: ptBR })}`
                      : 'Período Personalizado'
                  }):
                </Label>
                <div className="text-2xl font-bold text-primary mt-2">
                  {formatCurrency(calcularMediaMensal)}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Valores calculados */}
          {markupBlock && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Valores do Bloco de Markup</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <Label className="text-sm font-medium">Gasto sobre faturamento</Label>
                  <p className="text-lg font-semibold text-blue-600">{formatPercentage(currentMarkupValues.gastoSobreFaturamento || 0)}%</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-sm font-medium">Impostos</Label>
                  <p className="text-lg font-semibold text-blue-600">{formatPercentage(currentMarkupValues.impostos || 0)}%</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-sm font-medium">Taxas da pagamento</Label>
                  <p className="text-lg font-semibold text-blue-600">{formatPercentage(currentMarkupValues.taxasMeiosPagamento || 0)}%</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-sm font-medium">Comissões</Label>
                  <p className="text-lg font-semibold text-blue-600">{formatPercentage(currentMarkupValues.comissoesPlataformas || 0)}%</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-sm font-medium">Outros</Label>
                  <p className="text-lg font-semibold text-blue-600">{formatPercentage(currentMarkupValues.outros || 0)}%</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-sm font-medium">Valor em real</Label>
                  <p className="text-lg font-semibold text-orange-600">{formatCurrency(currentMarkupValues.valorEmReal || 0)}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Seleção de custos */}
          <Tabs defaultValue="despesas" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="despesas">Despesas Fixas</TabsTrigger>
              <TabsTrigger value="folha">Folha de Pagamento</TabsTrigger>
              <TabsTrigger value="encargos">Encargos sobre Venda</TabsTrigger>
            </TabsList>

            <TabsContent value="despesas" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Despesas Fixas</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {despesasFixas.map((despesa) => (
                    <div key={despesa.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={despesa.id}
                        checked={tempCheckboxStates[despesa.id] || false}
                        onCheckedChange={(checked) => handleCheckboxChange(despesa.id, !!checked)}
                      />
                      <Label htmlFor={despesa.id} className="flex-1 text-sm">
                        {despesa.nome} - {formatCurrency(despesa.valor)}
                      </Label>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="folha" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Folha de Pagamento (Mão de Obra Indireta)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {folhaPagamento.map((funcionario) => (
                    <div key={funcionario.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={funcionario.id}
                        checked={tempCheckboxStates[funcionario.id] || false}
                        onCheckedChange={(checked) => handleCheckboxChange(funcionario.id, !!checked)}
                      />
                      <Label htmlFor={funcionario.id} className="flex-1 text-sm">
                        {funcionario.nome} - {formatCurrency(funcionario.custo_por_hora > 0 
                          ? funcionario.custo_por_hora * (funcionario.horas_totais_mes || 173.2)
                          : funcionario.salario_base
                        )}
                      </Label>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="encargos" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Encargos sobre Venda</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {encargosVenda.map((encargo) => (
                    <div key={encargo.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={encargo.id}
                        checked={tempCheckboxStates[encargo.id] || false}
                        onCheckedChange={(checked) => handleCheckboxChange(encargo.id, !!checked)}
                      />
                      <Label htmlFor={encargo.id} className="flex-1 text-sm">
                        {encargo.nome} - {encargo.valor_percentual > 0 ? `${formatPercentage(encargo.valor_percentual)}%` : formatCurrency(encargo.valor_fixo)}
                      </Label>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSalvarConfiguracao} disabled={!hasUnsavedChanges}>
            Salvar Configuração
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}