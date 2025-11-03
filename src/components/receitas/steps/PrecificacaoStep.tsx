import { useState, useEffect } from 'react';
import { TrendingUp, DollarSign, Weight, Calculator, Target, Percent, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { NumericInputPtBr } from '@/components/ui/numeric-input-ptbr';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { formatters } from '@/lib/formatters';

interface Ingrediente {
  id: string;
  produto_id: string;
  nome: string;
  quantidade: number;
  unidade: string;
  custo_unitario: number;
  custo_total: number;
  marcas?: string[];
}

interface SubReceita {
  id: string;
  receita_id: string;
  nome: string;
  quantidade: number;
  unidade: string;
  custo_unitario: number;
  custo_total: number;
}

interface Embalagem {
  id: string;
  produto_id: string;
  nome: string;
  quantidade: number;
  unidade: string;
  custo_unitario: number;
  custo_total: number;
}

interface MaoObraItem {
  id: string;
  funcionario: {
    id: string;
    nome: string;
    cargo: string;
    custo_por_hora: number;
  };
  tempo: number;
  valorTotal: number;
  unidadeTempo?: string;
}

interface MarkupData {
  id: string;
  nome: string;
  tipo: string;
  periodo: string;
  margem_lucro: number;
  gasto_sobre_faturamento: number;
  encargos_sobre_venda: number;
  markup_ideal: number;
  markup_aplicado: number;
  preco_sugerido: number;
  ativo: boolean;
  despesas_fixas_selecionadas?: any[];
  encargos_venda_selecionados?: any[];
  folha_pagamento_selecionada?: any[];
}

interface EncargosDetalhados {
  impostos: number;
  taxas: number;
  comissoes: number;
  outros: number;
  total: number;
  mediaFaturamento: number;
  gastoSobreFaturamentoCalculado: number;
  lucroDesejado: number;
  markupIdeal: number;
  valorEmReal: number;
}

interface ReceitaData {
  ingredientes: Ingrediente[];
  subReceitas: SubReceita[];
  embalagens: Embalagem[];
  maoObra: MaoObraItem[];
  rendimentoValor: string;
  rendimentoUnidade: string;
  markupSelecionado: string | null;
  precoVenda?: number;
  pesoUnitario?: number;
}

interface PrecificacaoStepProps {
  receitaData: ReceitaData;
  receitaId?: string | null;
  onReceitaDataChange?: (data: ReceitaData | ((prev: ReceitaData) => ReceitaData)) => void;
}

export function PrecificacaoStep({ receitaData, receitaId, onReceitaDataChange }: PrecificacaoStepProps) {
  const [precoVenda, setPrecoVenda] = useState('');
  const [pesoUnitario, setPesoUnitario] = useState('');
  const [markups, setMarkups] = useState<MarkupData[]>([]);
  const [markupSelecionado, setMarkupSelecionado] = useState<string>('');
  const [markupsLoaded, setMarkupsLoaded] = useState(false);
  const [encargosDetalhados, setEncargosDetalhados] = useState<{[key: string]: EncargosDetalhados}>({});
  
  const { toast } = useToast();
  const { user } = useAuth();

  // Função para calcular detalhes dos encargos - Agora usa dados corretos da user_configurations
  const calcularEncargosDetalhados = async (markup: MarkupData): Promise<EncargosDetalhados & { 
    mediaFaturamento: number; 
    gastoSobreFaturamentoCalculado: number; 
    valorEmReal: number;
  }> => {
    console.log(`🔍 [TOOLTIP DEBUG] Buscando dados corretos da user_configurations para: ${markup.nome} (ID: ${markup.id})`);

    if (!user?.id) {
      return { impostos: 0, taxas: 0, comissoes: 0, outros: 0, total: 0, mediaFaturamento: 0, gastoSobreFaturamentoCalculado: 0, lucroDesejado: 0, markupIdeal: 0, valorEmReal: 0 };
    }

    try {
      // 1. Primeiro, buscar dados da user_configurations
      const { data: configData, error: configError } = await supabase
        .from('user_configurations')
        .select('configuration')
        .eq('user_id', user.id)
        .eq('type', `markup_${markup.nome.toLowerCase().replace(/\s+/g, '_')}`)
        .maybeSingle();

      if (configError) {
      console.log(`❌ [TOOLTIP DEBUG] Erro ao buscar configuração:`, configError);
        return { impostos: 0, taxas: 0, comissoes: 0, outros: 0, total: 0, mediaFaturamento: 0, gastoSobreFaturamentoCalculado: 0, lucroDesejado: 0, markupIdeal: 0, valorEmReal: 0 };
      }

      // 2. Buscar dados de faturamento para calcular média
      const faturamentosConfigResult = await supabase
        .from('user_configurations')
        .select('configuration')
        .eq('user_id', user.id)
        .eq('type', 'faturamentos_historicos')
        .maybeSingle();

      let mediaFaturamento = 0;
      const todosFaturamentos = (faturamentosConfigResult?.data?.configuration && Array.isArray(faturamentosConfigResult.data.configuration))
        ? faturamentosConfigResult.data.configuration.map((f: any) => ({ mes: new Date(f.mes), valor: f.valor }))
        : [];

      let impostos = 0, taxas = 0, comissoes = 0, outros = 0, gastoSobreFaturamentoCalculado = 0;
      let lucroDesejado = 0, markupIdeal = 0;

      // 3. Se encontrou configuração na user_configurations, extrair valores detalhados
      if (configData?.configuration) {
        const config = configData.configuration as any;
        console.log(`📊 [TOOLTIP DEBUG] Configuração user_configurations para ${markup.nome}:`, config);

        impostos = Number(config.impostos || 0);
        taxas = Number(config.taxas || 0);
        comissoes = Number(config.comissoes || 0);
        outros = Number(config.outros || 0);
        gastoSobreFaturamentoCalculado = Number(config.gastoSobreFaturamento || 0);
        lucroDesejado = Number(config.lucroDesejado || 0);
        markupIdeal = Number(config.markupIdeal || 0);

        // Calcular média de faturamento baseada no período
        if (todosFaturamentos.length > 0) {
          const periodoSelecionado = config.periodo || '12';
          
          if (periodoSelecionado === 'todos') {
            const totalFaturamentos = todosFaturamentos.reduce((acc: number, f: any) => acc + f.valor, 0);
            mediaFaturamento = totalFaturamentos / todosFaturamentos.length;
          } else {
            const mesesAtras = parseInt(String(periodoSelecionado), 10);
            const dataLimite = new Date();
            dataLimite.setMonth(dataLimite.getMonth() - mesesAtras);

            const faturamentosFiltrados = todosFaturamentos.filter((f: any) => f.mes >= dataLimite);
            
            if (faturamentosFiltrados.length > 0) {
              const total = faturamentosFiltrados.reduce((acc: number, f: any) => acc + f.valor, 0);
              mediaFaturamento = total / faturamentosFiltrados.length;
            }
          }
        }
      }

      // 4. ✅ FALLBACK: Se lucroDesejado ou markupIdeal não foram encontrados na user_configurations,
      // buscar na tabela markups onde estão salvos como margem_lucro e markup_ideal
      if (lucroDesejado === 0 || markupIdeal === 0) {
        console.log(`🔄 [TOOLTIP DEBUG] Valores ausentes na user_configurations, buscando fallback na tabela markups`);
        
        const { data: markupData, error: markupError } = await supabase
          .from('markups')
          .select('margem_lucro, markup_ideal')
          .eq('user_id', user.id)
          .eq('id', markup.id)
          .maybeSingle();

        if (!markupError && markupData) {
          console.log(`📊 [TOOLTIP DEBUG] Dados fallback da tabela markups:`, markupData);
          
          if (lucroDesejado === 0) {
            lucroDesejado = Number(markupData.margem_lucro || 0);
          }
          if (markupIdeal === 0) {
            markupIdeal = Number(markupData.markup_ideal || 0);
          }
        }
      }

      const total = impostos + taxas + comissoes + outros;
      
      // 5. Extrair o "Valor em real" da configuração do markup
      let valorEmReal = 0;
      if (configData?.configuration) {
        const config = configData.configuration as any;
        valorEmReal = Number(config.valorEmReal || config.valor_em_real || 0);
      }

      const resultado = { 
        impostos, 
        taxas, 
        comissoes, 
        outros, 
        total, 
        mediaFaturamento,
        gastoSobreFaturamentoCalculado,
        lucroDesejado,
        markupIdeal,
        valorEmReal
      };
      
      console.log(`✅ [TOOLTIP DEBUG] Resultado final para ${markup.nome}:`, resultado);
      
      return resultado;
    } catch (error) {
      console.error(`❌ [TOOLTIP DEBUG] Erro ao buscar detalhes do markup ${markup.nome}:`, error);
      return { impostos: 0, taxas: 0, comissoes: 0, outros: 0, total: 0, mediaFaturamento: 0, gastoSobreFaturamentoCalculado: 0, lucroDesejado: 0, markupIdeal: 0, valorEmReal: 0 };
    }
  };

  // Inicializar estado com markup da receita se estiver editando
  useEffect(() => {
    if (receitaData.markupSelecionado && receitaData.markupSelecionado !== markupSelecionado) {
      setMarkupSelecionado(receitaData.markupSelecionado);
    }
  }, [receitaData.markupSelecionado]);

  const salvarMarkupSelecionado = async (markupId: string) => {
    if (!user?.id) return;

    console.log('🎯 Selecionando markup:', markupId);
    console.log('📊 Estado atual - custoUnitario:', custoUnitario);
    console.log('📊 Estado atual - markups:', markups);
    console.log('📊 Estado atual - receitaId:', receitaId);
    
    try {
      const markupSelecionadoData = markups.find(m => m.id === markupId);
      console.log('📊 Dados do markup selecionado:', markupSelecionadoData);
      
      let precoCalculado = 0;
      
      // Calcular preço baseado no tipo de markup
      if (markupSelecionadoData) {
        console.log('🎯 Markup selecionado encontrado:', markupSelecionadoData.nome, 'Tipo:', markupSelecionadoData.tipo);
        
        if (custoUnitario > 0) {
          console.log('💰 Custo unitário:', custoUnitario);
          
        if (markupSelecionadoData.tipo === 'sub_receita') {
          // Para sub-receitas, preço = custo (sem lucro)
          precoCalculado = custoUnitario;
          console.log('🏷️ Sub-receita: Preço = Custo (sem lucro):', precoCalculado);
        } else {
          // Para outros markups, NÃO aplicar preço automático
          console.log('📋 Markup normal: usuário deve digitar o preço manualmente');
          precoCalculado = 0; // Não definir preço automaticamente
        }
        console.log('✅ Preço > 0?', precoCalculado > 0);
        
        // Definir preço de venda APENAS para sub-receitas
        if (markupSelecionadoData.tipo === 'sub_receita' && precoCalculado > 0) {
          const precoFormatado = new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }).format(precoCalculado);
          
          console.log('🎨 Preço formatado para sub-receita:', precoFormatado);
          setPrecoVenda(precoFormatado);
        } else {
          console.log('📋 Markup normal: preço não alterado automaticamente');
        }
        } // Closing brace for if (custoUnitario > 0)
      }

      // Verificar se o markup existe antes de salvar
      const markupExists = markups.some(m => m.id === markupId);
      if (!markupExists) {
        console.error('❌ Markup não encontrado:', markupId);
        toast({
          title: "Erro",
          description: "Markup selecionado não foi encontrado",
          variant: "destructive",
        });
        return;
      }

      // Preparar dados para salvamento
      const updateData: any = {
        markup_id: markupId,
      };
      
      // Para sub-receitas, sempre salvar o preço calculado
      if (markupSelecionadoData?.tipo === 'sub_receita' && precoCalculado > 0) {
        updateData.preco_venda = precoCalculado;
        console.log('💾 Preparando para salvar preço de sub-receita:', precoCalculado);
      } else {
        console.log('📋 Markup normal: preço não incluído no salvamento automático');
      }

      // Se estamos editando uma receita existente, salvar no banco
      if (receitaId) {
        console.log('📝 Editando receita existente, ID:', receitaId);
        console.log('📦 Dados para atualização:', updateData);
        
        const { data, error } = await supabase
          .from('receitas')
          .update(updateData)
          .eq('id', receitaId)
          .eq('user_id', user.id)
          .select();

        if (error) {
          console.error('❌ Erro ao salvar markup:', error);
          
          // Tratar erro de foreign key especificamente
          if (error.code === '23503') {
            toast({
              title: "Erro de Referência", 
              description: "O markup selecionado não existe mais no sistema",
              variant: "destructive",
            });
          } else {
            toast({
              title: "Erro",
              description: "Não foi possível salvar o markup selecionado",
              variant: "destructive",
            });
          }
          return;
        }
        
        console.log('✅ Markup e preço salvos no banco:', data);
      } else {
        console.log('⚠️ Não é edição (receitaId é null), dados preparados para salvamento futuro');
      }
      
      // Sempre atualizar o estado local
      setMarkupSelecionado(markupId);
      
      // Se houver callback, atualizar o estado compartilhado também
      if (onReceitaDataChange) {
        if (markupSelecionadoData?.tipo === 'sub_receita' && precoCalculado > 0) {
          // Para sub-receitas, definir o preço automaticamente
          onReceitaDataChange(prev => ({
            ...prev,
            markupSelecionado: markupId,
            precoVenda: precoCalculado
          }));
          console.log('📤 Sub-receita: preço definido automaticamente no estado compartilhado:', precoCalculado);
        } else {
          // Para outros markups, apenas sincronizar o markup selecionado (sem alterar preço)
          onReceitaDataChange(prev => ({
            ...prev,
            markupSelecionado: markupId
          }));
          console.log('📤 Markup normal sincronizado (preço não alterado):', markupId);
        }
      }
      
      toast({
        title: "Sucesso",
        description: "Markup selecionado com sucesso",
      });
    } catch (error) {
      console.error('Erro ao salvar markup:', error);
    }
  };
  
  // Fetch markups from database
  useEffect(() => {
    const fetchMarkups = async () => {
      if (!user?.id || markupsLoaded) return;
      
      console.log('🔍 Buscando markups do banco...');
      setMarkupsLoaded(true);
      
      try {
        // Verificar se há sub-receitas na receita
        const hasSubReceitas = receitaData.subReceitas && receitaData.subReceitas.length > 0;
        console.log('🔄 Tem sub-receitas?', hasSubReceitas, 'Quantidade:', receitaData.subReceitas?.length);
        
        // SEMPRE criar/verificar markup de sub-receitas no banco (para aparecer na lista mesmo sem sub-receitas)
        {
          console.log('🔍 Verificando markup de sub-receitas existente...');
          const { data: existingSubMarkup, error: selectError } = await supabase
            .from('markups')
            .select('*')
            .eq('user_id', user.id)
            .eq('tipo', 'sub_receita')
            .eq('ativo', true)
            .maybeSingle();
            
          console.log('📋 Markup existente:', existingSubMarkup, 'Erro:', selectError);
            
          if (!existingSubMarkup) {
            console.log('➕ Criando markup de sub-receitas no banco...');
            const { data: newMarkup, error: insertError } = await supabase
              .from('markups')
              .insert({
                user_id: user.id,
                nome: 'Sub-receitas',
                tipo: 'sub_receita',
                periodo: 'todos',
                margem_lucro: 0,
                gasto_sobre_faturamento: 0,
                encargos_sobre_venda: 0,
                markup_ideal: 1.0000, // Sem lucro para sub-receitas
                markup_aplicado: 1.0000,
                preco_sugerido: 0,
                ativo: true,
                despesas_fixas_selecionadas: [],
                encargos_venda_selecionados: [],
                folha_pagamento_selecionada: []
              })
              .select()
              .single();
              
            if (insertError) {
              console.error('❌ Erro ao criar markup de sub-receitas:', insertError);
            } else {
              console.log('✅ Markup de sub-receitas criado:', newMarkup);
            }
          } else {
            console.log('✅ Markup de sub-receitas já existe:', existingSubMarkup.nome);
            
            // Verificar e corrigir markup se estiver incorreto
            if (existingSubMarkup.markup_ideal !== 1.0000 || existingSubMarkup.margem_lucro !== 0) {
              console.log('🔧 Corrigindo markup de sub-receitas...');
              const { error: updateError } = await supabase
                .from('markups')
                .update({
                  margem_lucro: 0,
                  markup_ideal: 1.0000,
                  markup_aplicado: 1.0000
                })
                .eq('id', existingSubMarkup.id);
                
              if (updateError) {
                console.error('❌ Erro ao corrigir markup de sub-receitas:', updateError);
              } else {
                console.log('✅ Markup de sub-receitas corrigido');
              }
            }
          }
        }
        
        const { data, error } = await supabase
          .from('markups')
          .select('*')
          .eq('user_id', user.id)
          .eq('ativo', true)
          .order('tipo', { ascending: false }) // sub_receita primeiro
          .order('created_at', { ascending: false });
        
        if (error) {
          console.error('❌ Erro ao buscar markups:', error);
          setMarkupsLoaded(false);
          return;
        }
        
        console.log('📦 Markups encontrados no banco:', data?.length || 0);
        console.log('📋 Detalhes dos markups:', data?.map(m => ({ nome: m.nome, tipo: m.tipo, id: m.id })));
        
        if (!data || data.length === 0) {
          console.log('⚠️ Nenhum markup encontrado no banco');
          setMarkups([]);
          return;
        }
        
        // Remove duplicados usando Map para garantir unicidade por nome
        const markupsMap = new Map();
        (data || []).forEach(markup => {
          if (!markupsMap.has(markup.nome)) {
            markupsMap.set(markup.nome, markup);
          }
        });
        
        const uniqueMarkups = Array.from(markupsMap.values());
        console.log('✨ Markups únicos após filtro:', uniqueMarkups.length, uniqueMarkups.map(m => `${m.nome} (${m.tipo})`));
        
        setMarkups(uniqueMarkups);
        
        // Carregar detalhes dos encargos para cada markup
        const encargosMap: {[key: string]: EncargosDetalhados} = {};
        for (const markup of uniqueMarkups) {
          encargosMap[markup.id] = await calcularEncargosDetalhados(markup);
        }
        setEncargosDetalhados(encargosMap);
      } catch (error) {
        console.error('Erro ao buscar markups:', error);
        setMarkupsLoaded(false);
      }
    };
    
    fetchMarkups();
  }, [user?.id, receitaData.subReceitas?.length, markupsLoaded]);

  // Reset loaded state when recipe data changes to force reload
  useEffect(() => {
    setMarkupsLoaded(false);
  }, [receitaId, receitaData.subReceitas?.length]);

  // Buscar markup e preço selecionado da receita
  useEffect(() => {
    const fetchReceitaMarkup = async () => {
      if (!receitaId || !user?.id) return;

      try {
        const { data, error } = await supabase
          .from('receitas')
          .select('markup_id, preco_venda, peso_unitario')
          .eq('id', receitaId)
          .eq('user_id', user.id)
          .single();

        if (error) {
          console.error('Erro ao buscar markup da receita:', error);
          return;
        }

        if (data?.markup_id) {
          // Validar se o markup ainda existe
          const { data: markupExiste } = await supabase
            .from('markups')
            .select('id')
            .eq('id', data.markup_id)
            .eq('user_id', user.id)
            .eq('ativo', true)
            .maybeSingle();
          
          if (markupExiste) {
            setMarkupSelecionado(data.markup_id);
          } else {
            // Markup foi deletado, limpar
            console.warn('⚠️ Markup selecionado não existe mais, limpando...');
            await supabase
              .from('receitas')
              .update({ markup_id: null })
              .eq('id', receitaId)
              .eq('user_id', user.id);
            
            setMarkupSelecionado('');
            
            toast({
              title: "Markup removido",
              description: "O markup selecionado foi removido. Selecione um novo markup.",
              variant: "destructive",
            });
          }
        }
        
        if (data?.preco_venda && data.preco_venda > 0) {
          console.log('📥 Carregando preço do banco:', data.preco_venda);
          const precoFormatado = new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }).format(data.preco_venda);
          setPrecoVenda(precoFormatado);
          console.log('🎨 Preço formatado carregado:', precoFormatado);
        } else {
          console.log('⚠️ Nenhum preço salvo encontrado no banco');
        }

        if (data?.peso_unitario && data.peso_unitario > 0) {
          console.log('📥 Carregando peso unitário do banco:', data.peso_unitario);
          setPesoUnitario(data.peso_unitario.toString());
          console.log('💪 Peso unitário carregado:', data.peso_unitario);
        } else if (receitaData.pesoUnitario && receitaData.pesoUnitario > 0) {
          console.log('📥 Carregando peso unitário do estado compartilhado:', receitaData.pesoUnitario);
          setPesoUnitario(receitaData.pesoUnitario.toString());
        } else {
          console.log('⚠️ Nenhum peso unitário salvo encontrado');
        }
      } catch (error) {
        console.error('Erro ao buscar markup da receita:', error);
      }
    };

    fetchReceitaMarkup();
  }, [receitaId, user?.id]);
  
  // ✅ CORREÇÃO: Real-time updates para sincronizar com mudanças da página de Precificação
  useEffect(() => {
    if (!user?.id) return;

    console.log('🔄 [RECEITAS] Configurando real-time updates para markups');
    
    const channel = supabase
      .channel('receitas-markups-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_configurations',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('🔔 [RECEITAS] Real-time update recebida:', payload);
          
          // Verificar se é uma mudança relacionada aos markups
          const configType = (payload.new as any)?.type || (payload.old as any)?.type;
          if (configType && configType.includes('markup_')) {
            console.log('🔃 [RECEITAS] Recarregando markups devido à mudança em tempo real');
            
            // Forçar recarregamento dos markups
            setMarkupsLoaded(false);
            
            // Pequeno delay para garantir que todas as alterações foram salvas
            setTimeout(() => {
              setMarkupsLoaded(false); // Force reload
            }, 300);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'markups',
          filter: `user_id=eq.${user.id}`
        },
        async (payload) => {
          console.log('🔔 [RECEITAS] Real-time update nos markups:', payload);
          
          // Se um markup foi deletado, verificar se era o selecionado
          if (payload.eventType === 'DELETE' && payload.old) {
            const deletedMarkupId = (payload.old as any).id;
            if (markupSelecionado === deletedMarkupId) {
              console.warn('⚠️ Markup selecionado foi deletado em tempo real');
              setMarkupSelecionado('');
              toast({
                title: "Markup removido",
                description: "O markup selecionado foi removido. Selecione um novo markup.",
                variant: "destructive",
              });
            }
          }
          
          // Forçar recarregamento dos markups
          setMarkupsLoaded(false);
          
          setTimeout(() => {
            setMarkupsLoaded(false); // Force reload
          }, 300);
        }
      )
      .subscribe();

    return () => {
      console.log('🔌 [RECEITAS] Desconectando real-time updates');
      supabase.removeChannel(channel);
    };
  }, [user?.id]);
  
  // Function to format currency
  const formatCurrency = (value: string) => {
    // Remove all non-digits
    const numericValue = value.replace(/\D/g, '');
    
    if (!numericValue) return '';
    
    // Convert to number and divide by 100 to get decimal places
    const number = parseInt(numericValue) / 100;
    
    // Format as Brazilian currency
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(number);
  };
  
  // Function to get numeric value from formatted currency
  const getNumericValue = (formattedValue: string) => {
    const numericValue = formattedValue.replace(/\D/g, '');
    if (!numericValue) return 0;
    return parseInt(numericValue) / 100;
  };
  
  const handlePrecoVendaChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCurrency(e.target.value);
    const numericValue = getNumericValue(formatted);
    
    setPrecoVenda(formatted);
    
    // Sync with parent state
    if (onReceitaDataChange) {
      onReceitaDataChange(prev => ({
        ...prev,
        precoVenda: numericValue
      }));
    }
    
    // Auto-save preço de venda to database when editing
    if (receitaId && user?.id && numericValue !== undefined) {
      try {
        const { error } = await supabase
          .from('receitas')
          .update({ preco_venda: numericValue })
          .eq('id', receitaId)
          .eq('user_id', user.id);
        
        if (error) {
          console.error('Erro ao salvar preço de venda:', error);
        } else {
          console.log('💰 Preço de venda salvo automaticamente:', numericValue);
        }
      } catch (error) {
        console.error('Erro ao salvar preço de venda:', error);
      }
    }
    
    console.log('💰 Preço de venda alterado:', { formatted, numericValue });
  };

  const handlePesoUnitarioChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPesoUnitario(value);
    
    // Sync with parent state
    if (onReceitaDataChange) {
      onReceitaDataChange(prev => ({
        ...prev,
        pesoUnitario: parseFloat(value) || 0
      }));
    }
    
    // Auto-save peso unitário to database when editing
    if (receitaId && user?.id && value) {
      try {
        const { error } = await supabase
          .from('receitas')
          .update({ peso_unitario: parseFloat(value) || 0 })
          .eq('id', receitaId)
          .eq('user_id', user.id);
        
        if (error) {
          console.error('Erro ao salvar peso unitário:', error);
        } else {
          console.log('💪 Peso unitário salvo automaticamente:', value);
        }
      } catch (error) {
        console.error('Erro ao salvar peso unitário:', error);
      }
    }
  };
  
  // Calculate real costs from the recipe data
  const custoIngredientes = receitaData.ingredientes.reduce((total, item) => total + item.custo_total, 0);
  const custoSubReceitas = receitaData.subReceitas.reduce((total, item) => total + item.custo_total, 0);
  const custoEmbalagens = receitaData.embalagens.reduce((total, item) => total + item.custo_total, 0);
  const valorTotalMaoObra = receitaData.maoObra.reduce((total, item) => total + item.valorTotal, 0);
  const custoTotal = custoIngredientes + custoSubReceitas + custoEmbalagens + valorTotalMaoObra;
  
  const { rendimentoValor, rendimentoUnidade } = receitaData;

  // Calculate unit cost based on yield
  const custoUnitario = custoTotal / (parseFloat(rendimentoValor) || 1);
  
  const precoNumerico = getNumericValue(precoVenda);
  const pesoNumerico = parseFloat(pesoUnitario) || 0;
  const precoKg = (precoNumerico && pesoNumerico) 
    ? new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: 2,
      }).format(precoNumerico / (pesoNumerico / 1000))
    : 'R$ 0,00';

  const unidadesRendimento = [
    { value: 'unidade', label: 'Unidade (UN)' },
    { value: 'grama', label: 'Grama (G)' },
    { value: 'k', label: 'Quilo (K)' },
    { value: 'litro', label: 'Litro (L)' },
    { value: 'mililitro', label: 'Mililitro (ML)' },
  ];

  return (
    <TooltipProvider>
      <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
        <div>
          <h3 className="text-lg font-semibold mb-2">Precificação</h3>
          <p className="text-muted-foreground">Analise os custos e defina o preço final do produto</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-medium">Última Atualização</p>
          <p className="text-sm text-muted-foreground">
            {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Resumo de Custos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Ingredientes</span>
              <Badge variant="outline">{formatters.valor(custoIngredientes)}</Badge>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Sub-receitas</span>
              <Badge variant="outline">{formatters.valor(custoSubReceitas)}</Badge>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Embalagens</span>
              <Badge variant="outline">{formatters.valor(custoEmbalagens)}</Badge>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Mão de Obra</span>
              <Badge variant="outline">{formatters.valor(valorTotalMaoObra)}</Badge>
            </div>
            
            <hr className="my-3" />
            
            <div className="flex justify-between items-center">
              <span className="font-medium">Custo Total</span>
              <Badge className="text-base font-bold">{formatters.valor(custoTotal)}</Badge>
            </div>
          </div>

          {rendimentoValor && (
            <div className="pt-3 border-t">
              <div className="space-y-1">
                <Label className="text-sm font-medium">
                  {rendimentoUnidade === 'grama' ? 'Custo por Grama' : 'Custo por Unidade'}
                </Label>
                <p className="text-lg font-bold text-primary">
                  {formatters.valor(custoUnitario)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Baseado no rendimento: {rendimentoValor} {unidadesRendimento.find(u => u.value === rendimentoUnidade)?.label}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pricing Configuration */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Preço de Venda */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Preço de Venda (R$/un.)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Input
              type="text"
              placeholder="R$ 0,00"
              value={precoVenda}
              onChange={handlePrecoVendaChange}
              disabled={markups.find(m => m.id === markupSelecionado)?.tipo === 'sub_receita'}
              className={`text-lg font-medium ${markups.find(m => m.id === markupSelecionado)?.tipo === 'sub_receita' ? 'bg-muted cursor-not-allowed' : ''}`}
            />
            {markups.find(m => m.id === markupSelecionado)?.tipo === 'sub_receita' && (
              <p className="text-xs text-muted-foreground mt-1">
                Preço definido automaticamente pelo markup de sub-receitas. Selecione outro markup para editar.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Peso Unitário */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Weight className="h-4 w-4" />
              Peso Unitário (g)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <NumericInputPtBr
              tipo="quantidade_continua"
              min={0}
              value={parseFloat(pesoUnitario) || 0}
              onChange={(valor) => setPesoUnitario(valor.toString())}
              className="text-lg font-medium"
            />
          </CardContent>
        </Card>

        {/* Preço por KG */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Calculator className="h-4 w-4" />
              Preço por KG
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">
                {precoKg}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Markups Section */}
      {markups.length > 0 && (
        <div className="space-y-4">
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Target className="h-5 w-5" />
              Markups Configurados
            </h3>
            <p className="text-muted-foreground text-sm mb-4">
              Selecione qual markup usar para precificar esta receita. Apenas um markup pode estar ativo por receita.
            </p>
          </div>

          <div className="grid gap-4">
            {/* Filtro adicional durante render para garantir unicidade */}
            {markups.filter((markup, index, self) => 
              index === self.findIndex(m => m.nome === markup.nome)
            ).map((markup) => {
              // Calculate markup based on entered price - use only unit cost from yield
              const markupFinal = precoNumerico > 0 ? precoNumerico / custoUnitario : 0;
              // Calculate suggested price: unit cost × markup da categoria + additional value in R$
              const markupDaCategoria = encargosDetalhados[markup.id]?.markupIdeal || markup.markup_ideal;
              const precoSugerido = (custoUnitario * markupDaCategoria) + (encargosDetalhados[markup.id]?.valorEmReal || 0);
              
              // Debug logs - TEMPORARY
              console.log('DEBUG - Cálculo Sugestão de Preço (CORRIGIDO):', {
                custoUnitario,
                markupDaCategoria,
                markupIdealDB: markup.markup_ideal,
                valorEmReal: encargosDetalhados[markup.id]?.valorEmReal || 0,
                calculoBase: custoUnitario * markupDaCategoria,
                precoSugerido,
                markupFinal: markupFinal.toFixed(4),
                precoNumerico,
                markupNome: markup.nome
              });
              
              // Calculate profit metrics using unit cost (not affected by unit weight)
              const lucroBrutoUnitario = precoNumerico - custoUnitario;
              
              // Lucro Líquido Real = Preço - (Custo + Encargos reais)
              // Usar o "Valor em real" da configuração do markup em vez do preço inserido pelo usuário
              const valorEmRealConfigurado = encargosDetalhados[markup.id]?.valorEmReal || 0;
              const valorParaCalculo = valorEmRealConfigurado > 0 ? valorEmRealConfigurado : precoNumerico;
              const gastosSobreFaturamento = (markup.gasto_sobre_faturamento || 0) / 100 * valorParaCalculo;
              const encargosSobreVenda = (markup.encargos_sobre_venda || 0) / 100 * valorParaCalculo;
              const encargosReaisTotal = gastosSobreFaturamento + encargosSobreVenda;
              const lucroLiquidoReal = precoNumerico - custoUnitario - encargosReaisTotal;
              const faturamentoBruto = precoNumerico;
              
              // Calculate percentages
              const lucroBrutoPercent = precoNumerico > 0 ? (lucroBrutoUnitario / precoNumerico) * 100 : 0;
              const lucroLiquidoPercent = precoNumerico > 0 ? (lucroLiquidoReal / precoNumerico) * 100 : 0;

              const isSelected = markupSelecionado === markup.id;

              return (
                <Card 
                  key={markup.id} 
                  className={`transition-all ${isSelected ? 'ring-2 ring-primary bg-primary/5' : 'bg-muted/20'}`}
                >
                   <CardHeader className="pb-3">
                     <div className="flex justify-between items-center">
                       <div className="flex items-center gap-2">
                         <CardTitle className="text-base capitalize">{markup.nome}</CardTitle>
                         <Tooltip>
                           <TooltipTrigger asChild>
                             <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                           </TooltipTrigger>
            <TooltipContent side="right" className="max-w-sm">
              <div className="space-y-2 text-sm">
                <div className="font-medium">Configurações do Markup:</div>
                <div>• Período: {markup.periodo === '12' ? 'Últimos 12 meses' : 
                                 markup.periodo === '6' ? 'Últimos 6 meses' : 
                                 markup.periodo === '3' ? 'Últimos 3 meses' : 
                                 markup.periodo === '1' ? 'Último mês' : 
                                 markup.periodo === 'todos' ? 'Média de todos os períodos' : `${markup.periodo} meses`}</div>
                
                {encargosDetalhados[markup.id] && (
                  <>
                    <div>• Média de faturamento: R$ {encargosDetalhados[markup.id].mediaFaturamento.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                    <div>• Gasto sobre faturamento: {formatters.percentual(encargosDetalhados[markup.id].gastoSobreFaturamentoCalculado)}</div>
                    
                    <div className="font-medium mt-3">Encargos sobre venda:</div>
                    <div className="pl-2 space-y-1">
                      <div>• Impostos: {formatters.percentual(encargosDetalhados[markup.id].impostos)}</div>
                      <div>• Taxas de meios de pagamento: {formatters.percentual(encargosDetalhados[markup.id].taxas)}</div>
                      <div>• Comissões e plataformas: {formatters.percentual(encargosDetalhados[markup.id].comissoes)}</div>
                      <div>• Outros: {formatters.percentual(encargosDetalhados[markup.id].outros)}</div>
                      <div className="font-medium">• Adicional RS: {formatters.valor(encargosDetalhados[markup.id].valorEmReal || 0)}</div>
                    </div>
                    
                    <div className="font-medium mt-3">Resultado:</div>
                    <div>• Lucro desejado sobre venda: {formatters.percentual(encargosDetalhados[markup.id].lucroDesejado)}</div>
                    <div>• Markup ideal: {encargosDetalhados[markup.id].markupIdeal?.toFixed(4).replace('.', ',')}</div>
                  </>
                )}
                
                {!encargosDetalhados[markup.id] && (
                  <div className="text-muted-foreground text-xs">Carregando dados detalhados...</div>
                )}
              </div>
            </TooltipContent>
                         </Tooltip>
                       </div>
                      <div className="flex gap-2 items-center">
                        <Badge variant={markup.tipo === 'sub_receita' ? 'secondary' : 'outline'}>
                          {markup.tipo === 'sub_receita' ? 'Sub-receita' : 'Normal'}
                        </Badge>
                        <Badge variant="outline">
                          {markup.periodo} meses
                        </Badge>
                        <Button
                          size="sm"
                          variant={isSelected ? "default" : "outline"}
                          onClick={() => salvarMarkupSelecionado(markup.id)}
                          className="ml-2"
                        >
                          {isSelected ? 'Selecionado' : 'Selecionar'}
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-4">
                    {/* Markup Values */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="text-center p-3 bg-background rounded-lg border">
                          <p className="text-sm text-muted-foreground mb-1">Markup da Categoria</p>
                          <p className="text-lg font-bold text-primary">
                            {encargosDetalhados[markup.id]?.markupIdeal ? `${encargosDetalhados[markup.id].markupIdeal.toLocaleString('pt-BR', { 
                              minimumFractionDigits: 4, 
                              maximumFractionDigits: 4 
                            })}` : '1,0000'}
                          </p>
                        </div>
                        
                        <div className="text-center p-3 bg-background rounded-lg border">
                          <p className="text-sm text-muted-foreground mb-1">Markup Final</p>
                          <p className="text-lg font-bold text-secondary">
                            {markupFinal > 0 ? `${markupFinal.toLocaleString('pt-BR', { 
                              minimumFractionDigits: 4, 
                              maximumFractionDigits: 4 
                            })}` : markupDaCategoria ? `${markupDaCategoria.toLocaleString('pt-BR', { 
                              minimumFractionDigits: 4, 
                              maximumFractionDigits: 4
                            })}` : '0,0000'}
                          </p>
                        </div>
                      
                        <div className="text-center p-3 bg-background rounded-lg border">
                          <p className="text-sm text-muted-foreground mb-1">
                            Sugestão de Preço 
                            <span className="text-xs ml-1">(adicional RS {formatters.valor(encargosDetalhados[markup.id]?.valorEmReal || 0)})</span>
                          </p>
                        <p className="text-lg font-bold text-primary">
                          {new Intl.NumberFormat('pt-BR', {
                            style: 'currency',
                            currency: 'BRL'
                          }).format(precoSugerido)}
                        </p>
                      </div>
                    </div>

                    {/* Receitas Table */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-sm font-medium text-primary pb-2 border-b">
                        <span>Receitas</span>
                        <div className="flex gap-8">
                          <span>Valor</span>
                          <span>%</span>
                        </div>
                      </div>
                      
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">Lucro Bruto (un.):</span>
                        <div className="flex gap-8 text-right">
                          <span className="w-20">
                            {new Intl.NumberFormat('pt-BR', {
                              style: 'currency',
                              currency: 'BRL'
                            }).format(lucroBrutoUnitario)}
                          </span>
                          <span className="w-12">{lucroBrutoPercent.toFixed(0)}%</span>
                        </div>
                      </div>
                      
                       <div className="flex justify-between items-center text-sm">
                         <span className="text-muted-foreground">Lucro Líq. Real (un.):</span>
                         <div className="flex gap-8 text-right">
                           <span className="w-20">
                             {new Intl.NumberFormat('pt-BR', {
                               style: 'currency',
                               currency: 'BRL'
                             }).format(lucroLiquidoReal)}
                           </span>
                           <span className="w-12">{lucroLiquidoPercent.toFixed(0)}%</span>
                         </div>
                       </div>
                      
                      <div className="flex justify-between items-center text-sm font-medium pt-2 border-t">
                        <span className="text-primary">Faturamento Bruto (total):</span>
                        <div className="flex gap-8 text-right">
                          <span className="w-20 text-primary font-bold">
                            {new Intl.NumberFormat('pt-BR', {
                              style: 'currency',
                              currency: 'BRL'
                            }).format(faturamentoBruto)}
                          </span>
                          <span className="w-12 text-primary font-bold">100%</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
         </div>
       )}
     </div>
   </TooltipProvider>
   );
}