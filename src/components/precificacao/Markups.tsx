import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { NumericInputPtBr } from '@/components/ui/numeric-input-ptbr';
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
import { calcularCustoTotalFuncionario } from '@/lib/folhaPagamentoUtils';
import { useAuth } from '@/hooks/useAuth';
import { usePlanLimits } from '@/hooks/usePlanLimits';
import { UpgradePlansModal } from '@/components/planos/UpgradePlansModal';
import { PlanRestrictedArea } from '@/components/planos/PlanRestrictedArea';
import { formatBRL, formatNumber } from '@/lib/formatters';

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
  periodo: string;
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
  const [searchParams, setSearchParams] = useSearchParams();
  const [blocos, setBlocos] = useState<MarkupBlock[]>([]);
  const [modalEdicaoNome, setModalEdicaoNome] = useState(false);
  const [blocoEditandoNome, setBlocoEditandoNome] = useState<MarkupBlock | null>(null);
  const [nomeTemp, setNomeTemp] = useState('');
  const [calculatedMarkups, setCalculatedMarkups] = useState<Map<string, CalculatedMarkup>>(new Map());
  const [faturamentosHistoricos, setFaturamentosHistoricos] = useState<Array<{ data: string; valor: number }>>([]);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  
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
  const { checkLimit, showUpgradeMessage, planInfo } = usePlanLimits();
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const isMarkupSaving = useRef<boolean>(false);

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
    lucroDesejado: 0,
    periodo: 'todos'
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

  // Função helper para calcular valor baseado no período de um bloco específico
  const calcularValorPeriodoBloco = useCallback((periodo: string) => {
    if (faturamentosHistoricos.length === 0) return 0;

    // Se for "todos", calcula a média de todos os lançamentos
    if (periodo === 'todos') {
      const totalFaturamentos = faturamentosHistoricos.reduce((acc, f) => acc + f.valor, 0);
      return totalFaturamentos / faturamentosHistoricos.length;
    }

    // Para outros períodos, calcula a média
    const mesesAtras = parseInt(String(periodo), 10);
    const dataLimite = new Date();
    dataLimite.setMonth(dataLimite.getMonth() - mesesAtras);
    
    const faturamentosSelecionados = faturamentosHistoricos.filter(f => new Date(f.data) >= dataLimite);

    if (faturamentosSelecionados.length === 0) return 0;

    const totalFaturamento = faturamentosSelecionados.reduce((acc, f) => acc + f.valor, 0);
    const media = totalFaturamento / faturamentosSelecionados.length;
    return media;
  }, [faturamentosHistoricos]);

  // Função helper para obter label do período
  const getPeriodoLabel = useCallback((periodo: string) => {
    switch (periodo) {
      case '1': return 'último mês';
      case '3': return 'últimos 3 meses';
      case '6': return 'últimos 6 meses';
      case '12': return 'últimos 12 meses';
      case 'todos': return 'média de todos os períodos';
      default: return 'últimos 12 meses';
    }
  }, []);

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

        // Lógica de cálculo do valor de faturamento baseado no período individual do bloco
        let valorFaturamento = 0;
        
        // Use o período individual do bloco (subreceita sempre usa "todos")
        const periodoSelecionado = bloco.id === 'subreceita-fixo' ? 'todos' : (bloco.periodo || '12');
        
        if (periodoSelecionado === 'todos') {
            // Para "todos": calcular a média de todos os lançamentos
            if (todosFaturamentos.length > 0) {
                const totalFaturamentos = todosFaturamentos.reduce((acc: number, f: any) => acc + f.valor, 0);
                valorFaturamento = totalFaturamentos / todosFaturamentos.length;
            }
        } else {
            // Para outros períodos: calcular a média
            const mesesAtras = parseInt(String(periodoSelecionado), 10);
            const dataLimite = new Date();
            dataLimite.setMonth(dataLimite.getMonth() - mesesAtras);

            const faturamentosFiltrados = todosFaturamentos.filter((f: any) => f.mes >= dataLimite);
            
            if (faturamentosFiltrados.length > 0) {
                const total = faturamentosFiltrados.reduce((acc: number, f: any) => acc + f.valor, 0);
                valorFaturamento = total / faturamentosFiltrados.length;
            }
        }
        
        console.log(`📅 Para o bloco "${bloco.nome}" com período "${periodoSelecionado}", o valor de faturamento é: ${valorFaturamento}`);

        if (config && typeof config === 'object' && Object.keys(config).length > 0) {
            
            let gastosSobreFaturamento = 0;
            
            // Somar despesas fixas marcadas como "Considerar" E ATIVAS
            const despesasConsideradas = despesasFixas ? despesasFixas.filter(d => config[d.id] && d.ativo) : [];
            const totalDespesasFixas = despesasConsideradas.reduce((acc, despesa) => acc + Number(despesa.valor), 0);
            
            // Somar folha de pagamento marcada como "Considerar" E ATIVA
            const folhaConsiderada = folhaPagamento ? folhaPagamento.filter(f => config[f.id] && f.ativo) : [];
            const totalFolhaPagamento = folhaConsiderada.reduce((acc, funcionario) => {
                // Custo total mensal real (salário + encargos), via helper compartilhado
                return acc + calcularCustoTotalFuncionario(funcionario);
            }, 0);
            
            const totalGastos = totalDespesasFixas + totalFolhaPagamento;
            
            // Calcular porcentagem sobre o valor de faturamento ESPECÍFICO deste bloco
            if (valorFaturamento > 0 && totalGastos > 0) {
                gastosSobreFaturamento = (totalGastos / valorFaturamento) * 100;
            }

            console.log(`💰 Cálculo detalhado para ${bloco.nome}:`, {
                totalGastos,
                valorFaturamento,
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
    
    // Garantir que sub-receita sempre tenha valores calculados
    if (!novosCalculatedMarkups.has('subreceita-fixo')) {
        console.log('✅ Adicionando valores padrão para sub-receita');
        novosCalculatedMarkups.set('subreceita-fixo', {
            gastoSobreFaturamento: 0,
            impostos: 0,
            taxasMeiosPagamento: 0,
            comissoesPlataformas: 0,
            outros: 0,
            valorEmReal: 0
        });
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
        let blocosCarregados: MarkupBlock[] = [];
        
        if (config && Array.isArray(config)) {
          blocosCarregados = config as unknown as MarkupBlock[];
        }
        
        // ✅ GARANTIR que o bloco de sub-receita esteja sempre presente
        const temSubreceita = blocosCarregados.some(b => b.id === 'subreceita-fixo');
        
        if (!temSubreceita) {
          // Adicionar bloco de sub-receita ao início da lista
          blocosCarregados = [blocoSubreceita, ...blocosCarregados];
        }
        
        setBlocos(blocosCarregados);
        console.log('📦 Blocos carregados:', blocosCarregados.length);
      } catch (error) {
        console.error('Erro ao carregar blocos:', error);
        // Em caso de erro, garantir que pelo menos o bloco de sub-receita existe
        setBlocos([blocoSubreceita]);
      }
    };
    carregarBlocos();
  }, [loadConfiguration]);
  
  // Carregar/recalcular configurações quando blocos ou usuário mudarem
  useEffect(() => {
    if (blocos.length > 0 && user?.id) {
      console.log('🎯 Executando cálculo dos markups (trigger: blocos/user)...');
      carregarConfiguracoesSalvas();
    }
  }, [blocos.length, user?.id, carregarConfiguracoesSalvas]);

  // Salvar no banco quando calculatedMarkups for atualizado (com debounce para evitar loops)
  useEffect(() => {
    if (calculatedMarkups.size > 0 && blocos.length > 0 && user?.id && !isMarkupSaving.current) {
      console.log('💾 Salvando markups calculados no banco...');
      
      // Debounce para evitar salvamentos excessivos
      if (debounceRef.current) clearTimeout(debounceRef.current);
      
      debounceRef.current = setTimeout(() => {
        salvarMarkupsNoBanco(blocos);
      }, 300); // ✅ REDUZIDO: de 1000ms para 300ms
    }
  }, [calculatedMarkups, blocos, user?.id]);


  // Real-time updates: escutar mudanças na tabela user_configurations (com proteção contra loops)
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
          const configType = (payload.new as any)?.type || (payload.old as any)?.type;
          if (configType && (
                configType.includes('checkbox-states-') ||
                configType === 'faturamentos_historicos' ||
                configType.includes('despesas_fixas') ||
                configType.includes('folha_pagamento') ||
                configType.includes('encargos_venda'))) {
             
            console.log('🔃 Recarregando configurações devido à mudança em tempo real');
            
            // Invalidar cache para forçar recarregamento
            invalidateCache();
            
            // ✅ NOVO: Aguardar salvamento atual terminar antes de recarregar
            if (isMarkupSaving.current) {
              console.log('⏸️ Aguardando salvamento terminar...');
              const checkInterval = setInterval(() => {
                if (!isMarkupSaving.current) {
                  clearInterval(checkInterval);
                  carregarConfiguracoesSalvas();
                }
              }, 100);
            } else {
              carregarConfiguracoesSalvas();
            }
          }
        }
      )
      .subscribe();

    return () => {
      console.log('🔌 Desconectando real-time updates');
      supabase.removeChannel(channel);
    };
  }, [user?.id, invalidateCache, carregarConfiguracoesSalvas]);

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
        // Salvar também no banco de dados
        await salvarMarkupsNoBanco(novosBlocos);
      } catch (error) {
        console.error('Erro ao salvar blocos:', error);
      }
    }, 800);
  }, [saveConfiguration]);

  const salvarMarkupsNoBanco = async (blocos: MarkupBlock[]) => {
    if (!user?.id || isMarkupSaving.current) return;

    try {
      isMarkupSaving.current = true;
      console.log('💾 [SALVAR MARKUPS] Iniciando salvamento no banco...', blocos.length);
      
      // ✅ NOVO: Buscar markups existentes no banco
      const { data: markupsExistentes } = await supabase
        .from('markups')
        .select('id, nome')
        .eq('user_id', user.id);

      const nomesNovos = new Set(blocos.map(b => b.nome));
      const markupsParaDeletar = markupsExistentes?.filter(
        m => !nomesNovos.has(m.nome)
      ) || [];

      // ✅ DELETAR apenas markups que foram removidos da lista
      if (markupsParaDeletar.length > 0) {
        const idsParaDeletar = markupsParaDeletar.map(m => m.id);
        await supabase
          .from('markups')
          .delete()
          .in('id', idsParaDeletar);
        
        console.log('🗑️ Markups removidos:', markupsParaDeletar.map(m => m.nome));
      }

      // ✅ UPSERT individual para cada markup (evita sumiço temporário)
      const uniqueBlocos = blocos.filter((bloco, index, self) => 
        index === self.findIndex(b => b.nome === bloco.nome)
      );

      for (const bloco of uniqueBlocos) {
        const calculated = calculatedMarkups.get(bloco.id);
        
        // ✅ NOVA LÓGICA: Para sub-receita, sempre usar markup 1.0 mesmo sem calculated
        if (!calculated && bloco.id !== 'subreceita-fixo') {
          console.log(`⚠️ [SALVAR MARKUPS] Valores calculados não encontrados para ${bloco.nome}`);
          continue;
        }
        
        // Para sub-receita, garantir valores padrão se não houver calculated
        const calculatedFinal = calculated || {
          gastoSobreFaturamento: 0,
          impostos: 0,
          taxasMeiosPagamento: 0,
          comissoesPlataformas: 0,
          outros: 0,
          valorEmReal: 0
        };

        // Buscar configuração salva para este bloco
        const configKey = `checkbox-states-${bloco.id}`;
        const config = await loadConfiguration(configKey);
        
        // Buscar IDs selecionados das tabelas relacionadas
        const despesasFixasSelecionadas = [];
        const folhaPagamentoSelecionada = [];
        const encargosVendaSelecionados = [];
        
        if (config && typeof config === 'object') {
          // Buscar todos os dados para mapear os IDs corretamente
          const [{ data: despesasFixas }, { data: folhaPagamento }, { data: encargosVenda }] = await Promise.all([
            supabase.from('despesas_fixas').select('id').eq('user_id', user.id).eq('ativo', true),
            supabase.from('folha_pagamento').select('id').eq('user_id', user.id).eq('ativo', true),
            supabase.from('encargos_venda').select('id').eq('user_id', user.id).eq('ativo', true)
          ]);

          // Filtrar IDs selecionados
          despesasFixas?.forEach(item => {
            if (config[item.id]) despesasFixasSelecionadas.push(item.id);
          });
          
          folhaPagamento?.forEach(item => {
            if (config[item.id]) folhaPagamentoSelecionada.push(item.id);
          });
          
          encargosVenda?.forEach(item => {
            if (config[item.id]) encargosVendaSelecionados.push(item.id);
          });
        }

        // Calcular markup ideal correto baseado nos valores atualizados
        const totalEncargos = calculatedFinal.gastoSobreFaturamento + calculatedFinal.impostos + calculatedFinal.taxasMeiosPagamento + calculatedFinal.comissoesPlataformas + calculatedFinal.outros;
        const totalPercentuais = totalEncargos + bloco.lucroDesejado;
        
        // Sub-receita sempre tem markup 1.0 (sem lucro)
        const markupIdealCorreto = bloco.id === 'subreceita-fixo' 
          ? 1.0 
          : (totalPercentuais > 0 ? 100 / (100 - totalPercentuais) : 1.0);

        const markupData = {
          user_id: user.id,
          nome: bloco.nome,
          tipo: bloco.id === 'subreceita-fixo' ? 'sub_receita' : (bloco.nome.toLowerCase().includes('sub') ? 'sub_receita' : 'normal'),
          periodo: bloco.periodo,
          margem_lucro: bloco.lucroDesejado,
          gasto_sobre_faturamento: calculatedFinal.gastoSobreFaturamento,
          encargos_sobre_venda: calculatedFinal.impostos + calculatedFinal.taxasMeiosPagamento + calculatedFinal.comissoesPlataformas + calculatedFinal.outros,
          markup_ideal: markupIdealCorreto,
          markup_aplicado: markupIdealCorreto,
          preco_sugerido: calculatedFinal.valorEmReal,
          despesas_fixas_selecionadas: despesasFixasSelecionadas,
          folha_pagamento_selecionada: folhaPagamentoSelecionada,
          encargos_venda_selecionados: encargosVendaSelecionados,
          ativo: true
        };

        console.log(`💾 [SALVAR MARKUPS] Salvando/atualizando ${bloco.nome}:`, {
          ...markupData,
          detalhesCalculados: {
            gastoSobreFaturamento: calculatedFinal.gastoSobreFaturamento,
            impostos: calculatedFinal.impostos,
            taxasMeiosPagamento: calculatedFinal.taxasMeiosPagamento,
            comissoesPlataformas: calculatedFinal.comissoesPlataformas,
            outros: calculatedFinal.outros,
            valorEmReal: calculatedFinal.valorEmReal
          }
        });

        // ✅ UPSERT: INSERT com ON CONFLICT UPDATE
        await supabase
          .from('markups')
          .upsert(markupData, {
            onConflict: 'user_id,nome',
            ignoreDuplicates: false
          });

        // Salvar configuração individual para o tooltip
        const configIndividual = {
          periodo: bloco.periodo,
          gastoSobreFaturamento: calculatedFinal.gastoSobreFaturamento,
          impostos: calculatedFinal.impostos,
          taxas: calculatedFinal.taxasMeiosPagamento,
          comissoes: calculatedFinal.comissoesPlataformas,
          outros: calculatedFinal.outros,
          valorEmReal: calculatedFinal.valorEmReal,
          // ✅ CORREÇÃO: Incluir lucroDesejado e markupIdeal na configuração individual
          lucroDesejado: bloco.lucroDesejado,
          markupIdeal: markupIdealCorreto
        };

        const tooltipConfigKey = `markup_${bloco.nome.toLowerCase().replace(/\s+/g, '_')}`;
        await saveConfiguration(tooltipConfigKey, configIndividual);
        console.log(`💾 [SALVAR MARKUPS] Configuração individual salva para tooltip: ${tooltipConfigKey}`, configIndividual);

        // Sincronizar com user_configurations - atualizar bloco com valores calculados
        const configBlocosAtualizados = [...blocos];
        const blocoIndex = configBlocosAtualizados.findIndex(b => b.id === bloco.id);
        if (blocoIndex >= 0) {
          configBlocosAtualizados[blocoIndex] = {
            ...configBlocosAtualizados[blocoIndex],
            gastoSobreFaturamento: calculatedFinal.gastoSobreFaturamento,
            impostos: calculatedFinal.impostos,
            taxasMeiosPagamento: calculatedFinal.taxasMeiosPagamento,
            comissoesPlataformas: calculatedFinal.comissoesPlataformas,
            outros: calculatedFinal.outros,
            valorEmReal: calculatedFinal.valorEmReal
          };
        }
      }

      // Sincronizar configurações atualizadas com user_configurations
      try {
        const configBlocosAtualizados = blocos.map(bloco => {
          const calculated = calculatedMarkups.get(bloco.id);
          if (calculated) {
            return {
              ...bloco,
              gastoSobreFaturamento: calculated.gastoSobreFaturamento,
              impostos: calculated.impostos,
              taxasMeiosPagamento: calculated.taxasMeiosPagamento,
              comissoesPlataformas: calculated.comissoesPlataformas,
              outros: calculated.outros,
              valorEmReal: calculated.valorEmReal
            };
          }
          return bloco;
        });
        
        await saveConfiguration('markups_blocos', configBlocosAtualizados);
        console.log('🔄 [SALVAR MARKUPS] Configurações sincronizadas com user_configurations');
      } catch (error) {
        console.error('❌ [SALVAR MARKUPS] Erro ao sincronizar configurações:', error);
      }

      console.log('✅ [SALVAR MARKUPS] Markups salvos no banco de dados com sucesso!');
    } catch (error) {
      console.error('❌ [SALVAR MARKUPS] Erro ao salvar markups no banco:', error);
    } finally {
      isMarkupSaving.current = false;
    }
  };

  const calcularMarkupIdealParaBanco = (bloco: MarkupBlock, calculated: CalculatedMarkup) => {
    const totalEncargos = calculated.gastoSobreFaturamento + calculated.impostos + calculated.taxasMeiosPagamento + calculated.comissoesPlataformas + calculated.outros;
    const totalPercentuais = totalEncargos + bloco.lucroDesejado;
    
    // Garantir margem mínima de 20% se não houver lucro desejado configurado
    const margemFinal = totalPercentuais === 0 ? 20 : totalPercentuais;
    const markup = 100 / (100 - margemFinal);
    
    return isFinite(markup) && markup > 1 ? markup : 1.25; // Mínimo de 25% markup
  };

  const calcularMarkupAplicadoParaBanco = (bloco: MarkupBlock, calculated: CalculatedMarkup) => {
    const totalEncargos = calculated.gastoSobreFaturamento + calculated.impostos + calculated.taxasMeiosPagamento + calculated.comissoesPlataformas + calculated.outros;
    const totalPercentuais = totalEncargos + bloco.lucroDesejado;
    
    // Garantir margem mínima de 20% se não houver lucro desejado configurado
    const margemFinal = totalPercentuais === 0 ? 20 : totalPercentuais;
    const markup = 100 / (100 - margemFinal);
    
    return isFinite(markup) && markup > 1 ? markup : 1.25; // Mínimo de 25% markup
  };

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
    // Contar apenas blocos NORMAIS (sub-receita é liberada para todos os planos)
    const blocosNormais = blocos.filter(
      (b) => b.id !== 'subreceita-fixo' && !b.nome.toLowerCase().includes('sub')
    );

    // Verificar limite antes de adicionar
    const limitCheck = await checkLimit('markups');

    if (!limitCheck.allowed) {
      if (limitCheck.reason === 'limit_exceeded') {
        toast({
          title: 'Limite atingido',
          description: `Você já tem ${limitCheck.currentCount ?? blocosNormais.length} de ${limitCheck.maxAllowed} blocos de markup do plano ${limitCheck.plan ?? ''}. Faça upgrade para criar mais blocos.`,
          variant: 'destructive',
        });
        setShowUpgradeModal(true);
      } else {
        showUpgradeMessage('markups');
      }
      return;
    }

    // 🎯 NOVO: Criação direta sem modal complexo
    const novoBloco: MarkupBlock = {
      id: Date.now().toString(),
      nome: `Markup ${blocosNormais.length + 1}`,
      gastoSobreFaturamento: 0,
      impostos: 0,
      taxasMeiosPagamento: 0,
      comissoesPlataformas: 0,
      outros: 0,
      valorEmReal: 0,
      lucroDesejado: 20,
      periodo: '12'
    };
    
    const novosBlocos = [...blocos, novoBloco];
    setBlocos(novosBlocos);
    salvarBlocos(novosBlocos);

    toast({
      title: "Bloco criado!",
      description: `O bloco "${novoBloco.nome}" foi criado com sucesso.`
    });
  };

  const removerBloco = async (id: string) => {
    if (!user?.id) return;

    // ✅ PROTEÇÃO: Não permitir deletar o bloco de sub-receita
    if (id === 'subreceita-fixo') {
      toast({
        title: "Operação não permitida",
        description: "O bloco de sub-receita não pode ser removido.",
        variant: "destructive"
      });
      return;
    }

    // Buscar o markup no banco para pegar o UUID real
    const blocoParaRemover = blocos.find(b => b.id === id);
    if (!blocoParaRemover) return;

    const { data: markupParaDeletar } = await supabase
      .from('markups')
      .select('id, nome')
      .eq('user_id', user.id)
      .eq('nome', blocoParaRemover.nome)
      .maybeSingle();
    
    if (markupParaDeletar) {
      // Buscar receitas afetadas
      const { data: receitasAfetadas } = await supabase
        .from('receitas')
        .select('id, nome')
        .eq('user_id', user.id)
        .eq('markup_id', markupParaDeletar.id);
      
      // Limpar markup_id das receitas afetadas
      if (receitasAfetadas && receitasAfetadas.length > 0) {
        await supabase
          .from('receitas')
          .update({ markup_id: null })
          .eq('user_id', user.id)
          .eq('markup_id', markupParaDeletar.id);
        
        toast({
          title: "Markup removido",
          description: `${receitasAfetadas.length} receita(s) foram atualizadas e não têm mais markup selecionado.`,
        });
      }
    }
    
    // Remover do estado local e salvar
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
    
    // Se mudou o período, recalcular os markups imediatamente
    if (campo === 'periodo') {
      console.log(`🔄 Período alterado para bloco ${id}, recalculando markups...`);
      setTimeout(() => {
        carregarConfiguracoesSalvas();
      }, 100);
    }
  };

  const calcularMarkupIdealParaExibicao = (bloco: MarkupBlock, calculated: CalculatedMarkup) => {
    const totalPercentuais = calculated.gastoSobreFaturamento + calculated.impostos + 
                            calculated.taxasMeiosPagamento + calculated.comissoesPlataformas + 
                            calculated.outros + bloco.lucroDesejado;
    
    const markup = 100 / (100 - totalPercentuais);
    return isFinite(markup) ? markup : 1;
  };

  const renderMarkupGrid = (bloco: MarkupBlock, calculated: CalculatedMarkup | undefined, hasCalculated: boolean) => {
    const items = [
      { label: 'Gasto sobre faturamento', value: hasCalculated ? formatPercentage(calculated!.gastoSobreFaturamento) : '0', suffix: '%', color: '#0483e4' },
      { label: 'Impostos', value: hasCalculated ? formatPercentage(calculated!.impostos) : '0', suffix: '%', color: '#2c4dc7' },
      { label: 'Taxas meios pgto.', value: hasCalculated ? formatPercentage(calculated!.taxasMeiosPagamento) : '0', suffix: '%', color: '#7328b1' },
      { label: 'Comissões / plataformas', value: hasCalculated ? formatPercentage(calculated!.comissoesPlataformas) : '0', suffix: '%', color: '#af1188' },
      { label: 'Outros', value: hasCalculated ? formatPercentage(calculated!.outros) : '0', suffix: '%', color: '#dd0b52' },
      { label: 'Valor fixo (R$)', value: hasCalculated ? formatCurrency(calculated!.valorEmReal) : formatCurrency(0), suffix: '', color: '#f96e0c' },
    ];

    return (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {items.map((item, i) => (
          <div key={i} className="rounded-xl bg-muted/40 border border-border/30 p-3 space-y-1">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">{item.label}</p>
            <p className="text-lg font-bold font-display" style={{ color: item.color }}>
              {item.value}{item.suffix && <span className="text-xs ml-0.5">{item.suffix}</span>}
            </p>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display text-foreground">Configuração de Markups</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {blocos.filter(b => b.id !== 'subreceita-fixo').length}/{planInfo.limits.markups === -1 ? '∞' : planInfo.limits.markups} blocos de markup
          </p>
        </div>
        <Button 
          onClick={criarNovoBloco}
          size="sm"
          className="gap-1.5 rounded-xl h-9"
        >
          <Plus className="h-3.5 w-3.5" />
          Novo Bloco
        </Button>
      </div>

      {/* Bloco Subreceita */}
      {(() => {
        const blocoSub = blocos.find(b => b.id === 'subreceita-fixo');
        if (!blocoSub) return null;
        
        const calculated = calculatedMarkups.get('subreceita-fixo');
        const markupIdealSubreceita = calculated 
          ? calcularMarkupIdealParaExibicao(blocoSub, calculated) 
          : 1;
        
        return (
          <Card className="glass-card overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-[#0483e4] to-[#2c4dc7]" />
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-[#0483e4]/10">
                    <Calculator className="h-4 w-4 text-[#0483e4]" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-display">Subreceita</CardTitle>
                    <p className="text-[10px] text-muted-foreground">Bloco fixo para subprodutos</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => abrirConfiguracaoCompleta('subreceita-fixo')}
                    className="h-8 px-3 gap-1.5 rounded-xl text-xs border-border/50"
                  >
                    <Settings className="h-3 w-3" />
                    Configurar
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {renderMarkupGrid(blocoSub, calculated, !!calculated)}
              
              {/* Lucro + Markup ideal */}
              <div className="flex items-center justify-between rounded-xl bg-[#0483e4]/5 border border-[#0483e4]/20 p-4">
                <div className="space-y-0.5">
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Lucro desejado</p>
                  <p className="text-lg font-bold font-display text-foreground">{blocoSub.lucroDesejado}%</p>
                </div>
                <div className="text-right space-y-0.5">
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Markup Ideal</p>
                  <p className="text-2xl font-bold font-display text-[#0483e4]">
                    {formatNumber(markupIdealSubreceita, 4)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })()}

      {/* Blocos do usuário */}
      {blocos.filter(b => b.id !== 'subreceita-fixo').map((bloco, index) => {
        const calculated = calculatedMarkups.get(bloco.id);
        const hasCalculated = calculated !== undefined;
        const markupIdeal = hasCalculated ? calcularMarkupIdealParaExibicao(bloco, calculated) : 1;
        
        // Brand gradient colors cycling
        const gradients = [
          'from-[#7328b1] to-[#af1188]',
          'from-[#dd0b52] to-[#f96e0c]',
          'from-[#0483e4] to-[#2c4dc7]',
          'from-[#af1188] to-[#dd0b52]',
        ];
        const gradientColors = [
          { bg: '#7328b1', light: '#7328b1' },
          { bg: '#dd0b52', light: '#dd0b52' },
          { bg: '#0483e4', light: '#0483e4' },
          { bg: '#af1188', light: '#af1188' },
        ];
        const gi = index % gradients.length;
        const gradient = gradients[gi];
        const gColor = gradientColors[gi];
        
        return (
          <Card key={bloco.id} className="glass-card overflow-hidden animate-slide-up" style={{ animationDelay: `${index * 100}ms` }}>
            <div className={`h-1 bg-gradient-to-r ${gradient}`} />
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg" style={{ backgroundColor: `${gColor.bg}15` }}>
                    <Calculator className="h-4 w-4" style={{ color: gColor.bg }} />
                  </div>
                  <CardTitle className="text-base font-display capitalize">{bloco.nome}</CardTitle>
                </div>
                <div className="flex items-center gap-1.5">
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={() => iniciarEdicaoNome(bloco)}
                    className="h-8 w-8 p-0 rounded-xl"
                  >
                    <Edit2 className="h-3 w-3" />
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => abrirConfiguracaoCompleta(bloco.id)}
                    className="h-8 px-3 gap-1.5 rounded-xl text-xs border-border/50"
                  >
                    <Settings className="h-3 w-3" />
                    Configurar
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={() => removerBloco(bloco.id)}
                    className="h-8 w-8 p-0 rounded-xl text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              
              {/* Período + Média */}
              <div className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-muted/40 border border-border/30 p-3">
                <div className="flex items-center gap-2">
                  <Label className="text-xs font-medium text-muted-foreground whitespace-nowrap">Período:</Label>
                  <Select value={bloco.periodo} onValueChange={(value) => atualizarBloco(bloco.id, 'periodo', value)}>
                    <SelectTrigger className="w-[140px] h-8 text-xs rounded-lg">
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
                  <p className="text-[10px] text-muted-foreground">Média de faturamento</p>
                  <p className="text-sm font-bold font-display" style={{ color: gColor.bg }}>
                    {formatCurrency(calcularValorPeriodoBloco(bloco.periodo))}
                  </p>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {renderMarkupGrid(bloco, calculated, hasCalculated)}
              
              {/* Lucro + Markup ideal */}
              <div className="flex items-center justify-between rounded-xl border p-4" style={{ backgroundColor: `${gColor.bg}08`, borderColor: `${gColor.bg}25` }}>
                <div className="space-y-1">
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Lucro desejado</p>
                  <div className="w-24">
                    <NumericInputPtBr
                      tipo="percentual"
                      min={0}
                      max={100}
                      value={bloco.lucroDesejado}
                      onChange={(valor) => atualizarBloco(bloco.id, 'lucroDesejado', valor)}
                      className="font-bold text-lg h-9"
                    />
                  </div>
                </div>
                <div className="text-right space-y-0.5">
                  <div className="flex items-center gap-1.5 justify-end">
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Markup Ideal</p>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Markup = 100 / (100 - % total)</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <p className="text-2xl font-bold font-display" style={{ color: gColor.bg }}>
                    {hasCalculated ? formatNumber(markupIdeal, 4) : '1,0000'}
                  </p>
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

      <UpgradePlansModal 
        open={showUpgradeModal}
        onOpenChange={setShowUpgradeModal}
      />
    </div>
  );
}