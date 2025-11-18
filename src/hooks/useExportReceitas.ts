import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import type { ReceitaComDados } from '@/types/receitas';

export function useExportReceitas() {
  const exportarReceitas = async (receitas: ReceitaComDados[]) => {
    try {
      if (!receitas || receitas.length === 0) {
        toast.warning('Nenhuma receita para exportar');
        return;
      }

      // Converter dados para formato Excel
      const dadosExcel = receitas.map(r => {
        const custoTotal = (r.custo_ingredientes || 0) + 
                          (r.custo_embalagens || 0) + 
                          (r.custo_mao_obra || 0) + 
                          (r.custo_sub_receitas || 0);
        
        const margem = r.preco_venda - custoTotal;
        const margemPercentual = custoTotal > 0 ? (margem / r.preco_venda) * 100 : 0;

        return {
          'Número': r.numero_sequencial,
          'Status': r.status === 'finalizada' ? 'Finalizada' : 'Rascunho',
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
          'Custo M.O. (R$)': (r.custo_mao_obra || 0).toFixed(2),
          'Custo Matéria-Prima (R$)': (r.custo_ingredientes || 0).toFixed(2),
          'Custo Embalagem (R$)': (r.custo_embalagens || 0).toFixed(2),
          'Custo Total (R$)': custoTotal.toFixed(2),
          'Preço de Venda (R$)': r.preco_venda.toFixed(2),
          'Margem Contribuição (R$)': margem.toFixed(2),
          'Lucro Líquido (%)': margemPercentual.toFixed(1)
        };
      });

      // Criar planilha
      const ws = XLSX.utils.json_to_sheet(dadosExcel);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Receitas');

      // Gerar nome do arquivo com data
      const dataAtual = new Date().toISOString().split('T')[0];
      const nomeArquivo = `receitas_${dataAtual}.xlsx`;

      // Download
      XLSX.writeFile(wb, nomeArquivo);

      toast.success(`${receitas.length} receitas exportadas com sucesso!`);
    } catch (error) {
      console.error('Erro ao exportar receitas:', error);
      toast.error('Erro ao exportar receitas');
    }
  };

  return { exportarReceitas };
}
