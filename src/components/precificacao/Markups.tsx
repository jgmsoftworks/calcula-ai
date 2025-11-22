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
                // Sempre usar custo_por_hora * horas_totais_mes para obter o custo total
                // Se custo_por_hora não estiver disponível, o custo será zero (indica dados incompletos)
                const custoMensal = (funcionario.custo_por_hora || 0) * (funcionario.horas_totais_mes || 173.2);
                return acc + Number(custoMensal);
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
    // Verificar limite antes de adicionar
    const limitCheck = await checkLimit('markups');
    
    if (!limitCheck.allowed) {
      if (limitCheck.reason === 'limit_exceeded') {
        toast({
          title: 'Limite atingido',
          description: `Você atingiu o limite de ${limitCheck.maxAllowed} blocos de markup do seu plano. Faça upgrade para criar mais blocos.`,
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
      nome: `Markup ${blocos.length + 1}`,
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

  return (
    <div className="space-y-6">
      {/* Botão para criar novo bloco */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Configuração de Markups</h2>
          <p className="text-muted-foreground">
            {blocos.filter(b => b.id !== 'subreceita-fixo').length}/{planInfo.limits.markups === -1 ? '∞' : planInfo.limits.markups} blocos de markup
          </p>
        </div>
        <Button 
          onClick={criarNovoBloco}
          className="bg-primary hover:bg-primary/90"
        >
          <Plus className="h-4 w-4 mr-2" />
          Novo Bloco de Markup
        </Button>
      </div>

      {/* Bloco Subreceita - Sempre fixo */}
      {(() => {
        // Buscar o bloco de sub-receita do array
        const blocoSub = blocos.find(b => b.id === 'subreceita-fixo');
        if (!blocoSub) return null;
        
        const calculated = calculatedMarkups.get('subreceita-fixo');
        const markupIdealSubreceita = calculated 
          ? calcularMarkupIdealParaExibicao(blocoSub, calculated) 
          : 1;
        
        return (
          <Card className="border-primary bg-primary/5">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-primary capitalize font-bold text-xl flex items-center gap-2">
                    <Calculator className="h-5 w-5" />
                    Subreceita
                  </CardTitle>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p><strong>Atenção:</strong> Este bloco é exclusivo para subprodutos que não são vendidos separadamente, como massas, recheios e coberturas. Ele serve apenas para organizar ingredientes usados em receitas.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                
                {/* ✅ ADICIONAR botão de configuração */}
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => abrirConfiguracaoCompleta('subreceita-fixo')}
                  className="h-8 px-3 flex items-center gap-1"
                >
                  <Settings className="h-3 w-3" />
                  Configurar
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <Label className="text-sm font-medium text-muted-foreground">Gasto sobre faturamento</Label>
                  <div className="text-2xl font-bold text-primary">
                    {calculated ? formatPercentage(calculated.gastoSobreFaturamento) : '0,00'}%
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-sm font-medium text-muted-foreground">Impostos</Label>
                  <div className="text-2xl font-bold text-primary">
                    {calculated ? formatPercentage(calculated.impostos) : '0,00'}%
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-sm font-medium text-muted-foreground">Taxas de meios de pagamento</Label>
                  <div className="text-2xl font-bold text-primary">
                    {calculated ? formatPercentage(calculated.taxasMeiosPagamento) : '0,00'}%
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-sm font-medium text-muted-foreground">Comissões e plataformas</Label>
                  <div className="text-2xl font-bold text-primary">
                    {calculated ? formatPercentage(calculated.comissoesPlataformas) : '0,00'}%
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-sm font-medium text-muted-foreground">Outros</Label>
                  <div className="text-2xl font-bold text-primary">
                    {calculated ? formatPercentage(calculated.outros) : '0,00'}%
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-sm font-medium text-muted-foreground">Valor em real</Label>
                  <div className="text-2xl font-bold" style={{ color: 'hsl(var(--orange))' }}>
                    {calculated ? formatCurrency(calculated.valorEmReal) : formatCurrency(0)}
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-sm font-medium text-muted-foreground">Lucro desejado sobre venda</Label>
                  <div className="text-2xl font-bold" style={{ color: 'hsl(var(--accent))' }}>
                    {blocoSub.lucroDesejado}%
                  </div>
                </div>
              </div>
              
              <div className="mt-6 pt-4 border-t bg-primary/5 dark:bg-primary/10 -mx-6 px-6 pb-6">
                <div className="flex items-center justify-between">
                  <Label className="text-lg font-semibold text-primary">Markup ideal</Label>
                  <div className="text-3xl font-bold text-primary">
                    {formatNumber(markupIdealSubreceita, 4)}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })()}

      {/* Blocos do usuário */}
      {blocos.filter(b => b.id !== 'subreceita-fixo').map((bloco) => {
        const calculated = calculatedMarkups.get(bloco.id);
        const hasCalculated = calculated !== undefined;
        const markupIdeal = hasCalculated ? calcularMarkupIdealParaExibicao(bloco, calculated) : 1;
        
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
                    <Select value={bloco.periodo} onValueChange={(value) => {
                      atualizarBloco(bloco.id, 'periodo', value);
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
                      {bloco.periodo === 'todos' ? 'Média de faturamento (todos os períodos)' : `Média de faturamento (${getPeriodoLabel(bloco.periodo)})`}
                    </Label>
                    <p className="text-lg font-bold text-primary">
                      {formatCurrency(calcularValorPeriodoBloco(bloco.periodo))}
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
                    <NumericInputPtBr
                      tipo="percentual"
                      min={0}
                      max={100}
                      value={bloco.lucroDesejado}
                      onChange={(valor) => atualizarBloco(bloco.id, 'lucroDesejado', valor)}
                      className="font-bold"
                      style={{ color: 'hsl(var(--accent))' }}
                    />
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
                          {hasCalculated ? formatNumber(markupIdeal, 4) : '1,0000'}
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