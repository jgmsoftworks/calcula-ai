import { useState, useCallback, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
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

interface FaturamentoHistorico {
  id: string;
  valor: number;
  mes: Date;
}

export function Markups() {
  const [blocos, setBlocos] = useState<MarkupBlock[]>([]);
  const [blocoSelecionado, setBlocoSelecionado] = useState<MarkupBlock | undefined>(undefined);
  const [modalAberto, setModalAberto] = useState(false);
  const [modalEdicaoNome, setModalEdicaoNome] = useState(false);
  const [blocoEditandoNome, setBlocoEditandoNome] = useState<MarkupBlock | null>(null);
  const [nomeTemp, setNomeTemp] = useState('');
  const [calculatedMarkups, setCalculatedMarkups] = useState<Map<string, CalculatedMarkup>>(new Map());
  const { loadConfiguration, saveConfiguration } = useOptimizedUserConfigurations();
  const { toast } = useToast();
  const { user } = useAuth();
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const calculationRef = useRef<NodeJS.Timeout | null>(null);

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

  // Função para categorizar encargos - DEFINIDA PRIMEIRO
  const getCategoriaByNome = useCallback((nome: string): string => {
    const nomeUpper = nome.toUpperCase();
    
    const impostos = ['ICMS', 'IPI', 'PIS', 'COFINS', 'IR', 'CSLL', 'ISS', 'ISSQN', 'IRPJ', 'SIMPLES'];
    const taxasPagamento = ['TAXA', 'CARTÃO', 'DÉBITO', 'CRÉDITO', 'PIX', 'BOLETO', 'TRANSFERÊNCIA'];
    const comissoes = ['COMISSÃO', 'VENDEDOR', 'REPRESENTANTE', 'AFILIADO', 'MARKETPLACE', 'PLATAFORMA'];
    
    if (impostos.some(termo => nomeUpper.includes(termo))) return 'Impostos';
    if (taxasPagamento.some(termo => nomeUpper.includes(termo))) return 'Taxas de Meios de Pagamento';
    if (comissoes.some(termo => nomeUpper.includes(termo))) return 'Comissões';
    
    return 'Outros';
  }, []);

  // Função para carregar configurações salvas no início
  const carregarConfiguracoesSalvas = useCallback(async () => {
    if (!user?.id || blocos.length === 0) return;
    
    console.log('🔄 Carregando configurações salvas para', blocos.length, 'blocos');
    
    const novosCalculatedMarkups = new Map<string, CalculatedMarkup>();
    
    for (const bloco of blocos) {
      const configKey = `checkbox-states-${bloco.id}`;
      const config = await loadConfiguration(configKey);
      
      console.log(`📋 Configuração do bloco ${bloco.nome}:`, config);
      
      if (config && typeof config === 'object') {
        // Se tem configuração, calcular markup com ela
        console.log(`✅ Aplicando configuração salva para ${bloco.nome}`);
        
        // Simular cálculo usando a mesma lógica do calcularMarkupsEmTempoReal
        const [{ data: despesasFixas }, { data: folhaPagamento }, { data: encargosVenda }] = await Promise.all([
          supabase.from('despesas_fixas').select('*').eq('user_id', user.id),
          supabase.from('folha_pagamento').select('*').eq('user_id', user.id),
          supabase.from('encargos_venda').select('*').eq('user_id', user.id)
        ]);
        
        // Calcular com a configuração específica
        let totalGastos = 0;
        
        if (despesasFixas) {
          const gastosDespesas = despesasFixas
            .filter(d => config[d.id] === true)
            .reduce((acc, d) => acc + d.valor, 0);
          totalGastos += gastosDespesas;
        }
        
        if (folhaPagamento) {
          const gastosRH = folhaPagamento
            .filter(f => config[f.id] === true)
            .reduce((acc, f) => acc + (f.salario_base || 0), 0);
          totalGastos += gastosRH;
        }
        
        // Buscar média de faturamento
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
        
        const gastoSobreFaturamento = mediaMensal > 0 ? (totalGastos / mediaMensal) * 100 : 0;
        
        // Calcular encargos por categoria
        let impostos = 0;
        let taxasMeiosPagamento = 0; 
        let comissoesPlataformas = 0;
        let outros = 0;
        
        if (encargosVenda) {
          encargosVenda.forEach(encargo => {
            if (config[encargo.id] === true) {
              const categoria = getCategoriaByNome(encargo.nome);
              const valor = encargo.valor_percentual || 0;
              
              switch (categoria) {
                case 'Impostos':
                  impostos += valor;
                  break;
                case 'Taxas de Meios de Pagamento':
                  taxasMeiosPagamento += valor;
                  break;
                case 'Comissões':
                  comissoesPlataformas += valor;
                  break;
                default:
                  outros += valor;
                  break;
              }
            }
          });
        }
        
        const markupCalculado = {
          gastoSobreFaturamento,
          impostos,
          taxasMeiosPagamento,
          comissoesPlataformas,
          outros,
          valorEmReal: 100 // Valor fixo
        };
        
        novosCalculatedMarkups.set(bloco.id, markupCalculado);
        console.log(`✅ Markup calculado para ${bloco.nome}:`, markupCalculado);
      }
    }
    
    if (novosCalculatedMarkups.size > 0) {
      setCalculatedMarkups(novosCalculatedMarkups);
      console.log('✅ Configurações salvas aplicadas com sucesso!');
    }
  }, [user?.id, blocos, loadConfiguration, getCategoriaByNome]);

  // Função para calcular markups em tempo real
  const calcularMarkupsEmTempoReal = useCallback(async () => {
    if (!user?.id) {
      console.log('❌ calcularMarkupsEmTempoReal: user.id não disponível');
      return;
    }

    console.log('🔄 Iniciando cálculo de markups para blocos:', blocos.length);

    try {
      // Buscar configurações salvas
      const filtroConfig = await loadConfiguration('media_faturamento_filtro');
      const faturamentosConfig = await loadConfiguration('faturamentos_historicos');
      
      console.log('📊 Configurações carregadas:', {
        filtroConfig,
        faturamentosConfig: faturamentosConfig ? 'presente' : 'ausente'
      });

      const periodo = filtroConfig || 'ultimo_mes';
      
      // Calcular média mensal baseada no período
      let mediaMensal = 0;
      if (faturamentosConfig && Array.isArray(faturamentosConfig)) {
        const faturamentos = faturamentosConfig.map((f: any) => ({
          ...f,
          mes: new Date(f.mes)
        }));

        const hoje = new Date();
        let dataLimite = new Date();
        
        switch (periodo) {
          case 'ultimo_mes':
            dataLimite.setMonth(hoje.getMonth() - 1);
            break;
          case 'ultimos_3_meses':
            dataLimite.setMonth(hoje.getMonth() - 3);
            break;
          case 'ultimos_6_meses':
            dataLimite.setMonth(hoje.getMonth() - 6);
            break;
          case 'ultimo_ano':
            dataLimite.setFullYear(hoje.getFullYear() - 1);
            break;
        }

        const faturamentoFiltrado = faturamentos.filter((f: FaturamentoHistorico) => f.mes >= dataLimite);
        const total = faturamentoFiltrado.reduce((acc: number, f: FaturamentoHistorico) => acc + f.valor, 0);
        const meses = Math.max(1, Math.ceil((hoje.getTime() - dataLimite.getTime()) / (1000 * 60 * 60 * 24 * 30)));
        mediaMensal = total / meses;
      }

      console.log('💰 Média mensal calculada:', mediaMensal);

      // Buscar dados de custos
      const [{ data: despesasFixas }, { data: folhaPagamento }, { data: encargosVenda }] = await Promise.all([
        supabase.from('despesas_fixas').select('*').eq('user_id', user.id),
        supabase.from('folha_pagamento').select('*').eq('user_id', user.id),
        supabase.from('encargos_venda').select('*').eq('user_id', user.id)
      ]);

      console.log('🗃️ Dados de custos:', {
        despesasFixas: despesasFixas?.length || 0,
        folhaPagamento: folhaPagamento?.length || 0,
        encargosVenda: encargosVenda?.length || 0
      });

      // Calcular markups para cada bloco
      const novosCalculatedMarkups = new Map<string, CalculatedMarkup>();

      for (const bloco of blocos) {
        console.log(`🔍 Processando bloco: ${bloco.nome} (${bloco.id})`);
        
        // Buscar configuração específica do bloco (corrigido!)
        const configKey = `checkbox-states-${bloco.id}`;
        const blocoCfg = await loadConfiguration(configKey);
        
        if (!blocoCfg) {
          console.log(`⚠️ Configuração não encontrada para bloco ${bloco.id} (chave: ${configKey})`);
          // Se não há configuração, usar valores zerados mas salvar o bloco mesmo assim
          novosCalculatedMarkups.set(bloco.id, {
            gastoSobreFaturamento: 0,
            impostos: 0,
            taxasMeiosPagamento: 0,
            comissoesPlataformas: 0,
            outros: 0,
            valorEmReal: 0
          });
          continue;
        }

        console.log('⚙️ Configuração do bloco:', bloco.nome, ':', blocoCfg);

        // Calcular gasto sobre faturamento
        let totalGastos = 0;
        
        // Despesas fixas
        if (despesasFixas) {
          const gastosDespesas = despesasFixas
            .filter(d => blocoCfg[d.id] === true)
            .reduce((acc, d) => acc + d.valor, 0);
          totalGastos += gastosDespesas;
          console.log(`💸 Despesas fixas para ${bloco.nome}:`, gastosDespesas);
        }
        
        // Folha de pagamento
        if (folhaPagamento) {
          const gastosFolha = folhaPagamento
            .filter(f => blocoCfg[f.id] === true)
            .reduce((acc, f) => acc + (f.custo_por_hora || f.salario_base || 0), 0);
          totalGastos += gastosFolha;
          console.log(`👥 Folha pagamento para ${bloco.nome}:`, gastosFolha);
        }

        const gastoSobreFaturamento = mediaMensal > 0 ? (totalGastos / mediaMensal) * 100 : 0;
        console.log(`📈 Gasto sobre faturamento para ${bloco.nome}:`, gastoSobreFaturamento);

        // Calcular outros percentuais
        let impostos = 0;
        let taxasMeiosPagamento = 0;
        let comissoesPlataformas = 0;
        let outros = 0;
        let valorEmReal = 0;

        if (encargosVenda) {
          encargosVenda
            .filter(e => blocoCfg[e.id] === true)
            .forEach(encargo => {
              const categoria = getCategoriaByNome(encargo.nome);
              const valor = encargo.valor || 0;
              
              if (encargo.tipo === 'fixo') {
                valorEmReal += valor;
              } else {
                switch (categoria) {
                  case 'Impostos':
                    impostos += valor;
                    break;
                  case 'Taxas de Meios de Pagamento':
                    taxasMeiosPagamento += valor;
                    break;
                  case 'Comissões':
                    comissoesPlataformas += valor;
                    break;
                  default:
                    outros += valor;
                    break;
                }
              }
            });
        }

        const markupCalculado = {
          gastoSobreFaturamento,
          impostos,
          taxasMeiosPagamento,
          comissoesPlataformas,
          outros,
          valorEmReal
        };

        console.log(`✅ Markup calculado para ${bloco.nome}:`, markupCalculado);
        novosCalculatedMarkups.set(bloco.id, markupCalculado);
      }

      console.log('🎯 Total de markups calculados:', novosCalculatedMarkups.size);
      console.log('🔄 Atualizando state calculatedMarkups:', Array.from(novosCalculatedMarkups.entries()));
      setCalculatedMarkups(novosCalculatedMarkups);
    } catch (error) {
      console.error('❌ Erro ao calcular markups em tempo real:', error);
    }
  }, [user?.id, blocos, loadConfiguration, getCategoriaByNome]);

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
      console.log('🎯 Blocos carregados, carregando configurações salvas...');
      carregarConfiguracoesSalvas();
    }
  }, [blocos.length, user?.id, carregarConfiguracoesSalvas]);

  // Recalcular markups quando blocos mudarem
  useEffect(() => {
    if (blocos.length > 0) {
      if (calculationRef.current) {
        clearTimeout(calculationRef.current);
      }
      
      // Delay menor para recálculos automáticos
      calculationRef.current = setTimeout(() => {
        console.log('🔄 Recalculando markups devido a mudança nos blocos');
        calcularMarkupsEmTempoReal();
      }, 200); // Reduzindo delay de 500 para 200ms
    }
  }, [blocos, calcularMarkupsEmTempoReal]);

  // Calcular markups na inicialização do componente
  useEffect(() => {
    console.log('🚀 useEffect inicial - user.id:', user?.id, 'blocos.length:', blocos.length);
    
    if (user?.id && blocos.length > 0) {
      console.log('✅ Condições atendidas, executando cálculo inicial...');
      // Delay menor para evitar conflitos com salvamento
      const initialCalcTimer = setTimeout(() => {
        console.log('⏰ Executando cálculo inicial após delay...');
        calcularMarkupsEmTempoReal();
      }, 1000); // Reduzido de 2000 para 1000ms
      
      return () => {
        console.log('🧹 Limpando timer inicial');
        clearTimeout(initialCalcTimer);
      };
    }
  }, [user?.id, blocos.length, calcularMarkupsEmTempoReal]);

  // Limpar timeouts ao desmontar
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (calculationRef.current) clearTimeout(calculationRef.current);
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

  const criarNovoBloco = async () => {
    const novoBloco: MarkupBlock = {
      id: Date.now().toString(),
      nome: `Markup ${blocos.length + 1}`,
      gastoSobreFaturamento: 0,
      impostos: 0,
      taxasMeiosPagamento: 0,
      comissoesPlataformas: 0,
      outros: 0,
      valorEmReal: 0,
      lucroDesejado: 0
    };

    // Criar configuração padrão com todos os itens marcados como true
    if (user?.id) {
      try {
        const [{ data: despesasFixas }, { data: folhaPagamento }, { data: encargosVenda }] = await Promise.all([
          supabase.from('despesas_fixas').select('*').eq('user_id', user.id),
          supabase.from('folha_pagamento').select('*').eq('user_id', user.id),
          supabase.from('encargos_venda').select('*').eq('user_id', user.id)
        ]);

        const configPadrao: Record<string, boolean> = {};
        
        despesasFixas?.forEach(item => {
          configPadrao[item.id] = true;
        });
        
        folhaPagamento?.forEach(item => {
          configPadrao[item.id] = true;
        });
        
        encargosVenda?.forEach(item => {
          configPadrao[item.id] = true;
        });

        // Salvar a configuração padrão
        await saveConfiguration(`checkbox-states-${novoBloco.id}`, configPadrao);
        console.log(`✅ Configuração padrão criada para bloco ${novoBloco.id}:`, configPadrao);
      } catch (error) {
        console.error('Erro ao criar configuração padrão:', error);
      }
    }

    const novosBlocos = [...blocos, novoBloco];
    setBlocos(novosBlocos);
    salvarBlocos(novosBlocos);
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
    const markupFinal = 1 / (1 - somaDecimais);
    return markupFinal;
  };

  // Callback para receber atualizações do modal
  const handleMarkupUpdate = useCallback(async (blocoId: string, markupData: any) => {
    console.log('🔄 handleMarkupUpdate chamado para bloco:', blocoId, 'com dados:', markupData);
    
    // Atualizar no state local
    const novosCalculatedMarkups = new Map(calculatedMarkups);
    novosCalculatedMarkups.set(blocoId, markupData);
    setCalculatedMarkups(novosCalculatedMarkups);
    
    console.log('💾 Estados atualizados, aguardando recálculo automático...');
  }, [calculatedMarkups]);

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

  const abrirModal = (bloco: MarkupBlock) => {
    setBlocoSelecionado(bloco);
    setModalAberto(true);
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
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => abrirModal(bloco)}
                      className="h-8 w-8 p-0"
                    >
                      <Settings className="h-3 w-3" />
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
                      {markupIdeal.toFixed(4)}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {modalAberto && (
        <CustosModal
          open={modalAberto}
          onOpenChange={(open) => {
            setModalAberto(open);
            if (!open) setBlocoSelecionado(undefined);
          }}
          markupBlock={blocoSelecionado}
          onMarkupUpdate={(markup) => {
            console.log('🔄 Modal retornou markup:', markup, 'para bloco:', blocoSelecionado?.id);
            if (blocoSelecionado) {
              handleMarkupUpdate(blocoSelecionado.id, markup);
            }
          }}
        />
      )}

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