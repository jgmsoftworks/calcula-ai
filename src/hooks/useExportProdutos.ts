import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

export function useExportProdutos() {
  const exportarProdutos = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Usuário não autenticado');
        return;
      }

      // Buscar todos os produtos do usuário
      const { data: produtos, error } = await supabase
        .from('produtos')
        .select('*')
        .eq('user_id', user.id)
        .eq('ativo', true)
        .order('codigo_interno', { ascending: true });

      if (error) throw error;

      if (!produtos || produtos.length === 0) {
        toast.warning('Nenhum produto para exportar');
        return;
      }

      // Converter dados para formato Excel
      const dadosExcel = produtos.map(p => ({
        nome: p.nome,
        codigo_interno: p.codigo_interno,
        codigos_barras: (p.codigos_barras || []).join(','),
        marcas: (p.marcas || []).join(','),
        categorias: (p.categorias || []).join(','),
        unidade_compra: p.unidade_compra,
        unidade_uso: p.unidade_uso || '',
        fator_conversao: p.fator_conversao || '',
        custo_unitario: p.custo_unitario,
        estoque_atual: p.estoque_atual,
        estoque_minimo: p.estoque_minimo
      }));

      // Criar planilha
      const ws = XLSX.utils.json_to_sheet(dadosExcel);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Produtos');

      // Gerar nome do arquivo com data
      const dataAtual = new Date().toISOString().split('T')[0];
      const nomeArquivo = `estoque_produtos_${dataAtual}.xlsx`;

      // Download
      XLSX.writeFile(wb, nomeArquivo);

      toast.success(`${produtos.length} produtos exportados com sucesso!`);
    } catch (error) {
      console.error('Erro ao exportar produtos:', error);
      toast.error('Erro ao exportar produtos');
    }
  };

  return { exportarProdutos };
}
