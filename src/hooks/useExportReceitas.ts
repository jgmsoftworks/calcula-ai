import { useState } from 'react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import type { ReceitaComDados } from '@/types/receitas';

export function useExportReceitas() {
  const { user } = useAuth();
  const [exporting, setExporting] = useState(false);

  const exportarReceitas = async (
    receitas: ReceitaComDados[],
    markupId?: string | null,
    markupNome?: string | null
  ) => {
    setExporting(true);
    try {
      if (!receitas || receitas.length === 0) {
        toast.warning('Nenhuma receita para exportar');
        setExporting(false);
        return;
      }

      // Buscar configuração do markup se selecionado
      let markupDetalhes: any = null;
      let markupBase: any = null;
      if (markupId && markupNome && user) {
        const configKey = `markup_${markupNome.toLowerCase().replace(/\s+/g, '_')}`;
        const [{ data: configData }, { data: markupData }] = await Promise.all([
          supabase
            .from('user_configurations')
            .select('configuration')
            .eq('user_id', user.id)
            .eq('type', configKey)
            .maybeSingle(),
          supabase
            .from('markups')
            .select('id, nome, tipo, markup_ideal, margem_lucro')
            .eq('id', markupId)
            .maybeSingle(),
        ]);

        if (configData?.configuration) {
          markupDetalhes = configData.configuration;
        }

        if (markupData) {
          markupBase = markupData;
        }
      }

      // Função para calcular simulação de preços (EXATAMENTE igual ao MarkupCard.tsx)
      const calcularSimulacao = (receita: ReceitaComDados) => {
        const custoTotal = (receita.custo_ingredientes || 0) + 
                          (receita.custo_embalagens || 0) + 
                          (receita.custo_mao_obra || 0) + 
                          (receita.custo_sub_receitas || 0);

        // Determinar o custo base (unitário ou total) - IGUAL ao MarkupCard linha 146-154
        let custoBase: number;
        
        // Se NÃO for markup de sub-receita E tiver rendimento, calcular custo unitário
        if (receita.markup?.tipo !== 'sub_receita' && receita.rendimento_valor && receita.rendimento_valor > 0) {
          custoBase = custoTotal / receita.rendimento_valor;
        } else {
          // Markup de sub-receita OU sem rendimento = usar custo total
          custoBase = custoTotal;
        }
        
        // Se não houver markup selecionado, retornar zeros
        if (!markupBase) {
          return {
            lucroLiquido: 0,
            sugestaoPreco: 0,
            lucroBruto: 0
          };
        }
        
        // Valor em Real do bloco (taxa fixa por venda) - MarkupCard linha 135
        const valorEmRealBloco = markupDetalhes?.valorEmReal ?? 0;
        
        // Pegar os percentuais do bloco - IGUAL ao MarkupCard linha 138-143
        const totalPercentuais = (markupDetalhes?.gastoSobreFaturamento ?? 0) + 
                                (markupDetalhes?.impostos ?? 0) + 
                                (markupDetalhes?.taxas ?? 0) + 
                                (markupDetalhes?.comissoes ?? 0) + 
                                (markupDetalhes?.outros ?? 0) + 
                                (markupDetalhes?.lucroDesejado ?? markupBase.margem_lucro);

        let precoSugerido: number;
        let baseCalculo: number;

        // CASO 1: COM "Valor em Real" - IGUAL ao MarkupCard linha 160-163
        if (valorEmRealBloco > 0) {
          baseCalculo = custoBase + valorEmRealBloco;
          const divisor = 1 - (totalPercentuais / 100);
          precoSugerido = divisor > 0 ? baseCalculo / divisor : baseCalculo * 2;
        } 
        // CASO 2: SEM "Valor em Real" - IGUAL ao MarkupCard linha 166-168
        else {
          baseCalculo = custoBase;
          precoSugerido = custoBase * markupBase.markup_ideal;
        }
        
        // Lucro bruto baseado na SUGESTÃO de preço (não no preço atual)
        const lucroBruto = precoSugerido - custoBase;
        
        // Calcular lucro líquido baseado na SUGESTÃO de preço
        const gastosReais = precoSugerido * ((markupDetalhes?.gastoSobreFaturamento ?? 0) / 100);
        const impostosReais = precoSugerido * ((markupDetalhes?.impostos ?? 0) / 100);
        const taxasReais = precoSugerido * ((markupDetalhes?.taxas ?? 0) / 100);
        const comissoesReais = precoSugerido * ((markupDetalhes?.comissoes ?? 0) / 100);
        const outrosReais = precoSugerido * ((markupDetalhes?.outros ?? 0) / 100);

        const totalCustosIndiretos = gastosReais + impostosReais + taxasReais + comissoesReais + outrosReais;
        const custosDirectosCompletos = custoBase + valorEmRealBloco;

        // Lucro líquido = Preço Sugerido - Custos Diretos - Custos Indiretos
        const lucroLiquido = precoSugerido - custosDirectosCompletos - totalCustosIndiretos;
        
        return {
          lucroLiquido,
          sugestaoPreco: precoSugerido,
          lucroBruto
        };
      };

      // Pegar o lucro desejado para o título da coluna
      const lucroDesejado = markupDetalhes?.lucroDesejado ?? markupBase?.margem_lucro ?? 0;
      const tituloSugestao = (markupDetalhes || markupBase) 
        ? `Sugestão Preço (${lucroDesejado}% lucro)` 
        : 'Sugestão Preço (R$)';

      // Função para buscar detalhes do markup DA RECEITA (não do modal)
      const buscarMarkupDaReceita = async (receita: ReceitaComDados): Promise<any> => {
        if (!receita.markup || !user) return null;
        
        const configKey = `markup_${receita.markup.nome.toLowerCase().replace(/\s+/g, '_')}`;
        const { data: configData } = await supabase
          .from('user_configurations')
          .select('configuration')
          .eq('user_id', user.id)
          .eq('type', configKey)
          .maybeSingle();
        
        return configData?.configuration || null;
      };

      // Converter dados para formato Excel (async para buscar markup de cada receita)
      const dadosExcel = await Promise.all(receitas.map(async (r) => {
        const custoTotal = (r.custo_ingredientes || 0) + 
                          (r.custo_embalagens || 0) + 
                          (r.custo_mao_obra || 0) + 
                          (r.custo_sub_receitas || 0);
        
        const { lucroLiquido, sugestaoPreco, lucroBruto } = calcularSimulacao(r);

        // Custo unitário para calcular lucros do preço atual
        let custoBase: number;
        if (r.markup?.tipo !== 'sub_receita' && r.rendimento_valor && r.rendimento_valor > 0) {
          custoBase = custoTotal / r.rendimento_valor;
        } else {
          custoBase = custoTotal;
        }

        // Lucros baseados no preço de venda ATUAL + markup DA RECEITA
        const lucroBrutoAtual = (r.preco_venda || 0) - custoBase;
        
        // Buscar configuração do markup DA RECEITA (não do modal)
        const markupReceitaDetalhes = await buscarMarkupDaReceita(r);
        
        // Lucro líquido atual considera custos indiretos do markup DA RECEITA
        let lucroLiquidoAtual = lucroBrutoAtual;
        if (markupReceitaDetalhes) {
          const valorEmRealBloco = markupReceitaDetalhes?.valorEmReal ?? 0;
          const gastosReais = (r.preco_venda || 0) * ((markupReceitaDetalhes?.gastoSobreFaturamento ?? 0) / 100);
          const impostosReais = (r.preco_venda || 0) * ((markupReceitaDetalhes?.impostos ?? 0) / 100);
          const taxasReais = (r.preco_venda || 0) * ((markupReceitaDetalhes?.taxas ?? 0) / 100);
          const comissoesReais = (r.preco_venda || 0) * ((markupReceitaDetalhes?.comissoes ?? 0) / 100);
          const outrosReais = (r.preco_venda || 0) * ((markupReceitaDetalhes?.outros ?? 0) / 100);
          const totalCustosIndiretos = gastosReais + impostosReais + taxasReais + comissoesReais + outrosReais;
          lucroLiquidoAtual = (r.preco_venda || 0) - custoBase - valorEmRealBloco - totalCustosIndiretos;
        }

        return {
          'Número': r.numero_sequencial,
          'Nome': r.nome,
          'Tipo do Produto': r.tipo_produto?.nome || '',
          'É Sub-receita': r.markup?.tipo === 'sub_receita' ? 'Sim' : 'Não',
          'Rendimento (valor)': r.rendimento_valor || 0,
          'Rendimento (unidade)': r.rendimento_unidade || 'un',
          'Custo Total (R$)': custoTotal,
          'Preço de Venda (R$)': r.preco_venda,
          'Lucro Bruto Atual (R$)': lucroBrutoAtual,
          'Lucro Líquido Atual (R$)': lucroLiquidoAtual,
          [tituloSugestao]: (markupDetalhes || markupBase) ? sugestaoPreco : '—',
          'Lucro Bruto (R$)': lucroBruto,
          'Lucro Líquido (R$)': lucroLiquido
        };
      }));

      // Criar planilha
      const ws = XLSX.utils.json_to_sheet(dadosExcel);
      
      // Aplicar formato contábil brasileiro nas colunas monetárias
      const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
      
      for (let R = range.s.r + 1; R <= range.e.r; ++R) {
        // Colunas G até M (Custo Total até Lucro Líquido)
        const colsMonetarias = ['G', 'H', 'I', 'J', 'K', 'L', 'M'];
        
        colsMonetarias.forEach(col => {
          const cellAddress = col + (R + 1);
          if (ws[cellAddress] && typeof ws[cellAddress].v === 'number') {
            ws[cellAddress].z = '_-R$ * #,##0.00_-;-R$ * #,##0.00_-;_-R$ * "-"??_-;_-@_-';
          }
        });
      }
      
      // Ajustar largura das colunas
      ws['!cols'] = [
        { wch: 8 },   // Número
        { wch: 25 },  // Nome
        { wch: 15 },  // Tipo
        { wch: 12 },  // Sub-receita
        { wch: 12 },  // Rendimento valor
        { wch: 15 },  // Rendimento unidade
        { wch: 15 },  // Custo Total
        { wch: 15 },  // Preço de Venda
        { wch: 18 },  // Lucro Bruto Atual
        { wch: 18 },  // Lucro Líquido Atual
        { wch: 25 },  // Sugestão Preço (XX% lucro)
        { wch: 15 },  // Lucro Bruto
        { wch: 15 }   // Lucro Líquido
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Receitas');

      // Gerar nome do arquivo com data
      const dataAtual = new Date().toISOString().split('T')[0];
      const nomeArquivo = `receitas_${dataAtual}.xlsx`;

      // Download
      XLSX.writeFile(wb, nomeArquivo);

      const mensagem = markupNome 
        ? `${receitas.length} receitas exportadas com simulação de markup "${markupNome}"!`
        : `${receitas.length} receitas exportadas com sucesso!`;

      toast.success(mensagem);
    } catch (error) {
      console.error('Erro ao exportar receitas:', error);
      toast.error('Erro ao exportar receitas');
    } finally {
      setExporting(false);
    }
  };

  return { exportarReceitas, exporting };
}
