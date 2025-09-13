import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calculator, Plus, Trash2, Edit2, Check, X, Info, Settings } from 'lucide-react';
import { useOptimizedUserConfigurations } from '@/hooks/useOptimizedUserConfigurations';
import { useToast } from '@/hooks/use-toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { CustosModal } from './CustosModal';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

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

interface CalculatedMarkup {
  gastoSobreFaturamento: number;
  impostos: number;
  taxasMeiosPagamento: number;
  comissoesPlataformas: number;
  outros: number;
  valorEmReal: number;
}

interface MarkupsProps {
  globalPeriod?: string;
}

export function Markups({ globalPeriod = "12" }: MarkupsProps) {
  const [blocos, setBlocos] = useState<MarkupBlock[]>([]);
  const [modalEdicaoNome, setModalEdicaoNome] = useState(false);
  const [blocoEditandoNome, setBlocoEditandoNome] = useState<MarkupBlock | null>(null);
  const [nomeTemp, setNomeTemp] = useState('');
  const [calculatedMarkups, setCalculatedMarkups] = useState<Map<string, CalculatedMarkup>>(new Map());
  const [faturamentosHistoricos, setFaturamentosHistoricos] = useState<Array<{ data: string; valor: number }>>([]);
  
  // Estados para configuração
  const [modalConfiguracaoAberto, setModalConfiguracaoAberto] = useState(false);
  const [blocoConfigurandoId, setBlocoConfigurandoId] = useState<string | null>(null);
  
  // Referência estável para evitar loops de dependência
  const blocosRef = useRef<MarkupBlock[]>([]);
  useEffect(() => {
    blocosRef.current = blocos;
  }, [blocos]);
  
  const { loadConfiguration, saveConfiguration, invalidateCache } = useOptimizedUserConfigurations();
  const { toast } = useToast();
  const { user } = useAuth();
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Bloco fixo para subreceita
  const blocoSubreceita: MarkupBlock = {
    id: 'subreceita-fixo',
    nome: 'subreceita',
    gastoSobreFaturamento: 0,
    impostos: 0,
    taxasMeiosPagamento: 0,
    comissoesPlataformas: 0,
    outros: 0,
    valorEmReal: 0,
    lucroDesejado: 0
  };

  // Mapeamento de categorias - MESMA LÓGICA DO MODAL
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

  // Buscar faturamentos históricos - mesma lógica do MediaFaturamento
  const buscarFaturamentos = useCallback(async () => {
    if (!user?.id) return;

    try {
      // Carregar faturamentos históricos do mesmo lugar que MediaFaturamento
      const configFaturamentos = await loadConfiguration('faturamentos_historicos');
      if (configFaturamentos && Array.isArray(configFaturamentos)) {
        const faturamentos = configFaturamentos.map((f: any) => ({
          data: f.mes, // Usar campo 'mes' como data
          valor: f.valor
        }));
        setFaturamentosHistoricos(faturamentos);
      } else {
        setFaturamentosHistoricos([]);
      }
    } catch (error) {
      console.error('Erro ao buscar faturamentos:', error);
      setFaturamentosHistoricos([]);
    }
  }, [user?.id, loadConfiguration]);

  // Função helper para calcular média mensal baseada no período global
  const calcularMediaMensal = useMemo(() => {
    if (faturamentosHistoricos.length === 0) return 0;

    const periodo = globalPeriod || '12';
    let faturamentosSelecionados = [...faturamentosHistoricos];

    if (periodo !== 'todos') {
      const mesesAtras = parseInt(String(periodo), 10);
      const dataLimite = new Date();
      dataLimite.setMonth(dataLimite.getMonth() - mesesAtras);
      faturamentosSelecionados = faturamentosHistoricos.filter(f => new Date(f.data) >= dataLimite);
    }

    if (faturamentosSelecionados.length === 0) return 0;

    const totalFaturamento = faturamentosSelecionados.reduce((acc, f) => acc + f.valor, 0);
    const media = totalFaturamento / faturamentosSelecionados.length;
    return media;
  }, [faturamentosHistoricos, globalPeriod]);

  const periodoLabel = useMemo(() => {
    switch (globalPeriod) {
      case '1': return 'último mês';
      case '3': return 'últimos 3 meses';
      case '6': return 'últimos 6 meses';
      case '12': return 'últimos 12 meses';
      case 'todos': return 'todos os meses';
      default: return 'últimos 12 meses';
    }
  }, [globalPeriod]);

  // Buscar faturamentos ao carregar componente
  useEffect(() => {
    buscarFaturamentos();
  }, [buscarFaturamentos]);

  // Função ÚNICA para carregar e calcular configurações salvas
  const carregarConfiguracoesSalvas = useCallback(async () => {
    const blocosAtuais = blocosRef.current;
    if (!user?.id || blocosAtuais.length === 0) {
      console.log('⏳ Aguardando carregamento...');
      return;
    }

    console.log('🔄 Carregando configurações salvas para', blocosAtuais.length, 'blocos com período:', globalPeriod);

    const novosCalculatedMarkups = new Map<string, CalculatedMarkup>();

    // Buscar dados uma só vez para todos os blocos (Isso está ótimo para performance)
    const [{ data: despesasFixas }, { data: folhaPagamento }, { data: encargosVenda }] = await Promise.all([
        supabase.from('despesas_fixas').select('*').eq('user_id', user.id),
        supabase.from('folha_pagamento').select('*').eq('user_id', user.id),
        supabase.from('encargos_venda').select('*').eq('user_id', user.id)
    ]);

    // Carrega todos os faturamentos aqui, mas o cálculo será feito dentro do loop.
    const faturamentosConfig = await loadConfiguration('faturamentos_historicos');
    const todosFaturamentos = (faturamentosConfig && Array.isArray(faturamentosConfig))
        ? faturamentosConfig.map((f: any) => ({ ...f, mes: new Date(f.mes) }))
        : [];

    console.log('📊 Dados base para cálculo (período:', globalPeriod, '):', {
        despesasFixas: despesasFixas?.length,
        folhaPagamento: folhaPagamento?.length,
        encargosVenda: encargosVenda?.length,
        totalFaturamentos: todosFaturamentos.length
    });

    // Processar cada bloco individualmente
    for (const bloco of blocosAtuais) {
        const configKey = `checkbox-states-${bloco.id}`;
        const config = await loadConfiguration(configKey);
        
        console.log(`📋 Processando ${bloco.nome} com configuração:`, config);

        // Lógica de cálculo da média de faturamento movida para DENTRO do loop
        let mediaMensal = 0;
        
        // NOVA LÓGICA: Use o filtro global para todos os blocos EXCETO o subreceita
        const periodoSelecionado = bloco.id === 'subreceita-fixo' ? 'todos' : globalPeriod;
        
        let faturamentosFiltrados = todosFaturamentos;

        if (periodoSelecionado !== 'todos') {
            const mesesAtras = parseInt(String(periodoSelecionado), 10);
            const dataLimite = new Date();
            dataLimite.setMonth(dataLimite.getMonth() - mesesAtras);

            faturamentosFiltrados = todosFaturamentos.filter((f: any) => f.mes >= dataLimite);
        }

        if (faturamentosFiltrados.length > 0) {
            const total = faturamentosFiltrados.reduce((acc: number, f: any) => acc + f.valor, 0);
            mediaMensal = total / faturamentosFiltrados.length;
        }
        
        console.log(`📅 Para o bloco "${bloco.nome}" com período "${periodoSelecionado}", a média mensal é: ${mediaMensal}`);

        if (config && typeof config === 'object' && Object.keys(config).length > 0) {
            
            let gastosSobreFaturamento = 0;
            
            // Somar despesas fixas marcadas como "Considerar" E ATIVAS
            const despesasConsideradas = despesasFixas ? despesasFixas.filter(d => config[d.id] && d.ativo) : [];
            const totalDespesasFixas = despesasConsideradas.reduce((acc, despesa) => acc + Number(despesa.valor), 0);
            
            // Somar folha de pagamento marcada como "Considerar" E ATIVA
            const folhaConsiderada = folhaPagamento ? folhaPagamento.filter(f => config[f.id] && f.ativo) : [];
            const totalFolhaPagamento = folhaConsiderada.reduce((acc, funcionario) => {
                const custoMensal = funcionario.custo_por_hora > 0 
                    ? funcionario.custo_por_hora * (funcionario.horas_totais_mes || 173.2)
                    : funcionario.salario_base;
                return acc + Number(custoMensal);
            }, 0);
            
            const totalGastos = totalDespesasFixas + totalFolhaPagamento;
            
            // Calcular porcentagem sobre a média mensal ESPECÍFICA deste bloco
            if (mediaMensal > 0 && totalGastos > 0) {
                gastosSobreFaturamento = (totalGastos / mediaMensal) * 100;
            }

            console.log(`💰 Cálculo detalhado para ${bloco.nome}:`, {
                totalGastos,
                mediaMensal,
                gastosSobreFaturamento
            });

            // O restante da lógica permanece o mesmo...
            const encargosConsiderados = encargosVenda ? encargosVenda.filter(e => config[e.id] && e.ativo) : [];
            const valorEmReal = encargosConsiderados.reduce((acc, encargo) => acc + Number(encargo.valor_fixo || 0), 0);
            
            const categorias = encargosConsiderados.reduce((acc, encargo) => {
                const categoria = getCategoriaByNome(encargo.nome);
                const valor = Number(encargo.valor_percentual || 0);
                
                switch (categoria) {
                    case 'impostos': acc.impostos += valor; break;
                    case 'meios_pagamento': acc.taxasMeiosPagamento += valor; break;
                    case 'comissoes': acc.comissoesPlataformas += valor; break;
                    case 'outros': acc.outros += valor; break;
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

            novosCalculatedMarkups.set(bloco.id, categorias);
            console.log(`✅ Markup final calculado para ${bloco.nome}:`, categorias);

        } else {
            console.log(`⚠️ Sem configuração válida para ${bloco.nome}, usando valores zerados`);
            novosCalculatedMarkups.set(bloco.id, {
                gastoSobreFaturamento: 0,
                impostos: 0,
                taxasMeiosPagamento: 0,
                comissoesPlataformas: 0,
                outros: 0,
                valorEmReal: 0
            });
        }
    }
    
    if (novosCalculatedMarkups.size > 0) {
        setCalculatedMarkups(novosCalculatedMarkups);
        console.log('✅ Configurações salvas aplicadas com sucesso para todos os blocos!');
    }
  }, [user?.id, loadConfiguration, getCategoriaByNome, globalPeriod]);

  const abrirConfiguracaoCompleta = useCallback((blocoId: string) => {
    setBlocoConfigurandoId(blocoId);
    setModalConfiguracaoAberto(true);
  }, []);

  useEffect(() => {
    const carregarBlocos = async () => {
      try {
        const config = await loadConfiguration('markups_blocos');
        if (config && Array.isArray(config)) {
          setBlocos(config as unknown as MarkupBlock[]);
          console.log('📦 Blocos carregados:', config.length);
        }
      } catch (error) {
        console.error('Erro ao carregar blocos:', error);
      }
    };
    carregarBlocos();
  }, [loadConfiguration]);
  
  // Carregar/recalcular configurações quando blocos, usuário ou período mudarem
  useEffect(() => {
    if (blocos.length > 0 && user?.id) {
      console.log('🎯 Executando cálculo dos markups (trigger: blocos/user/período)...');
      carregarConfiguracoesSalvas();
    }
  }, [blocos.length, user?.id, globalPeriod, carregarConfiguracoesSalvas]);


  // Real-time updates: escutar mudanças na tabela user_configurations
  useEffect(() => {
    if (!user?.id) return;

    console.log('🔄 Configurando real-time updates para configurações de markup');
    
    const channel = supabase
      .channel('user-configurations-markups')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_configurations',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('🔔 Real-time update recebida:', payload);
          
          // Verificar se é uma mudança relacionada aos nossos dados
          const configType = (payload.new as any)?.config_key || (payload.old as any)?.config_key;
          if (configType && (
                configType.includes('checkbox-states-') ||
                configType === 'despesas_fixas' ||
                configType === 'folha_pagamento' ||
                configType === 'encargos_venda' ||
                configType === 'faturamentos_historicos' ||
                configType === 'despesas_fixas' ||
                configType === 'folha_pagamento' ||
                configType === 'encargos_venda')) {
             
            console.log('🔃 Recarregando configurações devido à mudança em tempo real');
            
            // Invalidar cache para forçar recarregamento
            invalidateCache();
            
            // Pequeno delay para garantir que todas as alterações foram salvas
            setTimeout(() => {
              carregarConfiguracoesSalvas();
            }, 300);
          }
        }
      )
      .subscribe();

    return () => {
      console.log('🔌 Desconectando real-time updates');
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  // Limpar timeouts ao desmontar
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const salvarBlocos = useCallback(async (novosBlocos: MarkupBlock[]) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    
    debounceRef.current = setTimeout(async () => {
      try {
        await saveConfiguration('markups_blocos', novosBlocos);
      } catch (error) {
        console.error('Erro ao salvar blocos:', error);
      }
    }, 800);
  }, [saveConfiguration]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return value.toFixed(2);
  };

  const criarNovoBloco = () => {
    // 🎯 NOVO: Criação direta sem modal complexo
    const novoBloco: MarkupBlock = {
      id: Date.now().toString(),
      nome: `Markup ${blocos.length + 1}`,
      gastoSobreFaturamento: 0,
      impostos: 0,
      taxasMeiosPagamento: 0,
      comissoesPlataformas: 0,
      outros: 0,
      valorEmReal: 0,
      lucroDesejado: 20
    };
    
    const novosBlocos = [...blocos, novoBloco];
    setBlocos(novosBlocos);
    salvarBlocos(novosBlocos);
    
    // 🎯 NOVA FUNCIONALIDADE: Abrir modal de configuração automaticamente
    setBlocoConfigurandoId(novoBloco.id);
    setModalConfiguracaoAberto(true);

    toast({
      title: "Bloco criado!",
      description: `O bloco "${novoBloco.nome}" foi criado com sucesso.`
    });
  };

  const removerBloco = (id: string) => {
    const novosBlocos = blocos.filter(bloco => bloco.id !== id);
    setBlocos(novosBlocos);
    salvarBlocos(novosBlocos);
    
    // Remover do mapa de cálculos
    const novosCalculatedMarkups = new Map(calculatedMarkups);
    novosCalculatedMarkups.delete(id);
    setCalculatedMarkups(novosCalculatedMarkups);
  };

  const iniciarEdicaoNome = (bloco: MarkupBlock) => {
    setBlocoEditandoNome(bloco);
    setNomeTemp(bloco.nome);
    setModalEdicaoNome(true);
  };

  const salvarNome = () => {
    if (!blocoEditandoNome) return;
    
    const novosBlocos = blocos.map(bloco => 
      bloco.id === blocoEditandoNome.id 
        ? { ...bloco, nome: nomeTemp }
        : bloco
    );
    
    setBlocos(novosBlocos);
    salvarBlocos(novosBlocos);
    setModalEdicaoNome(false);
    setBlocoEditandoNome(null);
    setNomeTemp('');
  };

  const cancelarEdicaoNome = () => {
    setModalEdicaoNome(false);
    setBlocoEditandoNome(null);
    setNomeTemp('');
  };

  const atualizarBloco = (id: string, campo: keyof MarkupBlock, valor: any) => {
    const novosBlocos = blocos.map(bloco => 
      bloco.id === id ? { ...bloco, [campo]: valor } : bloco
    );
    setBlocos(novosBlocos);
    salvarBlocos(novosBlocos);
  };

  const calcularMarkupIdeal = (bloco: MarkupBlock, calculated: CalculatedMarkup) => {
    const totalPercentuais = calculated.gastoSobreFaturamento + calculated.impostos + 
                            calculated.taxasMeiosPagamento + calculated.comissoesPlataformas + 
                            calculated.outros + bloco.lucroDesejado;
    
    const markup = 100 / (100 - totalPercentuais);
    return isFinite(markup) ? markup : 1;
  };

  return (
    <div className="space-y-6">
      {/* Botão para criar novo bloco */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Configuração de Markups</h2>
        <Button 
          onClick={criarNovoBloco}
          className="bg-primary hover:bg-primary/90"
        >
          <Plus className="h-4 w-4 mr-2" />
          Novo Bloco de Markup
        </Button>
      </div>

      {/* Bloco Subreceita - Sempre fixo */}
      <Card className="border-primary bg-primary/5">
        <CardHeader>
          <CardTitle className="text-primary capitalize font-bold text-xl flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Subreceita (Base de Cálculo)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <Label className="text-sm font-medium text-muted-foreground">Gasto sobre faturamento</Label>
              <div className="text-2xl font-bold text-primary">15%</div>
            </div>
            <div className="space-y-1">
              <Label className="text-sm font-medium text-muted-foreground">Impostos</Label>
              <div className="text-2xl font-bold text-primary">25%</div>
            </div>
            <div className="space-y-1">
              <Label className="text-sm font-medium text-muted-foreground">Taxas de meios de pagamento</Label>
              <div className="text-2xl font-bold text-primary">5%</div>
            </div>
            <div className="space-y-1">
              <Label className="text-sm font-medium text-muted-foreground">Comissões e plataformas</Label>
              <div className="text-2xl font-bold text-primary">10%</div>
            </div>
            <div className="space-y-1">
              <Label className="text-sm font-medium text-muted-foreground">Outros</Label>
              <div className="text-2xl font-bold text-primary">5%</div>
            </div>
            <div className="space-y-1">
              <Label className="text-sm font-medium text-muted-foreground">Valor em real</Label>
              <div className="text-2xl font-bold" style={{ color: 'hsl(var(--orange))' }}>{formatCurrency(200)}</div>
            </div>
            <div className="space-y-1">
              <Label className="text-sm font-medium text-muted-foreground">Lucro desejado sobre venda</Label>
              <div className="text-2xl font-bold" style={{ color: 'hsl(var(--accent))' }}>20%</div>
            </div>
          </div>
          
          <div className="mt-6 pt-4 border-t bg-primary/5 dark:bg-primary/10 -mx-6 px-6 pb-6">
            <div className="flex items-center justify-between">
              <Label className="text-lg font-semibold text-primary">Markup ideal</Label>
              <div className="text-3xl font-bold text-primary">2,50</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Blocos do usuário */}
      {blocos.map((bloco) => {
        const calculated = calculatedMarkups.get(bloco.id);
        const hasCalculated = calculated !== undefined;
        const markupIdeal = hasCalculated ? calcularMarkupIdeal(bloco, calculated) : 1;
        
        return (
          <Card key={bloco.id} className="border-border">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-primary capitalize font-bold text-xl">
                  {bloco.nome}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => iniciarEdicaoNome(bloco)}
                    className="h-8 w-8 p-0"
                  >
                    <Edit2 className="h-3 w-3" />
                  </Button>
                  
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => abrirConfiguracaoCompleta(bloco.id)}
                    className="h-8 px-3 flex items-center gap-1"
                  >
                    <Settings className="h-3 w-3" />
                    Configurar
                  </Button>
                  
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => removerBloco(bloco.id)}
                    className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              
              {/* Filtro de Período e Média de Faturamento - Individual por bloco */}
              <div className="mt-4 p-4 bg-blue-50/50 border border-blue-200 rounded-lg">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <Label className="text-sm font-medium whitespace-nowrap">
                      Período:
                    </Label>
                    <Select value={globalPeriod} onValueChange={(value) => {
                      // Trigger change event for parent component
                      const newSearchParams = new URLSearchParams(window.location.search);
                      newSearchParams.set('periodo', value);
                      window.history.replaceState({}, '', `${window.location.pathname}?${newSearchParams}`);
                      window.location.reload();
                    }}>
                      <SelectTrigger className="w-[160px]">
                        <SelectValue />
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
                  <div className="text-right">
                    <Label className="text-sm font-medium text-muted-foreground">
                      Média de faturamento ({periodoLabel})
                    </Label>
                    <p className="text-lg font-bold text-primary">
                      {formatCurrency(calcularMediaMensal)}
                    </p>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <Label className="text-sm font-medium text-muted-foreground">Gasto sobre faturamento</Label>
                  <div className="text-2xl font-bold text-primary">
                    {hasCalculated ? formatPercentage(calculated.gastoSobreFaturamento) : '0'} <span className="text-sm">%</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-sm font-medium text-muted-foreground">Impostos</Label>
                  <div className="text-2xl font-bold text-primary">
                    {hasCalculated ? formatPercentage(calculated.impostos) : '0'} <span className="text-sm">%</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-sm font-medium text-muted-foreground">Taxas de meios de pagamento</Label>
                  <div className="text-2xl font-bold text-primary">
                    {hasCalculated ? formatPercentage(calculated.taxasMeiosPagamento) : '0'} <span className="text-sm">%</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-sm font-medium text-muted-foreground">Comissões e plataformas</Label>
                  <div className="text-2xl font-bold text-primary">
                    {hasCalculated ? formatPercentage(calculated.comissoesPlataformas) : '0'} <span className="text-sm">%</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-sm font-medium text-muted-foreground">Outros</Label>
                  <div className="text-2xl font-bold text-primary">
                    {hasCalculated ? formatPercentage(calculated.outros) : '0'} <span className="text-sm">%</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-sm font-medium text-muted-foreground">Valor em real</Label>
                  <div className="text-2xl font-bold" style={{ color: 'hsl(var(--orange))' }}>
                    {hasCalculated ? formatCurrency(calculated.valorEmReal) : formatCurrency(0)}
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-sm font-medium text-muted-foreground">Lucro desejado sobre venda</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={bloco.lucroDesejado}
                      onChange={(e) => atualizarBloco(bloco.id, 'lucroDesejado', parseFloat(e.target.value) || 0)}
                      className="font-bold"
                      style={{ color: 'hsl(var(--accent))' }}
                    />
                    <span className="font-bold" style={{ color: 'hsl(var(--accent))' }}>%</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t bg-card -mx-6 px-6 pb-6">
                <div className="flex items-center justify-between">
                  <Label className="text-lg font-semibold text-primary">Markup ideal</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center gap-2 text-3xl font-bold text-primary">
                          {hasCalculated ? markupIdeal.toFixed(2) : '1.00'}
                          <Info className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Markup = 100 / (100 - % total)</p>
                        <p>Onde % total = soma de todos os custos + lucro desejado</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* Modal de edição de nome */}
      <Dialog open={modalEdicaoNome} onOpenChange={setModalEdicaoNome}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Editar Nome do Bloco</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome do bloco</Label>
              <Input
                id="nome"
                value={nomeTemp}
                onChange={(e) => setNomeTemp(e.target.value)}
                placeholder="Digite o nome do bloco"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') salvarNome();
                  if (e.key === 'Escape') cancelarEdicaoNome();
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={cancelarEdicaoNome}>
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
            <Button onClick={salvarNome}>
              <Check className="h-4 w-4 mr-2" />
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de configuração de custos */}
      <CustosModal
        open={modalConfiguracaoAberto}
        onOpenChange={setModalConfiguracaoAberto}
        markupBlock={blocoConfigurandoId ? blocos.find(b => b.id === blocoConfigurandoId) : undefined}
        globalPeriod={globalPeriod}
        onMarkupUpdate={(dados) => {
          if (!blocoConfigurandoId) return;
          setCalculatedMarkups((prev) => {
            const novo = new Map(prev);
            const anterior = novo.get(blocoConfigurandoId);
            const atualizado: CalculatedMarkup = {
              gastoSobreFaturamento: Number(dados.gastoSobreFaturamento ?? anterior?.gastoSobreFaturamento ?? 0),
              impostos: Number(dados.impostos ?? anterior?.impostos ?? 0),
              taxasMeiosPagamento: Number(dados.taxasMeiosPagamento ?? anterior?.taxasMeiosPagamento ?? 0),
              comissoesPlataformas: Number(dados.comissoesPlataformas ?? anterior?.comissoesPlataformas ?? 0),
              outros: Number(dados.outros ?? anterior?.outros ?? 0),
              valorEmReal: Number(dados.valorEmReal ?? anterior?.valorEmReal ?? 0),
            };
            novo.set(blocoConfigurandoId, atualizado);
            return novo;
          });
        }}
      />
    </div>
  );
}