import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useOptimizedUserConfigurations } from './useOptimizedUserConfigurations';

interface MarkupCalculation {
  gastoSobreFaturamento: number;
  impostos: number;
  taxasMeiosPagamento: number;
  comissoesPlataformas: number;
  outros: number;
  valorEmReal: number;
}

interface MarkupBlock {
  id: string;
  nome: string;
  lucroDesejado: number;
}

export function useMarkupCalculations() {
  const { user } = useAuth();
  const { loadConfiguration } = useOptimizedUserConfigurations();
  const [calculations, setCalculations] = useState<Map<string, MarkupCalculation>>(new Map());
  const [loading, setLoading] = useState(false);

  // Categorias para classificação dos encargos
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

  const calculateMarkupForBlock = useCallback(async (block: MarkupBlock): Promise<MarkupCalculation> => {
    if (!user?.id) {
      return {
        gastoSobreFaturamento: 0,
        impostos: 0,
        taxasMeiosPagamento: 0,
        comissoesPlataformas: 0,
        outros: 0,
        valorEmReal: 0
      };
    }

    // Para a subreceita, retornar valores de exemplo/demonstração
    if (block.id === 'subreceita-fixo') {
      return {
        gastoSobreFaturamento: 25,
        impostos: 35,
        taxasMeiosPagamento: 10,
        comissoesPlataformas: 20,
        outros: 15,
        valorEmReal: 200
      };
    }

    try {
      // 1. Carregar período selecionado para este bloco
      const periodoSelecionado = await loadConfiguration(`filtro-periodo-${block.id}`) || '12';
      
      // 2. Carregar configurações de itens selecionados
      let checkboxStates = await loadConfiguration(`checkbox-states-${block.id}`) || {};
      
      // 3. Carregar dados necessários
      const [
        { data: despesasFixas },
        { data: folhaPagamento },
        { data: encargosVenda }
      ] = await Promise.all([
        supabase.from('despesas_fixas').select('*').eq('user_id', user.id).eq('ativo', true),
        supabase.from('folha_pagamento').select('*').eq('user_id', user.id).eq('ativo', true),
        supabase.from('encargos_venda').select('*').eq('user_id', user.id).eq('ativo', true)
      ]);

      // Para subreceita, se não há configuração salva, selecionar todos os itens por padrão
      if (block.id === 'subreceita-fixo' && Object.keys(checkboxStates).length === 0) {
        // Definir todos como selecionados
        checkboxStates = {};
        [...(despesasFixas || []), ...(folhaPagamento || []), ...(encargosVenda || [])].forEach(item => {
          checkboxStates[item.id] = true;
        });
      }

      // 4. Carregar faturamentos e calcular média do período
      const faturamentosConfig = await loadConfiguration('faturamentos_historicos');
      const todosFaturamentos = (faturamentosConfig && Array.isArray(faturamentosConfig))
        ? faturamentosConfig.map((f: any) => ({ ...f, mes: new Date(f.mes) }))
        : [];

      let faturamentosFiltrados = todosFaturamentos;
      if (periodoSelecionado !== 'todos') {
        const mesesAtras = parseInt(periodoSelecionado, 10);
        const dataLimite = new Date();
        dataLimite.setMonth(dataLimite.getMonth() - mesesAtras);
        faturamentosFiltrados = todosFaturamentos.filter((f: any) => f.mes >= dataLimite);
      }

      const mediaMensal = faturamentosFiltrados.length > 0
        ? faturamentosFiltrados.reduce((acc: number, f: any) => acc + f.valor, 0) / faturamentosFiltrados.length
        : 0;

      // 5. Calcular gastos fixos
      const despesasConsideradas = (despesasFixas || []).filter(d => checkboxStates[d.id]);
      const folhaConsiderada = (folhaPagamento || []).filter(f => checkboxStates[f.id]);

      const totalDespesasFixas = despesasConsideradas.reduce((acc, despesa) => acc + Number(despesa.valor), 0);
      const totalFolhaPagamento = folhaConsiderada.reduce((acc, funcionario) => {
        const custoMensal = funcionario.custo_por_hora > 0 
          ? funcionario.custo_por_hora * (funcionario.horas_totais_mes || 173.2)
          : funcionario.salario_base;
        return acc + Number(custoMensal);
      }, 0);

      const totalGastos = totalDespesasFixas + totalFolhaPagamento;
      const gastoSobreFaturamento = (mediaMensal > 0 && totalGastos > 0) 
        ? (totalGastos / mediaMensal) * 100 
        : 0;

      // 6. Calcular encargos por categoria
      const encargosConsiderados = (encargosVenda || []).filter(e => checkboxStates[e.id]);
      const valorEmReal = encargosConsiderados.reduce((acc, encargo) => acc + Number(encargo.valor_fixo || 0), 0);
      
      const resultado = encargosConsiderados.reduce((acc, encargo) => {
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
        gastoSobreFaturamento: Math.round(gastoSobreFaturamento * 100) / 100,
        impostos: 0,
        taxasMeiosPagamento: 0,
        comissoesPlataformas: 0,
        outros: 0,
        valorEmReal
      });

      return resultado;
    } catch (error) {
      console.error(`Erro ao calcular markup para bloco ${block.id}:`, error);
      return {
        gastoSobreFaturamento: 0,
        impostos: 0,
        taxasMeiosPagamento: 0,
        comissoesPlataformas: 0,
        outros: 0,
        valorEmReal: 0
      };
    }
  }, [user?.id, loadConfiguration, getCategoriaByNome]);

  const recalculateAllMarkups = useCallback(async (blocks: MarkupBlock[]) => {
    setLoading(true);
    try {
      const newCalculations = new Map<string, MarkupCalculation>();
      
      for (const block of blocks) {
        const calculation = await calculateMarkupForBlock(block);
        newCalculations.set(block.id, calculation);
      }
      
      setCalculations(newCalculations);
    } catch (error) {
      console.error('Erro ao recalcular markups:', error);
    } finally {
      setLoading(false);
    }
  }, [calculateMarkupForBlock]);

  return {
    calculations,
    loading,
    calculateMarkupForBlock,
    recalculateAllMarkups
  };
}