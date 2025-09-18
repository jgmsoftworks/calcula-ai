import { useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useOptimizedUserConfigurations } from '@/hooks/useOptimizedUserConfigurations';
import { supabase } from '@/integrations/supabase/client';

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

export function useMarkupInitializer() {
  const { user } = useAuth();
  const { loadConfiguration } = useOptimizedUserConfigurations();
  const isInitializing = useRef(false);

  const categoriasMap = {
    'impostos': new Set(['ICMS', 'ISS', 'PIS/COFINS', 'IRPJ/CSLL', 'IPI']),
    'meios_pagamento': new Set(['Cartão de débito', 'Cartão de crédito', 'Boleto bancário', 'PIX', 'Gateway de pagamento']),
    'comissoes': new Set(['Marketing', 'Aplicativo de delivery', 'Plataforma SaaS', 'Colaboradores (comissão)'])
  };

  const getCategoriaByNome = useCallback((nome: string): 'impostos' | 'meios_pagamento' | 'comissoes' | 'outros' => {
    if (categoriasMap.impostos.has(nome)) return 'impostos';
    if (categoriasMap.meios_pagamento.has(nome)) return 'meios_pagamento';
    if (categoriasMap.comissoes.has(nome)) return 'comissoes';
    return 'outros';
  }, []);

  const calcularMarkupIdeal = useCallback((bloco: MarkupBlock, calculated: CalculatedMarkup) => {
    const totalEncargos = calculated.gastoSobreFaturamento + calculated.impostos + calculated.taxasMeiosPagamento + calculated.comissoesPlataformas + calculated.outros;
    const totalPercentuais = totalEncargos + bloco.lucroDesejado;
    
    const margemFinal = totalPercentuais === 0 ? 20 : totalPercentuais;
    const markup = 100 / (100 - margemFinal);
    
    return isFinite(markup) && markup > 1 ? markup : 1.25;
  }, []);

  const inicializarMarkups = useCallback(async () => {
    if (!user?.id || isInitializing.current) return;

    try {
      isInitializing.current = true;
      console.log('🚀 [MARKUP INITIALIZER] Inicializando markups automaticamente...');

      // Carregar blocos de markups
      const configBlocos = await loadConfiguration('markups_blocos');
      const blocos: MarkupBlock[] = (configBlocos && Array.isArray(configBlocos)) ? configBlocos as MarkupBlock[] : [];

      if (blocos.length === 0) {
        console.log('📦 [MARKUP INITIALIZER] Nenhum bloco encontrado');
        return;
      }

      console.log(`📦 [MARKUP INITIALIZER] ${blocos.length} blocos encontrados`);

      // Buscar dados base uma só vez
      const [
        { data: despesasFixas }, 
        { data: folhaPagamento }, 
        { data: encargosVenda },
        faturamentosConfig
      ] = await Promise.all([
        supabase.from('despesas_fixas').select('*').eq('user_id', user.id).eq('ativo', true),
        supabase.from('folha_pagamento').select('*').eq('user_id', user.id).eq('ativo', true),
        supabase.from('encargos_venda').select('*').eq('user_id', user.id).eq('ativo', true),
        loadConfiguration('faturamentos_historicos')
      ]);

      const todosFaturamentos = (faturamentosConfig && Array.isArray(faturamentosConfig))
        ? faturamentosConfig.map((f: any) => ({ ...f, mes: new Date(f.mes) }))
        : [];

      console.log(`💰 [MARKUP INITIALIZER] Dados base carregados:`, {
        despesas: despesasFixas?.length || 0,
        folha: folhaPagamento?.length || 0,
        encargos: encargosVenda?.length || 0,
        faturamentos: todosFaturamentos.length
      });

      // Processar cada bloco
      for (const bloco of blocos) {
        const configKey = `checkbox-states-${bloco.id}`;
        const config = await loadConfiguration(configKey);

        if (!config || typeof config !== 'object') {
          console.log(`⚠️ [MARKUP INITIALIZER] Sem configuração para ${bloco.nome}`);
          continue;
        }

        // Calcular valor de faturamento baseado no período do bloco
        let valorFaturamento = 0;
        const periodoSelecionado = bloco.id === 'subreceita-fixo' ? 'todos' : (bloco.periodo || '12');
        
        if (periodoSelecionado === 'todos') {
          if (todosFaturamentos.length > 0) {
            const totalFaturamentos = todosFaturamentos.reduce((acc: number, f: any) => acc + f.valor, 0);
            valorFaturamento = totalFaturamentos / todosFaturamentos.length;
          }
        } else {
          const mesesAtras = parseInt(String(periodoSelecionado), 10);
          const dataLimite = new Date();
          dataLimite.setMonth(dataLimite.getMonth() - mesesAtras);

          const faturamentosFiltrados = todosFaturamentos.filter((f: any) => f.mes >= dataLimite);
          
          if (faturamentosFiltrados.length > 0) {
            const total = faturamentosFiltrados.reduce((acc: number, f: any) => acc + f.valor, 0);
            valorFaturamento = total / faturamentosFiltrados.length;
          }
        }

        // Calcular gastos sobre faturamento
        let gastosSobreFaturamento = 0;
        
        const despesasConsideradas = despesasFixas ? despesasFixas.filter(d => config[d.id] && d.ativo) : [];
        const totalDespesasFixas = despesasConsideradas.reduce((acc, despesa) => acc + Number(despesa.valor), 0);
        
        const folhaConsiderada = folhaPagamento ? folhaPagamento.filter(f => config[f.id] && f.ativo) : [];
        const totalFolhaPagamento = folhaConsiderada.reduce((acc, funcionario) => {
          const custoMensal = funcionario.custo_por_hora > 0 
            ? funcionario.custo_por_hora * (funcionario.horas_totais_mes || 173.2)
            : funcionario.salario_base;
          return acc + Number(custoMensal);
        }, 0);
        
        const totalGastos = totalDespesasFixas + totalFolhaPagamento;
        
        if (valorFaturamento > 0 && totalGastos > 0) {
          gastosSobreFaturamento = (totalGastos / valorFaturamento) * 100;
        }

        // Calcular encargos
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

        // Salvar no banco
        const despesasFixasSelecionadas = despesasFixas ? despesasFixas.filter(d => config[d.id]).map(d => d.id) : [];
        const folhaPagamentoSelecionada = folhaPagamento ? folhaPagamento.filter(f => config[f.id]).map(f => f.id) : [];
        const encargosVendaSelecionados = encargosVenda ? encargosVenda.filter(e => config[e.id]).map(e => e.id) : [];

        const markupData = {
          user_id: user.id,
          nome: bloco.nome,
          tipo: bloco.nome.toLowerCase().includes('sub') ? 'sub_receita' : 'normal',
          periodo: bloco.periodo,
          margem_lucro: bloco.lucroDesejado,
          gasto_sobre_faturamento: categorias.gastoSobreFaturamento,
          encargos_sobre_venda: categorias.impostos + categorias.taxasMeiosPagamento + categorias.comissoesPlataformas + categorias.outros,
          markup_ideal: calcularMarkupIdeal(bloco, categorias),
          markup_aplicado: calcularMarkupIdeal(bloco, categorias),
          preco_sugerido: categorias.valorEmReal,
          despesas_fixas_selecionadas: despesasFixasSelecionadas,
          folha_pagamento_selecionada: folhaPagamentoSelecionada,
          encargos_venda_selecionados: encargosVendaSelecionados,
          ativo: true
        };

        console.log(`💾 [MARKUP INITIALIZER] Salvando ${bloco.nome}:`, markupData);

        // Primeiro, deletar markup existente com mesmo nome
        await supabase
          .from('markups')
          .delete()
          .eq('user_id', user.id)
          .eq('nome', bloco.nome);

        // Depois inserir o novo
        await supabase
          .from('markups')
          .insert(markupData);

        // Salvar configuração individual para o tooltip
        const configIndividual = {
          periodo: bloco.periodo,
          gastoSobreFaturamento: categorias.gastoSobreFaturamento,
          impostos: categorias.impostos,
          taxas: categorias.taxasMeiosPagamento,
          comissoes: categorias.comissoesPlataformas,
          outros: categorias.outros,
          valorEmReal: categorias.valorEmReal
        };

        const tooltipConfigKey = `markup_${bloco.nome.toLowerCase().replace(/\s+/g, '_')}`;
        await supabase
          .from('user_configurations')
          .upsert({
            user_id: user.id,
            type: tooltipConfigKey,
            configuration: configIndividual
          });
        
        console.log(`💾 [MARKUP INITIALIZER] Configuração individual salva para tooltip: ${tooltipConfigKey}`, configIndividual);

        // Também sincronizar com user_configurations para manter consistência
        const blocosConfig = await loadConfiguration('markups_blocos') || [];
        const blocoIndex = blocosConfig.findIndex((b: any) => b.nome === bloco.nome);
        
        if (blocoIndex >= 0) {
          // Atualizar bloco existente com valores calculados
          blocosConfig[blocoIndex] = {
            ...blocosConfig[blocoIndex],
            gastoSobreFaturamento: categorias.gastoSobreFaturamento,
            impostos: categorias.impostos,
            taxasMeiosPagamento: categorias.taxasMeiosPagamento,
            comissoesPlataformas: categorias.comissoesPlataformas,
            outros: categorias.outros,
            valorEmReal: categorias.valorEmReal
          };

          // Salvar configuração atualizada
          await supabase
            .from('user_configurations')
            .upsert({
              user_id: user.id,
              type: 'markups_blocos',
              configuration: blocosConfig
            });
          
          console.log(`🔄 [MARKUP INITIALIZER] Sincronizado ${bloco.nome} com user_configurations`);
        }
      }

      console.log('✅ [MARKUP INITIALIZER] Markups inicializados com sucesso!');
    } catch (error) {
      console.error('❌ [MARKUP INITIALIZER] Erro ao inicializar markups:', error);
    } finally {
      isInitializing.current = false;
    }
  }, [user?.id, loadConfiguration, getCategoriaByNome, calcularMarkupIdeal]);

  // Executar quando o usuário logar
  useEffect(() => {
    if (user?.id) {
      console.log('👤 [MARKUP INITIALIZER] Usuário logado, inicializando markups...');
      // Pequeno delay para garantir que outras configurações já foram carregadas
      setTimeout(() => {
        inicializarMarkups();
      }, 1000);
    }
  }, [user?.id, inicializarMarkups]);

  return { inicializarMarkups };
}