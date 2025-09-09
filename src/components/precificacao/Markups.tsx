import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Calculator, Plus, Trash2, Edit2, Check, X, Info, Settings, ChevronDown, ChevronUp } from 'lucide-react';
import { useOptimizedUserConfigurations } from '@/hooks/useOptimizedUserConfigurations';
import { useToast } from '@/hooks/use-toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
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

export function Markups() {
  const [blocos, setBlocos] = useState<MarkupBlock[]>([]);
  const [modalEdicaoNome, setModalEdicaoNome] = useState(false);
  const [blocoEditandoNome, setBlocoEditandoNome] = useState<MarkupBlock | null>(null);
  const [nomeTemp, setNomeTemp] = useState('');
  const [calculatedMarkups, setCalculatedMarkups] = useState<Map<string, CalculatedMarkup>>(new Map());
  
  // 🎯 NOVO: Estados para o submenu de períodos
  const [submenusAbertos, setSubmenusAbertos] = useState<Set<string>>(new Set());
  const [periodosAplicados, setPeriodosAplicados] = useState<Map<string, string>>(new Map());
  
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

  // Função ÚNICA para carregar e calcular configurações salvas
  const carregarConfiguracoesSalvas = useCallback(async () => {
    if (!user?.id || blocos.length === 0) return;
    
    console.log('🔄 Carregando configurações salvas para', blocos.length, 'blocos');
    
    const novosCalculatedMarkups = new Map<string, CalculatedMarkup>();
    
    // Buscar dados uma só vez para todos os blocos
    const [{ data: despesasFixas }, { data: folhaPagamento }, { data: encargosVenda }] = await Promise.all([
      supabase.from('despesas_fixas').select('*').eq('user_id', user.id),
      supabase.from('folha_pagamento').select('*').eq('user_id', user.id),
      supabase.from('encargos_venda').select('*').eq('user_id', user.id)
    ]);

    // Buscar faturamentos históricos
    const faturamentosConfig = await loadConfiguration('faturamentos_historicos');
    let mediaMensal = 0;
    if (faturamentosConfig && Array.isArray(faturamentosConfig)) {
      const faturamentos = faturamentosConfig.map((f: any) => ({
        ...f,
        mes: new Date(f.mes)
      }));
      const total = faturamentos.reduce((acc: number, f: any) => acc + f.valor, 0);
      mediaMensal = total / Math.max(1, faturamentos.length);
    }
    
    console.log('📊 Dados para cálculo:', {
      despesasFixas: despesasFixas?.length,
      folhaPagamento: folhaPagamento?.length, 
      encargosVenda: encargosVenda?.length,
      mediaMensal
    });
    
    // Processar cada bloco usando EXATAMENTE A MESMA LÓGICA DO MODAL
    for (const bloco of blocos) {
      const configKey = `checkbox-states-${bloco.id}`;
      const config = await loadConfiguration(configKey);
      
      console.log(`📋 Processando ${bloco.nome} com configuração:`, config);
      
      if (config && typeof config === 'object' && Object.keys(config).length > 0) {
        // USAR EXATAMENTE A MESMA LÓGICA DO calcularMarkup DO MODAL
        
        let gastosSobreFaturamento = 0;
        
        // Somar despesas fixas marcadas como "Considerar" E ATIVAS
        const despesasConsideradas = despesasFixas ? despesasFixas.filter(d => config[d.id] && d.ativo) : [];
        const totalDespesasFixas = despesasConsideradas.reduce((acc, despesa) => acc + Number(despesa.valor), 0);
        
        // Somar folha de pagamento marcada como "Considerar" E ATIVA
        const folhaConsiderada = folhaPagamento ? folhaPagamento.filter(f => config[f.id] && f.ativo) : [];
        const totalFolhaPagamento = folhaConsiderada.reduce((acc, funcionario) => {
          // Usar salario_base se custo_por_hora não estiver disponível (MESMA LÓGICA DO MODAL)
          const custoMensal = funcionario.custo_por_hora > 0 
            ? funcionario.custo_por_hora * (funcionario.horas_totais_mes || 173.2)
            : funcionario.salario_base;
          return acc + Number(custoMensal);
        }, 0);
        
        const totalGastos = totalDespesasFixas + totalFolhaPagamento;
        
        // Calcular porcentagem sobre a média mensal
        if (mediaMensal > 0 && totalGastos > 0) {
          gastosSobreFaturamento = (totalGastos / mediaMensal) * 100;
        }

        console.log(`💰 Cálculo detalhado para ${bloco.nome}:`, {
          despesasConsideradas: despesasConsideradas.map(d => `${d.nome}: R$ ${d.valor}`),
          totalDespesasFixas,
          folhaConsiderada: folhaConsiderada.map(f => `${f.nome}: R$ ${f.custo_por_hora > 0 ? f.custo_por_hora * (f.horas_totais_mes || 173.2) : f.salario_base}`),
          totalFolhaPagamento,
          totalGastos,
          mediaMensal,
          gastosSobreFaturamento
        });

        // Calcular encargos sobre venda - MESMA LÓGICA DO MODAL
        const encargosConsiderados = encargosVenda ? encargosVenda.filter(e => config[e.id] && e.ativo) : [];
        
        // Calcular valor em real (somar apenas os valores fixos dos encargos)
        const valorEmReal = encargosConsiderados.reduce((acc, encargo) => {
          return acc + Number(encargo.valor_fixo || 0);
        }, 0);
        
        // Calcular somas por categoria usando MESMA LÓGICA DO MODAL
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
          valorEmReal: valorEmReal
        });

        console.log(`🏷️ Encargos detalhados para ${bloco.nome}:`, {
          encargosConsiderados: encargosConsiderados.map(e => `${e.nome}: ${e.valor_percentual}% (${e.tipo})`),
          categorias
        });

        novosCalculatedMarkups.set(bloco.id, categorias);
        console.log(`✅ Markup final calculado para ${bloco.nome}:`, categorias);
      } else {
        console.log(`⚠️ Sem configuração válida para ${bloco.nome}, usando valores zerados`);
        // Se não tem configuração, usar valores zerados
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
  }, [user?.id, blocos, loadConfiguration, getCategoriaByNome]);

  // 🎯 NOVO: Funções para gerenciar submenu de períodos
  const toggleSubmenu = useCallback((blocoId: string) => {
    setSubmenusAbertos(prev => {
      const newSet = new Set(prev);
      if (newSet.has(blocoId)) {
        newSet.delete(blocoId);
      } else {
        newSet.add(blocoId);
      }
      return newSet;
    });
  }, []);

  const aplicarPeriodo = useCallback(async (blocoId: string, periodo: string) => {
    console.log(`🔄 Aplicando período ${periodo} para bloco ${blocoId}`);
    
    try {
      // Salvar período selecionado
      await saveConfiguration(`filtro-periodo-${blocoId}`, periodo);
      
      // Atualizar estado local
      setPeriodosAplicados(prev => new Map(prev).set(blocoId, periodo));
      
      // Fechar submenu
      setSubmenusAbertos(prev => {
        const newSet = new Set(prev);
        newSet.delete(blocoId);
        return newSet;
      });
      
      // Disparar recálculo para este bloco específico
      await carregarConfiguracoesSalvas();
      
      toast({
        title: "Período aplicado!",
        description: `Cálculos atualizados para ${
          periodo === '1' ? 'último mês' :
          periodo === '3' ? 'últimos 3 meses' :
          periodo === '6' ? 'últimos 6 meses' :
          periodo === '12' ? 'últimos 12 meses' :
          'todos os períodos'
        }`,
        duration: 3000
      });
      
    } catch (error) {
      console.error('❌ Erro ao aplicar período:', error);
      toast({
        title: "Erro ao aplicar período",
        description: "Tente novamente em alguns segundos.",
        variant: "destructive"
      });
    }
  }, [saveConfiguration, carregarConfiguracoesSalvas, toast]);

  // Carregar períodos aplicados ao inicializar
  useEffect(() => {
    const carregarPeriodos = async () => {
      if (!user?.id || blocos.length === 0) return;
      
      const periodosMap = new Map<string, string>();
      
      for (const bloco of blocos) {
        try {
          const periodo = await loadConfiguration(`filtro-periodo-${bloco.id}`);
          if (periodo) {
            periodosMap.set(bloco.id, periodo);
          }
        } catch (error) {
          console.warn(`⚠️ Erro ao carregar período para bloco ${bloco.id}:`, error);
        }
      }
      
      setPeriodosAplicados(periodosMap);
    };
    
    carregarPeriodos();
  }, [user?.id, blocos, loadConfiguration]);

  // 🎯 NOVO: Fechar submenu ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (submenusAbertos.size > 0) {
        const target = event.target as Element;
        if (!target.closest('.relative')) {
          setSubmenusAbertos(new Set());
        }
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [submenusAbertos.size]);

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
  
  // Carregar configurações salvas após os blocos serem carregados
  useEffect(() => {
    if (blocos.length > 0 && user?.id) {
      console.log('🎯 Carregando configurações salvas para todos os blocos...');
      carregarConfiguracoesSalvas();
    }
  }, [blocos.length, user?.id, carregarConfiguracoesSalvas]);

  // Real-time updates: escutar mudanças na tabela user_configurations
  useEffect(() => {
    if (!user?.id) return;

    console.log('🔄 Configurando real-time updates para configurações de markup');
    
    const channel = supabase
      .channel('markup-config-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_configurations',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('📡 Configuração alterada:', payload);
          
          // Verificar se é uma alteração relacionada a markup
          const newRecord = payload.new as any;
          const oldRecord = payload.old as any;
          const configType = newRecord?.type || oldRecord?.type;
          
          if (configType && 
              (configType.includes('markup_') || 
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
  }, [user?.id, carregarConfiguracoesSalvas, invalidateCache]);

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
    
    // Salvar nova lista
    saveConfiguration('markups_blocos', novosBlocos).then(() => {
      console.log('✅ Novo bloco criado com sucesso:', novoBloco);
      toast({
        title: "Bloco criado!",
        description: `O bloco "${novoBloco.nome}" foi criado. Use o submenu para configurar o período.`
      });
    }).catch(error => {
      console.error('❌ Erro ao criar novo bloco:', error);
      toast({
        title: "Erro ao criar bloco",
        description: "Não foi possível criar o novo bloco de markup",
        variant: "destructive"
      });
    });
  };

  // Nova função para efetivamente criar o bloco quando o modal for salvo
  const finalizarCriacaoBloco = async (markupCalculado: CalculatedMarkup) => {
    try {
      const novoBloco: MarkupBlock = {
        id: Date.now().toString(),
        nome: `Markup ${blocos.length + 1}`,
        gastoSobreFaturamento: markupCalculado.gastoSobreFaturamento,
        impostos: markupCalculado.impostos,
        taxasMeiosPagamento: markupCalculado.taxasMeiosPagamento,
        comissoesPlataformas: markupCalculado.comissoesPlataformas,
        outros: markupCalculado.outros,
        valorEmReal: markupCalculado.valorEmReal,
        lucroDesejado: 0 // Será definido pelo usuário depois
      };

      const novosBlocos = [...blocos, novoBloco];
      setBlocos(novosBlocos);
      salvarBlocos(novosBlocos);

      // Adicionar o markup calculado ao estado
      setCalculatedMarkups(prev => {
        const newMap = new Map(prev);
        newMap.set(novoBloco.id, markupCalculado);
        return newMap;
      });

      console.log('✅ Novo bloco criado com sucesso:', novoBloco);
      
      toast({
        title: "Bloco criado com sucesso",
        description: `O bloco "${novoBloco.nome}" foi criado e configurado.`
      });
      
    } catch (error) {
      console.error('❌ Erro ao criar novo bloco:', error);
      toast({
        title: "Erro ao criar bloco",
        description: "Não foi possível criar o novo bloco de markup",
        variant: "destructive"
      });
    }
  };

  const removerBloco = (id: string) => {
    const novosBlocos = blocos.filter(bloco => bloco.id !== id);
    setBlocos(novosBlocos);
    salvarBlocos(novosBlocos);
    
    // Remover também dos markups calculados
    const novosCalculatedMarkups = new Map(calculatedMarkups);
    novosCalculatedMarkups.delete(id);
    setCalculatedMarkups(novosCalculatedMarkups);
  };

  const atualizarBloco = (id: string, campo: keyof MarkupBlock, valor: number) => {
    const novosUsuario = blocos.map(bloco => 
      bloco.id === id ? { ...bloco, [campo]: valor } : bloco
    );
    setBlocos(novosUsuario);
    salvarBlocos(novosUsuario);
  };

  const calcularMarkupIdeal = (bloco: MarkupBlock, markupData?: CalculatedMarkup): number => {
    const markupValues = markupData || calculatedMarkups.get(bloco.id);
    
    if (!markupValues) return 1;
    
    const somaPercentuais = markupValues.gastoSobreFaturamento + 
                            markupValues.impostos + 
                            markupValues.taxasMeiosPagamento + 
                            markupValues.comissoesPlataformas + 
                            markupValues.outros + bloco.lucroDesejado;
    
    // Converte percentuais para decimais e aplica a fórmula: Markup = 1 / (1 - somaPercentuais)
    const somaDecimais = somaPercentuais / 100;
    
    // Evita divisão por zero e valores inválidos
    if (somaDecimais >= 1) {
      console.warn('⚠️ Soma dos percentuais é >= 100%, retornando markup padrão');
      return 1;
    }
    
    const markupFinal = 1 / (1 - somaDecimais);
    
    // Verifica se o resultado é um número válido
    if (!isFinite(markupFinal) || isNaN(markupFinal)) {
      console.warn('⚠️ Markup calculado é inválido:', markupFinal, 'retornando 1');
      return 1;
    }
    
    return markupFinal;
  };

  const iniciarEdicaoNome = (bloco: MarkupBlock) => {
    setBlocoEditandoNome(bloco);
    setNomeTemp(bloco.nome);
    setModalEdicaoNome(true);
  };

  const salvarNome = () => {
    if (blocoEditandoNome && nomeTemp.trim()) {
      const novosUsuario = blocos.map(bloco => 
        bloco.id === blocoEditandoNome.id ? { ...bloco, nome: nomeTemp.trim() } : bloco
      );
      setBlocos(novosUsuario);
      salvarBlocos(novosUsuario);
      setModalEdicaoNome(false);
      setBlocoEditandoNome(null);
    }
  };

  const cancelarEdicao = () => {
    setModalEdicaoNome(false);
    setBlocoEditandoNome(null);
    setNomeTemp('');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Markups</h1>
          <p className="text-muted-foreground">Calcule preços com base em custos e margem desejada</p>
        </div>
        <Button onClick={criarNovoBloco} className="gap-2">
          <Plus className="h-4 w-4" />
          Novo Bloco de Markup
        </Button>
      </div>

      <div className="grid gap-6">
        {blocos.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Calculator className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Nenhum bloco criado</h3>
              <p className="text-muted-foreground mb-4 text-center">
                Crie seu primeiro bloco de markup para calcular preços
              </p>
              <Button onClick={criarNovoBloco} className="gap-2">
                <Plus className="h-4 w-4" />
                Criar Primeiro Bloco
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Bloco fixo subreceita */}
        <Card className="border-border shadow-lg">
          <CardHeader className="bg-muted/50">
            <div className="flex items-center justify-between">
              <CardTitle className="text-blue-600 capitalize font-bold text-xl flex items-center gap-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-4 w-4 text-blue-500 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Este é um bloco informativo que mostra os percentuais máximos recomendados para cada categoria baseado nas melhores práticas do mercado</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                {blocoSubreceita.nome}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <Label className="text-sm font-medium text-muted-foreground">Gasto sobre faturamento</Label>
                <div className="text-2xl font-bold text-blue-600">15%</div>
              </div>
              <div className="space-y-1">
                <Label className="text-sm font-medium text-muted-foreground">Impostos</Label>
                <div className="text-2xl font-bold text-blue-600">25%</div>
              </div>
              <div className="space-y-1">
                <Label className="text-sm font-medium text-muted-foreground">Taxas de meios de pagamento</Label>
                <div className="text-2xl font-bold text-blue-600">5%</div>
              </div>
              <div className="space-y-1">
                <Label className="text-sm font-medium text-muted-foreground">Comissões e plataformas</Label>
                <div className="text-2xl font-bold text-blue-600">10%</div>
              </div>
              <div className="space-y-1">
                <Label className="text-sm font-medium text-muted-foreground">Outros</Label>
                <div className="text-2xl font-bold text-blue-600">5%</div>
              </div>
              <div className="space-y-1">
                <Label className="text-sm font-medium text-muted-foreground">Valor em real</Label>
                <div className="text-2xl font-bold text-orange-600">{formatCurrency(200)}</div>
              </div>
              <div className="space-y-1">
                <Label className="text-sm font-medium text-muted-foreground">Lucro desejado sobre venda</Label>
                <div className="text-2xl font-bold text-green-600">20%</div>
              </div>
            </div>
            
            <div className="mt-6 pt-4 border-t bg-blue-50/50 -mx-6 px-6 pb-6">
              <div className="flex items-center justify-between">
                <Label className="text-lg font-semibold text-blue-700">Markup ideal</Label>
                <div className="text-3xl font-bold text-blue-700">2,50</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Blocos do usuário */}
        {blocos.map((bloco) => {
          const calculated = calculatedMarkups.get(bloco.id);
          const hasCalculated = calculated !== undefined;
          
          console.log('🎯 Renderizando bloco', bloco.nome + ':', {
            blocoId: bloco.id,
            calculated,
            hasCalculated,
            calculatedMapSize: calculatedMarkups.size,
            allKeys: Array.from(calculatedMarkups.keys())
          });
          
          const markupIdeal = hasCalculated ? calcularMarkupIdeal(bloco, calculated) : 1;
          
          return (
            <Card key={bloco.id} className="border-border">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-blue-600 capitalize font-bold text-xl">
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
                    
                    {/* 🎯 NOVO: Submenu de períodos em vez do modal */}
                    <div className="relative">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => toggleSubmenu(bloco.id)}
                        className="h-8 px-3 flex items-center gap-1"
                      >
                        <Settings className="h-3 w-3" />
                        {submenusAbertos.has(bloco.id) ? 
                          <ChevronUp className="h-3 w-3" /> : 
                          <ChevronDown className="h-3 w-3" />
                        }
                      </Button>
                      
                      {submenusAbertos.has(bloco.id) && (
                        <div className="absolute right-0 top-full mt-1 z-50 bg-white border border-border rounded-md shadow-lg min-w-48">
                          <div className="p-2">
                            <div className="text-xs font-medium text-muted-foreground mb-2">
                              Período de Análise:
                            </div>
                            <div className="space-y-1">
                              {[
                                { value: '1', label: 'Último mês' },
                                { value: '3', label: 'Últimos 3 meses' },
                                { value: '6', label: 'Últimos 6 meses' },
                                { value: '12', label: 'Últimos 12 meses' },
                                { value: 'todos', label: 'Todos os períodos' }
                              ].map((periodo) => (
                                <button
                                  key={periodo.value}
                                  onClick={() => aplicarPeriodo(bloco.id, periodo.value)}
                                  className={`w-full text-left px-3 py-2 text-sm rounded hover:bg-accent hover:text-accent-foreground transition-colors ${
                                    periodosAplicados.get(bloco.id) === periodo.value 
                                      ? 'bg-blue-50 text-blue-600 font-medium' 
                                      : ''
                                  }`}
                                >
                                  {periodo.label}
                                  {periodosAplicados.get(bloco.id) === periodo.value && (
                                    <span className="ml-2 text-xs">✓</span>
                                  )}
                                </button>
                              ))}
                            </div>
                            {periodosAplicados.has(bloco.id) && (
                              <div className="mt-2 pt-2 border-t text-xs text-green-600">
                                ✓ Aplicado: {
                                  periodosAplicados.get(bloco.id) === '1' ? 'Último mês' :
                                  periodosAplicados.get(bloco.id) === '3' ? 'Últimos 3 meses' :
                                  periodosAplicados.get(bloco.id) === '6' ? 'Últimos 6 meses' :
                                  periodosAplicados.get(bloco.id) === '12' ? 'Últimos 12 meses' :
                                  'Todos os períodos'
                                }
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    
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
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <Label className="text-sm font-medium text-muted-foreground">Gasto sobre faturamento</Label>
                    <div className="text-2xl font-bold text-blue-600">
                      {hasCalculated ? formatPercentage(calculated.gastoSobreFaturamento) : '0'} <span className="text-sm">%</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm font-medium text-muted-foreground">Impostos</Label>
                    <div className="text-2xl font-bold text-blue-600">
                      {hasCalculated ? formatPercentage(calculated.impostos) : '0'} <span className="text-sm">%</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm font-medium text-muted-foreground">Taxas de meios de pagamento</Label>
                    <div className="text-2xl font-bold text-blue-600">
                      {hasCalculated ? formatPercentage(calculated.taxasMeiosPagamento) : '0'} <span className="text-sm">%</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm font-medium text-muted-foreground">Comissões e plataformas</Label>
                    <div className="text-2xl font-bold text-blue-600">
                      {hasCalculated ? formatPercentage(calculated.comissoesPlataformas) : '0'} <span className="text-sm">%</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm font-medium text-muted-foreground">Outros</Label>
                    <div className="text-2xl font-bold text-blue-600">
                      {hasCalculated ? formatPercentage(calculated.outros) : '0'} <span className="text-sm">%</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm font-medium text-muted-foreground">Valor em real</Label>
                    <div className="text-2xl font-bold text-orange-600">
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
                        className="text-green-600 font-bold"
                      />
                      <span className="text-green-600 font-bold">%</span>
                    </div>
                  </div>
                </div>
                
                 <div className="mt-6 pt-4 border-t bg-blue-50/50 -mx-6 px-6 pb-6">
                   <div className="flex items-center justify-between">
                     <Label className="text-lg font-semibold text-blue-700">Markup ideal</Label>
                     <div className="text-3xl font-bold text-blue-700">
                       {isFinite(markupIdeal) && !isNaN(markupIdeal) ? markupIdeal.toFixed(4) : '1.0000'}
                     </div>
                   </div>
                 </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={modalEdicaoNome} onOpenChange={setModalEdicaoNome}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Nome do Bloco</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={nomeTemp}
              onChange={(e) => setNomeTemp(e.target.value)}
              placeholder="Digite o nome do bloco"
              onKeyDown={(e) => {
                if (e.key === 'Enter') salvarNome();
                if (e.key === 'Escape') cancelarEdicao();
              }}
              autoFocus
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={cancelarEdicao}>
              Cancelar
            </Button>
            <Button onClick={salvarNome}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}