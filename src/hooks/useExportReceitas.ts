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
        
        // Lucro bruto sempre calculado
        const lucroBruto = receita.preco_venda - custoBase;

        // Se não houver markup selecionado, retornar apenas lucro bruto
        if (!markupBase) {
          return {
            lucroLiquido: 0,
            sugestaoPreco: 0,
            lucroBruto
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
        
        // Calcular lucro líquido considerando TODOS os custos indiretos - IGUAL ao MarkupCard linha 179-189
        const gastosReais = receita.preco_venda * ((markupDetalhes?.gastoSobreFaturamento ?? 0) / 100);
        const impostosReais = receita.preco_venda * ((markupDetalhes?.impostos ?? 0) / 100);
        const taxasReais = receita.preco_venda * ((markupDetalhes?.taxas ?? 0) / 100);
        const comissoesReais = receita.preco_venda * ((markupDetalhes?.comissoes ?? 0) / 100);
        const outrosReais = receita.preco_venda * ((markupDetalhes?.outros ?? 0) / 100);

        const totalCustosIndiretos = gastosReais + impostosReais + taxasReais + comissoesReais + outrosReais;
        const custosDirectosCompletos = custoBase + valorEmRealBloco;

        // Lucro líquido REAL = Preço - Custos Diretos - Custos Indiretos
        const lucroLiquido = receita.preco_venda - custosDirectosCompletos - totalCustosIndiretos;
        
        return {
          lucroLiquido,
          sugestaoPreco: precoSugerido,
          lucroBruto
        };
      };

      // Converter dados para formato Excel
      const dadosExcel = receitas.map(r => {
        const custoTotal = (r.custo_ingredientes || 0) + 
                          (r.custo_embalagens || 0) + 
                          (r.custo_mao_obra || 0) + 
                          (r.custo_sub_receitas || 0);
        
        const { lucroLiquido, sugestaoPreco, lucroBruto } = calcularSimulacao(r);

        return {
          'Número': r.numero_sequencial,
          'Nome': r.nome,
          'Tipo do Produto': r.tipo_produto?.nome || '',
          'É Sub-receita': r.markup?.tipo === 'sub_receita' ? 'Sim' : 'Não',
          'Rendimento (valor)': r.rendimento_valor || 0,
          'Rendimento (unidade)': r.rendimento_unidade || 'un',
          'Tempo Total (min)': r.tempo_preparo_total || 0,
          'Tempo M.O. (min)': r.tempo_preparo_mao_obra || 0,
          'Qtd Ingredientes': r.total_ingredientes || 0,
          'Qtd Sub-receitas': r.total_sub_receitas || 0,
          'Qtd Embalagens': r.total_embalagens || 0,
          'Custo M.O. (R$)': r.custo_mao_obra || 0,
          'Custo Matéria-Prima (R$)': r.custo_ingredientes || 0,
          'Custo Sub-receitas (R$)': r.custo_sub_receitas || 0,
          'Custo Embalagem (R$)': r.custo_embalagens || 0,
          'Custo Total (R$)': custoTotal,
          'Preço de Venda (R$)': r.preco_venda,
          'Lucro Bruto (R$)': lucroBruto,
          'Lucro Líquido (R$)': lucroLiquido,
          'Sugestão Preço (R$)': (markupDetalhes || markupBase) ? sugestaoPreco : '—'
        };
      });

      // Criar planilha
      const ws = XLSX.utils.json_to_sheet(dadosExcel);
      
      // Aplicar formato contábil brasileiro nas colunas monetárias
      const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
      
      for (let R = range.s.r + 1; R <= range.e.r; ++R) {
        // Colunas L até T (Custo M.O. até Sugestão Preço)
        const colsMonetarias = ['L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T'];
        
        colsMonetarias.forEach(col => {
          const cellAddress = col + (R + 1);
          if (ws[cellAddress] && typeof ws[cellAddress].v === 'number') {
            ws[cellAddress].z = '_-R$ * #,##0.00_-;-R$ * #,##0.00_-;_-R$ * "-"??_-;_-@_-';
          }
        });
      }
      
      // Ajustar largura das colunas
      ws['!cols'] = [
        { wch: 8 },  // Número
        { wch: 25 }, // Nome
        { wch: 15 }, // Tipo
        { wch: 12 }, // Sub-receita
        { wch: 12 }, // Rendimento valor
        { wch: 15 }, // Rendimento unidade
        { wch: 12 }, // Tempo Total
        { wch: 12 }, // Tempo M.O.
        { wch: 12 }, // Qtd Ingredientes
        { wch: 12 }, // Qtd Sub-receitas
        { wch: 12 }, // Qtd Embalagens
        { wch: 15 }, // Custo M.O.
        { wch: 18 }, // Custo Matéria-Prima
        { wch: 18 }, // Custo Sub-receitas
        { wch: 18 }, // Custo Embalagem
        { wch: 15 }, // Custo Total
        { wch: 15 }, // Preço de Venda
        { wch: 15 }, // Lucro Bruto
        { wch: 15 }, // Lucro Líquido
        { wch: 15 }  // Sugestão Preço
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
