import { useState, useEffect, useMemo, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  globalPeriod?: string;
}

export function CustosModal({ open, onOpenChange, markupBlock, onMarkupUpdate, globalPeriod = '12' }: CustosModalProps) {
  const [despesasFixas, setDespesasFixas] = useState<DespesaFixa[]>([]);
  const [folhaPagamento, setFolhaPagamento] = useState<FolhaPagamento[]>([]);
  const [encargosVenda, setEncargosVenda] = useState<EncargoVenda[]>([]);
  const [loading, setLoading] = useState(false);
  const [checkboxStates, setCheckboxStates] = useState<Record<string, boolean>>({});
  const [tempCheckboxStates, setTempCheckboxStates] = useState<Record<string, boolean>>({});
  const [currentMarkupValues, setCurrentMarkupValues] = useState<Partial<MarkupBlock>>(markupBlock || {});
  const [faturamentosHistoricos, setFaturamentosHistoricos] = useState<FaturamentoHistorico[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [selectAllStates, setSelectAllStates] = useState({ // Novo estado para controlar "Selecionar Todos"
    despesasFixas: false,
    folhaPagamento: false,
    encargosVenda: false
  });
  const { user } = useAuth();
  const { toast } = useToast();
  const { loadConfiguration, saveConfiguration, deleteMultipleConfigurations } = useOptimizedUserConfigurations();

  // Atualizar valores locais quando markupBlock mudar
  useEffect(() => {
    if (markupBlock) {
      setCurrentMarkupValues(markupBlock);
    }
  }, [markupBlock]);

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

      if (despesasError) {
        throw despesasError;
      }
      setDespesasFixas(despesas || []);

      // Carregar folha de pagamento (apenas mão de obra indireta)
      const { data: folha, error: folhaError } = await supabase
        .from('folha_pagamento')
        .select('id, nome, custo_por_hora, ativo, tipo_mao_obra, salario_base, horas_totais_mes')
        .eq('user_id', user.id)
        .eq('tipo_mao_obra', 'indireta')
        .eq('ativo', true)
        .order('nome');

      if (folhaError) {
        throw folhaError;
      }
      setFolhaPagamento(folha || []);

      // Carregar encargos sobre venda
      const { data: encargos, error: encargosError } = await supabase
        .from('encargos_venda')
        .select('id, nome, valor, tipo, valor_percentual, valor_fixo, ativo')
        .eq('user_id', user.id)
        .eq('ativo', true)
        .order('nome');

      if (encargosError) {
        throw encargosError;
      }
      
      // Mapear os dados para incluir os novos campos
      const encargosFormatados = (encargos || []).map(encargo => ({
        ...encargo,
        valor_percentual: encargo.valor_percentual || 0,
        valor_fixo: encargo.valor_fixo || 0
      }));
      
      setEncargosVenda(encargosFormatados);

      // Carregar faturamentos históricos - usar a mesma lógica da MediaFaturamento
      const configFaturamentos = await loadConfiguration('faturamentos_historicos');
      if (configFaturamentos && Array.isArray(configFaturamentos)) {
        const faturamentos = configFaturamentos.map((f: any) => ({
          ...f,
          mes: new Date(f.mes)
        })).sort((a, b) => {
          // Primeiro ordena por data (mês/ano) - mais recente primeiro
          const dateCompare = b.mes.getTime() - a.mes.getTime();
          if (dateCompare !== 0) return dateCompare;
          // Se a data for igual, ordena por ID (timestamp de criação) - mais recente primeiro
          return parseInt(b.id) - parseInt(a.id);
        });
        setFaturamentosHistoricos(faturamentos);
      }

      // Carregar estados dos checkboxes salvos ANTES de calcular
      const configKey = markupBlock ? `checkbox-states-${markupBlock.id}` : 'checkbox-states-default';
      console.log(`🔧 Carregando configuração com chave: ${configKey}`);
      
      const savedStates = await loadConfiguration(configKey);
      console.log(`📋 Estados salvos carregados:`, savedStates);
      
      let statesParaUsar: Record<string, boolean> = {};
      
      if (savedStates && typeof savedStates === 'object') {
        statesParaUsar = savedStates as Record<string, boolean>;
        setCheckboxStates(statesParaUsar);
        setTempCheckboxStates(statesParaUsar);
        console.log(`✅ Estados aplicados:`, statesParaUsar);
      } else {
        // Inicializar com todos desmarcados por padrão
        [...(despesas || []), ...(folha || []), ...encargosFormatados].forEach(item => {
          statesParaUsar[item.id] = false;
        });
        setCheckboxStates(statesParaUsar);
        setTempCheckboxStates(statesParaUsar);
        console.log(`⚠️ Usando estados padrão (desmarcados):`, statesParaUsar);
      }
      
      // Calcular markup COM os estados carregados
      console.log(`🧮 Calculando markup inicial com estados:`, statesParaUsar);
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
    console.log('🔄 Modal aberto:', open, 'markupBlock:', markupBlock?.id || 'NOVO');
    if (open) {
      carregarDados();
    }
  }, [open, user, markupBlock?.id]);

  // Recalcular markup quando os dados são carregados
  useEffect(() => {
    // APENAS recalcular se não estiver criando um novo bloco E se tiver um markupBlock definido
    if (open && markupBlock && Object.keys(tempCheckboxStates).length > 0 && (encargosVenda.length > 0 || despesasFixas.length > 0 || folhaPagamento.length > 0)) {
      console.log(`🔄 Recalculando markup com estados:`, tempCheckboxStates);
      calcularMarkup(tempCheckboxStates);
    } else if (open && !markupBlock) {
      console.log(`🆕 Modal aberto para novo bloco - não calculando automaticamente`);
    }
  }, [open, tempCheckboxStates, encargosVenda, despesasFixas, folhaPagamento, markupBlock]);

  // Escutar mudanças nos faturamentos históricos em tempo real (otimizado)
  useEffect(() => {
    if (!open) return;
    
    let intervalId: NodeJS.Timeout | null = null;
    let isStale = false;
    
    const atualizarFaturamentos = async () => {
      if (isStale) return;
      
      try {
        const configFaturamentos = await loadConfiguration('faturamentos_historicos');
        if (configFaturamentos && Array.isArray(configFaturamentos) && !isStale) {
          const faturamentos = configFaturamentos.map((f: any) => ({
            ...f,
            mes: new Date(f.mes)
          })).sort((a, b) => {
            const dateCompare = b.mes.getTime() - a.mes.getTime();
            if (dateCompare !== 0) return dateCompare;
            return parseInt(b.id) - parseInt(a.id);
          });
          
          // Só atualiza se realmente mudou
          setFaturamentosHistoricos(prev => {
            if (JSON.stringify(prev) !== JSON.stringify(faturamentos)) {
              return faturamentos;
            }
            return prev;
          });
        }
      } catch (error) {
        console.error('Erro ao atualizar faturamentos:', error);
      }
    };

    // Reduzir frequência para 5 segundos
    intervalId = setInterval(atualizarFaturamentos, 5000);

    return () => {
      isStale = true;
      if (intervalId) clearInterval(intervalId);
    };
  }, [open]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    // Se for número inteiro, não mostrar casas decimais
    if (value === Math.floor(value)) {
      return value.toString();
    }
    // Se tiver decimais, mostrar até 2 casas decimais e remover zeros desnecessários
    return parseFloat(value.toFixed(2)).toString();
  };

  // Escutar mudanças em tempo real nas tabelas (otimizado)
  useEffect(() => {
    if (!user || !open) return;

    let timeoutId: NodeJS.Timeout;
    let isStale = false;
    
    const debouncedReload = () => {
      if (isStale) return;
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        if (!isStale) {
          carregarDados();
        }
      }, 1000); // Aumentado para 1 segundo
    };

    const channel = supabase
      .channel(`custos-changes-${Date.now()}`) // Canal único para evitar conflitos
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'despesas_fixas', filter: `user_id=eq.${user.id}` },
        debouncedReload
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'folha_pagamento', filter: `user_id=eq.${user.id}` },
        debouncedReload
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'encargos_venda', filter: `user_id=eq.${user.id}` },
        debouncedReload
      )
      .subscribe();

    return () => {
      isStale = true;
      clearTimeout(timeoutId);
      supabase.removeChannel(channel);
    };
  }, [user, open]);

  const handleCheckboxChange = (itemId: string, checked: boolean) => {
    const newTempStates = { ...tempCheckboxStates, [itemId]: checked };
    setTempCheckboxStates(newTempStates);
    setHasUnsavedChanges(true);
    
    // Calcular markup em tempo real apenas para mostrar preview
    debouncedCalculateMarkup(newTempStates);
  };

  // Nova função para selecionar/desmarcar todos de uma categoria
  const handleSelectAll = (categoria: 'despesasFixas' | 'folhaPagamento' | 'encargosVenda', selectAll: boolean) => {
    const newTempStates = { ...tempCheckboxStates };
    let items: any[] = [];
    
    switch (categoria) {
      case 'despesasFixas':
        items = despesasFixas;
        break;
      case 'folhaPagamento':
        items = folhaPagamento;
        break;
      case 'encargosVenda':
        items = encargosVenda;
        break;
    }
    
    // Aplicar seleção apenas aos itens ativos
    items.filter(item => item.ativo).forEach(item => {
      newTempStates[item.id] = selectAll;
    });
    
    setTempCheckboxStates(newTempStates);
    setSelectAllStates(prev => ({ ...prev, [categoria]: selectAll }));
    setHasUnsavedChanges(true);
    
    // Calcular markup em tempo real
    debouncedCalculateMarkup(newTempStates);
  };

  // Mapeamento otimizado de categorias
  const categoriasMap = useMemo(() => {
    return {
      'impostos': new Set(['ICMS', 'ISS', 'PIS/COFINS', 'IRPJ/CSLL', 'IPI']),
      'meios_pagamento': new Set(['Cartão de débito', 'Cartão de crédito', 'Boleto bancário', 'PIX', 'Gateway de pagamento']),
      'comissoes': new Set(['Marketing', 'Aplicativo de delivery', 'Plataforma SaaS', 'Colaboradores (comissão)'])
    };
  }, []);

  const getCategoriaByNome = useCallback((nome: string): 'impostos' | 'meios_pagamento' | 'comissoes' | 'outros' => {
    if (categoriasMap.impostos.has(nome)) return 'impostos';
    if (categoriasMap.meios_pagamento.has(nome)) return 'meios_pagamento';
    if (categoriasMap.comissoes.has(nome)) return 'comissoes';
    return 'outros';
  }, [categoriasMap]);

  const calcularMarkup = useCallback((states: Record<string, boolean>) => {
    if (!encargosVenda.length && !despesasFixas.length && !folhaPagamento.length) return;

    console.log('🧮 Calculando markup com estados:', states);
    console.log('📋 Despesas fixas disponíveis:', despesasFixas.map(d => ({ id: d.id, nome: d.nome, valor: d.valor, ativo: d.ativo })));
    console.log('📋 Estados das despesas:', despesasFixas.map(d => ({ id: d.id, nome: d.nome, selecionada: states[d.id] })));

    // Calcular gastos sobre faturamento (despesas fixas + folha de pagamento)
    let gastosSobreFaturamento = 0;
    
    // Somar APENAS despesas fixas marcadas como "Considerar" (true no checkbox)
    const despesasConsideradas = despesasFixas.filter(d => {
      const isSelected = states[d.id] === true; // Verificação explícita
      const isActive = d.ativo === true;
      console.log(`📋 Despesa ${d.nome}: selecionada=${isSelected}, ativa=${isActive}, será considerada=${isSelected && isActive}`);
      return isSelected && isActive;
    });
    
    const totalDespesasFixas = despesasConsideradas.reduce((acc, despesa) => acc + despesa.valor, 0);
    console.log('💰 Total despesas fixas consideradas:', totalDespesasFixas, 'de', despesasConsideradas.length, 'despesas');
    
    // Somar APENAS folha de pagamento marcada como "Considerar" (true no checkbox)
    const folhaConsiderada = folhaPagamento.filter(f => {
      const isSelected = states[f.id] === true; // Verificação explícita
      const isActive = f.ativo === true;
      return isSelected && isActive;
    });
    
    const totalFolhaPagamento = folhaConsiderada.reduce((acc, funcionario) => {
      // Usar salario_base se custo_por_hora não estiver disponível
      const custoMensal = funcionario.custo_por_hora > 0 
        ? funcionario.custo_por_hora * (funcionario.horas_totais_mes || 173.2)
        : funcionario.salario_base;
      return acc + custoMensal;
    }, 0);
    
    console.log('💰 Total folha pagamento considerada:', totalFolhaPagamento, 'de', folhaConsiderada.length, 'funcionários');
    
    const totalGastos = totalDespesasFixas + totalFolhaPagamento;
    
    // Não calcular gastos sobre faturamento no modal - isso agora é feito no componente pai

    // Calcular encargos sobre venda
    const encargosConsiderados = encargosVenda.filter(e => states[e.id] && e.ativo);
    
    // Calcular valor em real (somar apenas os valores fixos dos encargos)
    const valorEmReal = encargosConsiderados.reduce((acc, encargo) => {
      return acc + (encargo.valor_fixo || 0);
    }, 0);
    
    // Calcular somas por categoria de forma otimizada
    const categorias = encargosConsiderados.reduce((acc, encargo) => {
      const categoria = getCategoriaByNome(encargo.nome);
      const valor = encargo.valor_percentual || 0;
      
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
      valorEmReal: valorEmReal
    });

    // Atualizar valores locais para mostrar em tempo real
    setCurrentMarkupValues(prev => ({
      ...prev,
      ...categorias
    }));
    
    // Atualizar valores locais para mostrar em tempo real
    setCurrentMarkupValues(prev => ({
      ...prev,
      ...categorias
    }));
    
    // Removido: não notificar o componente pai em cada cálculo para evitar loops de requisições

  }, [encargosVenda, despesasFixas, folhaPagamento, getCategoriaByNome, onMarkupUpdate]);

  // Debounced calculation to avoid excessive re-renders (aumentado o delay)
  const debouncedCalculateMarkup = useMemo(() => {
    let timeoutId: NodeJS.Timeout;
    return (states: Record<string, boolean>) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => calcularMarkup(states), 500); // Aumentado para 500ms
    };
  }, [calcularMarkup]);

  // Calcular markup sempre que os estados mudarem (otimizado)
  useEffect(() => {
    // APENAS calcular se não estiver criando um novo bloco E tiver um markupBlock
    if (markupBlock && Object.keys(tempCheckboxStates).length > 0 && (encargosVenda.length > 0 || despesasFixas.length > 0 || folhaPagamento.length > 0)) {
      debouncedCalculateMarkup(tempCheckboxStates);
    }
  }, [tempCheckboxStates, debouncedCalculateMarkup, markupBlock]); // Adiciona markupBlock como dependência

  const handleSalvar = async () => {
    try {
      console.log('💾 Iniciando salvamento com estados:', tempCheckboxStates);
      
      // IMPORTANTE: Calcular markup ANTES de salvar para garantir valores corretos
      const markupCalculado = await new Promise<any>((resolve) => {
        // Calcular markup com os estados temporários
        calcularMarkup(tempCheckboxStates);
        
        // Aguardar um pequeno delay para garantir que o cálculo seja concluído
        setTimeout(() => {
          resolve(currentMarkupValues);
        }, 100);
      });
      
      console.log('🧮 Markup calculado para salvamento:', markupCalculado);
      
      // IMPORTANTE: Carregar configuração existente ANTES de salvar para preservar outras abas
      const configKey = markupBlock ? `checkbox-states-${markupBlock.id}` : 'checkbox-states-default';
      const configExistente = await loadConfiguration(configKey);
      
      // Mesclar configuração existente com novos estados (preservar outras abas)
      let estadosParaSalvar = { ...tempCheckboxStates };
      
      if (configExistente && typeof configExistente === 'object') {
        // Preservar estados existentes que não foram modificados nesta sessão
        const configAtual = configExistente as Record<string, boolean>;
        
        // Criar lista de IDs dos itens atuais (visíveis no modal)
        const idsAtuais = new Set([
          ...despesasFixas.map(d => d.id),
          ...folhaPagamento.map(f => f.id), 
          ...encargosVenda.map(e => e.id)
        ]);
        
        // Para cada item na configuração salva
        Object.keys(configAtual).forEach(id => {
          // Se o item não está na lista atual (outra aba/contexto), preservar valor salvo
          if (!idsAtuais.has(id)) {
            estadosParaSalvar[id] = configAtual[id];
          }
        });
        
        console.log('🔄 Estados mesclados - preservando outras abas:', estadosParaSalvar);
      }
      
      // Salvar estados mesclados no banco
      await saveConfiguration(configKey, estadosParaSalvar);
      console.log('✅ Configuração salva no banco:', configKey, estadosParaSalvar);
      
      // Atualizar estados locais
      setCheckboxStates(estadosParaSalvar);
      setHasUnsavedChanges(false);
      
      toast({
        title: markupBlock ? "Configurações salvas" : "Bloco criado com sucesso",
        description: markupBlock 
          ? "As configurações do markup foram salvas com sucesso"
          : "O novo bloco de markup foi criado e configurado"
      });
      
      // Emitir callback para o componente pai COM os valores calculados
      if (onMarkupUpdate) {
        console.log('📤 Enviando dados calculados para componente pai:', markupCalculado);
        onMarkupUpdate(markupCalculado);
      }
      
      // Fechar modal após um pequeno delay
      setTimeout(() => {
        onOpenChange(false);
      }, 100);
      
    } catch (error) {
      console.error('❌ Erro ao salvar:', error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar as configurações",
        variant: "destructive"
      });
    }
  };

  const handleCancelar = () => {
    console.log('🚫 Cancelando alterações, restaurando estados originais');
    // Restaurar estados originais
    setTempCheckboxStates(checkboxStates);
    setHasUnsavedChanges(false);
    calcularMarkup(checkboxStates);
    onOpenChange(false);
  };

  const renderEncargosPorCategoria = (categoria: 'impostos' | 'meios_pagamento' | 'comissoes' | 'outros', titulo: string) => {
    const encargosDaCategoria = encargosVenda.filter(e => getCategoriaByNome(e.nome) === categoria);
    
    if (encargosDaCategoria.length === 0) return null;

    return (
      <div key={categoria} className="space-y-3">
        <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
          {titulo}
        </h4>
        <div className="space-y-2">
           {encargosDaCategoria.map((encargo) => (
            <div key={encargo.id} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex-1">
                <h5 className="font-medium">{encargo.nome}</h5>
                <div className="flex gap-4 text-sm text-muted-foreground">
                  {encargo.valor_percentual > 0 && encargo.valor_fixo > 0 ? (
                    <>
                      <span>{encargo.valor_percentual}%</span>
                      <span>{formatCurrency(encargo.valor_fixo)}</span>
                    </>
                  ) : encargo.valor_percentual > 0 ? (
                    <span>{encargo.valor_percentual}%</span>
                  ) : encargo.valor_fixo > 0 ? (
                    <span>{formatCurrency(encargo.valor_fixo)}</span>
                  ) : (
                    <span>0% / R$ 0,00</span>
                  )}
                </div>
              </div>
                       <div className="flex items-center gap-3">
                           <Checkbox 
                             id={`encargo-${encargo.id}`}
                             checked={tempCheckboxStates[encargo.id] ?? false}
                             onCheckedChange={(checked) => handleCheckboxChange(encargo.id, checked as boolean)}
                           />
                         <Label 
                           htmlFor={`encargo-${encargo.id}`}
                           className="text-sm font-medium cursor-pointer"
                         >
                           Considerar
                         </Label>
                       </div>
            </div>
          ))}
                      </div>
        {categoria !== 'outros' && <Separator />}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Configurações de Custos
            {markupBlock ? (
              <span className="text-sm font-normal text-muted-foreground ml-2">
                - {markupBlock.nome}
              </span>
            ) : (
              <span className="text-sm font-normal text-muted-foreground ml-2">
                - Novo Bloco
              </span>
            )}
          </DialogTitle>
          <DialogDescription>
            {markupBlock 
              ? "Visualize os custos que serão considerados no cálculo do markup"
              : "Configure os custos que serão considerados no cálculo do novo bloco de markup"
            }
          </DialogDescription>
        </DialogHeader>


        <Tabs defaultValue="despesas-fixas" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="despesas-fixas">Despesas Fixas</TabsTrigger>
            <TabsTrigger value="folha-pagamento">Folha de Pagamento</TabsTrigger>
            <TabsTrigger value="encargos-venda">Encargos sobre Venda</TabsTrigger>
          </TabsList>

          <TabsContent value="despesas-fixas" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Despesas Fixas</CardTitle>
                  <div className="flex items-center gap-2">
                    <Checkbox 
                      id="select-all-despesas"
                      checked={selectAllStates.despesasFixas}
                      onCheckedChange={(checked) => handleSelectAll('despesasFixas', checked as boolean)}
                    />
                    <Label htmlFor="select-all-despesas" className="text-sm font-medium cursor-pointer">
                      Selecionar Todos
                    </Label>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {loading ? (
                  <p className="text-muted-foreground text-center py-4">
                    Carregando despesas...
                  </p>
                ) : despesasFixas.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground mb-2">
                      Nenhuma despesa fixa cadastrada
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Adicione despesas na aba "Custos" para vê-las aqui
                    </p>
                  </div>
                ) : (
                  despesasFixas.map((despesa) => (
                    <div key={despesa.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <h4 className="font-medium">{despesa.nome}</h4>
                        <p className="text-sm text-muted-foreground">
                          {formatCurrency(despesa.valor)}
                        </p>
                      </div>
                       <div className="flex items-center gap-3">
                           <Checkbox 
                             id={`despesa-${despesa.id}`}
                             checked={tempCheckboxStates[despesa.id] ?? false}
                             onCheckedChange={(checked) => handleCheckboxChange(despesa.id, checked as boolean)}
                           />
                         <Label 
                           htmlFor={`despesa-${despesa.id}`}
                           className="text-sm font-medium cursor-pointer"
                         >
                           Considerar
                         </Label>
                       </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="folha-pagamento" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Folha de Pagamento</CardTitle>
                  <div className="flex items-center gap-2">
                    <Checkbox 
                      id="select-all-folha"
                      checked={selectAllStates.folhaPagamento}
                      onCheckedChange={(checked) => handleSelectAll('folhaPagamento', checked as boolean)}
                    />
                    <Label htmlFor="select-all-folha" className="text-sm font-medium cursor-pointer">
                      Selecionar Todos
                    </Label>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {loading ? (
                  <p className="text-muted-foreground text-center py-4">
                    Carregando funcionários...
                  </p>
                ) : folhaPagamento.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground mb-2">
                      Nenhum funcionário cadastrado
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Adicione funcionários na aba "Custos" para vê-los aqui
                    </p>
                  </div>
                ) : (
                  folhaPagamento.map((funcionario) => (
                    <div key={funcionario.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <h4 className="font-medium">{funcionario.nome}</h4>
                        <p className="text-sm text-muted-foreground">
                          {formatCurrency(funcionario.salario_base || 0)} total
                        </p>
                      </div>
                       <div className="flex items-center gap-3">
                           <Checkbox 
                             id={`funcionario-${funcionario.id}`}
                             checked={tempCheckboxStates[funcionario.id] ?? false}
                             onCheckedChange={(checked) => handleCheckboxChange(funcionario.id, checked as boolean)}
                           />
                         <Label 
                           htmlFor={`funcionario-${funcionario.id}`}
                           className="text-sm font-medium cursor-pointer"
                         >
                           Considerar
                         </Label>
                       </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="encargos-venda" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Encargos sobre Venda</CardTitle>
                  <div className="flex items-center gap-2">
                    <Checkbox 
                      id="select-all-encargos"
                      checked={selectAllStates.encargosVenda}
                      onCheckedChange={(checked) => handleSelectAll('encargosVenda', checked as boolean)}
                    />
                    <Label htmlFor="select-all-encargos" className="text-sm font-medium cursor-pointer">
                      Selecionar Todos
                    </Label>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {loading ? (
                  <p className="text-muted-foreground text-center py-4">
                    Carregando encargos...
                  </p>
                ) : encargosVenda.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground mb-2">
                      Nenhum encargo cadastrado
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Adicione encargos na aba "Custos" para vê-los aqui
                    </p>
                  </div>
                ) : (
                  <>
                    {renderEncargosPorCategoria('impostos', 'Impostos')}
                    {renderEncargosPorCategoria('meios_pagamento', 'Taxas de Meios de Pagamento')}
                    {renderEncargosPorCategoria('comissoes', 'Comissões e Plataformas')}
                    {renderEncargosPorCategoria('outros', 'Outros')}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
           </Tabs>
           
            <DialogFooter className="gap-2 pt-4">
              <Button 
                variant="outline" 
                onClick={handleCancelar}
              >
                Cancelar
              </Button>
              <Button 
                onClick={handleSalvar}
                disabled={!hasUnsavedChanges}
              >
                {markupBlock ? "Salvar Configurações" : "Criar Bloco de Markup"}
              </Button>
            </DialogFooter>
         </DialogContent>
       </Dialog>
  );
}