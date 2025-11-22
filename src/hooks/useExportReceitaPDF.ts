import { useState } from 'react';
import jsPDF from 'jspdf';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatNumber } from '@/lib/formatters';

interface ConservacaoData {
  congelado?: { temperatura?: string; tempo?: string };
  refrigerado?: { temperatura?: string; tempo?: string };
  ambiente?: { temperatura?: string; tempo?: string };
}

export function useExportReceitaPDF() {
  const [exporting, setExporting] = useState(false);

  const formatQuantidade = (quantidade: number): string => {
    return formatNumber(quantidade, 2);
  };

  const exportarReceitaPDF = async (receitaId: string) => {
    try {
      setExporting(true);

      // Buscar dados do usuário e perfil
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data: profile } = await supabase
        .from('profiles')
        .select('business_name, cnpj_cpf, phone, telefone_comercial, logo_empresa_url')
        .eq('user_id', user.id)
        .single();

      // Buscar receita completa
      const { data: receita, error: receitaError } = await supabase
        .from('receitas')
        .select(`
          *,
          receita_ingredientes (
            id,
            quantidade,
            produto_id,
            produtos (
              nome,
              unidade_uso,
              unidade_compra,
              marcas
            )
          ),
        receita_sub_receitas!receita_sub_receitas_receita_id_fkey (
          id,
          quantidade,
          sub_receita:receitas!receita_sub_receitas_sub_receita_id_fkey (
            nome,
            rendimento_unidade
          )
        ),
          receita_embalagens (
            id,
            quantidade,
            produto_id,
            produtos (
              nome,
              unidade_uso,
              unidade_compra,
              marcas
            )
          ),
          receita_passos_preparo (
            ordem,
            descricao
          ),
          tipos_produto (
            nome
          )
        `)
        .eq('id', receitaId)
        .single();

      if (receitaError) throw receitaError;
      if (!receita) throw new Error('Receita não encontrada');

      // Criar PDF
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      let currentY = 20;

      // Cabeçalho - Nome da Receita
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text(receita.nome, pageWidth / 2, currentY, { align: 'center' });
      currentY += 10;

      // Linha separadora
      doc.setLineWidth(0.5);
      doc.line(20, currentY, pageWidth - 20, currentY);
      currentY += 10;

      // Seção Dados
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Dados:', 20, currentY);
      currentY += 7;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      
      if (receita.tipos_produto?.nome) {
        doc.text(`Tipo do Produto: ${receita.tipos_produto.nome}`, 25, currentY);
        currentY += 5;
      }
      
      if (receita.rendimento_valor && receita.rendimento_unidade) {
        doc.text(
          `Rendimento: ${formatQuantidade(receita.rendimento_valor)} ${receita.rendimento_unidade}`,
          25,
          currentY
        );
        currentY += 5;
      }

      if (receita.peso_unitario) {
        doc.text(`Peso unitário: ${formatQuantidade(receita.peso_unitario)} g`, 25, currentY);
        currentY += 5;
      }

      currentY += 5;

      // Seção Conservação (se existir)
      if (receita.conservacao) {
        const conservacao = receita.conservacao as ConservacaoData;
        
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Conservação:', 20, currentY);
        currentY += 7;

        // Tabela de conservação
        const conservacaoData = [];
        if (conservacao.congelado) {
          conservacaoData.push([
            'Congelado',
            conservacao.congelado.temperatura || '-',
            conservacao.congelado.tempo || '-'
          ]);
        }
        if (conservacao.refrigerado) {
          conservacaoData.push([
            'Refrigerado',
            conservacao.refrigerado.temperatura || '-',
            conservacao.refrigerado.tempo || '-'
          ]);
        }
        if (conservacao.ambiente) {
          conservacaoData.push([
            'Ambiente',
            conservacao.ambiente.temperatura || '-',
            conservacao.ambiente.tempo || '-'
          ]);
        }

        if (conservacaoData.length > 0) {
          const tableStartY = currentY;
          const colWidths = [50, 50, 50];
          const headers = ['Local', 'Temp. °C', 'Tempo'];

          // Cabeçalho da tabela
          doc.setFillColor(240, 240, 240);
          doc.rect(20, tableStartY, colWidths[0] + colWidths[1] + colWidths[2], 7, 'F');
          doc.setFontSize(9);
          doc.setFont('helvetica', 'bold');
          doc.text(headers[0], 22, tableStartY + 5);
          doc.text(headers[1], 22 + colWidths[0], tableStartY + 5);
          doc.text(headers[2], 22 + colWidths[0] + colWidths[1], tableStartY + 5);
          currentY = tableStartY + 7;

          // Linhas da tabela
          doc.setFont('helvetica', 'normal');
          conservacaoData.forEach((row) => {
            doc.rect(20, currentY, colWidths[0] + colWidths[1] + colWidths[2], 7);
            doc.text(row[0], 22, currentY + 5);
            doc.text(row[1], 22 + colWidths[0], currentY + 5);
            doc.text(row[2], 22 + colWidths[0] + colWidths[1], currentY + 5);
            currentY += 7;
          });

          currentY += 5;
        }
      }

      // Função auxiliar para criar tabelas de itens
      const createItemTable = (
        title: string,
        items: any[],
        getItemData: (item: any) => { nome: string; unidade: string; marcas: string }
      ) => {
        if (items.length === 0) return;

        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(title, 20, currentY);
        currentY += 7;

        // Cabeçalho da tabela
        const colWidths = [50, 15, 25, 25, 25, 25];
        const tableStartY = currentY;

        doc.setFillColor(240, 240, 240);
        doc.rect(20, tableStartY, colWidths.reduce((a, b) => a + b), 7, 'F');
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');

        let xPos = 22;
        const headers = ['Ingrediente', 'Un.', 'Marcas', '1 Receita', '2 Receitas', '3 Receitas'];
        headers.forEach((header, i) => {
          doc.text(header, xPos, tableStartY + 5);
          xPos += colWidths[i];
        });

        currentY = tableStartY + 7;

        // Linhas da tabela
        doc.setFont('helvetica', 'normal');
        items.forEach((item) => {
          const itemData = getItemData(item);
          const quantidade1x = item.quantidade;
          const quantidade2x = quantidade1x * 2;
          const quantidade3x = quantidade1x * 3;

          // Verificar se precisa de nova página
          if (currentY > 270) {
            doc.addPage();
            currentY = 20;
          }

          doc.rect(20, currentY, colWidths.reduce((a, b) => a + b), 7);

          xPos = 22;
          doc.text(itemData.nome.substring(0, 30), xPos, currentY + 5);
          xPos += colWidths[0];
          
          doc.text(itemData.unidade, xPos, currentY + 5);
          xPos += colWidths[1];
          
          doc.text(itemData.marcas.substring(0, 15), xPos, currentY + 5);
          xPos += colWidths[2];
          
          doc.text(formatQuantidade(quantidade1x), xPos, currentY + 5);
          xPos += colWidths[3];
          
          doc.text(formatQuantidade(quantidade2x), xPos, currentY + 5);
          xPos += colWidths[4];
          
          doc.text(formatQuantidade(quantidade3x), xPos, currentY + 5);

          currentY += 7;
        });

        currentY += 5;
      };

      // Seção Ingredientes
      if (receita.receita_ingredientes && receita.receita_ingredientes.length > 0) {
        createItemTable(
          'Ingredientes',
          receita.receita_ingredientes,
          (item) => ({
            nome: item.produtos?.nome || 'N/A',
            unidade: item.produtos?.unidade_uso || item.produtos?.unidade_compra || 'un',
            marcas: Array.isArray(item.produtos?.marcas) && item.produtos.marcas.length > 0
              ? item.produtos.marcas.join(', ')
              : '-'
          })
        );
      }

      // Seção Sub-receitas
      if (receita.receita_sub_receitas && receita.receita_sub_receitas.length > 0) {
        createItemTable(
          'Sub-receitas',
          receita.receita_sub_receitas,
          (item) => ({
            nome: item.sub_receita?.nome || 'N/A',
            unidade: item.sub_receita?.rendimento_unidade || 'un',
            marcas: '-'
          })
        );
      }

      // Seção Embalagem
      if (receita.receita_embalagens && receita.receita_embalagens.length > 0) {
        createItemTable(
          'Embalagem',
          receita.receita_embalagens,
          (item) => ({
            nome: item.produtos?.nome || 'N/A',
            unidade: item.produtos?.unidade_uso || item.produtos?.unidade_compra || 'un',
            marcas: Array.isArray(item.produtos?.marcas) && item.produtos.marcas.length > 0
              ? item.produtos.marcas.join(', ')
              : '-'
          })
        );
      }

      // Seção Modo de Preparo
      if (receita.receita_passos_preparo && receita.receita_passos_preparo.length > 0) {
        // Verificar se precisa de nova página
        if (currentY > 200) {
          doc.addPage();
          currentY = 20;
        }

        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Modo de Preparo:', 20, currentY);
        currentY += 7;

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');

        const passos = [...receita.receita_passos_preparo].sort((a: any, b: any) => a.ordem - b.ordem);

        passos.forEach((passo: any) => {
          // Verificar se precisa de nova página
          if (currentY > 270) {
            doc.addPage();
            currentY = 20;
          }

          const text = `${passo.ordem}. ${passo.descricao}`;
          const lines = doc.splitTextToSize(text, pageWidth - 45);
          
          lines.forEach((line: string) => {
            if (currentY > 270) {
              doc.addPage();
              currentY = 20;
            }
            doc.text(line, 25, currentY);
            currentY += 5;
          });

          currentY += 2;
        });
      }

      // Rodapé com dados da empresa (em todas as páginas)
      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        const footerY = doc.internal.pageSize.getHeight() - 10;
        
        const footerParts = [];
        if (profile?.business_name) footerParts.push(profile.business_name);
        if (profile?.cnpj_cpf) footerParts.push(`CNPJ: ${profile.cnpj_cpf}`);
        const telefone = profile?.telefone_comercial || profile?.phone;
        if (telefone) footerParts.push(`Tel: ${telefone}`);
        
        if (footerParts.length > 0) {
          doc.text(footerParts.join(' | '), pageWidth / 2, footerY, { align: 'center' });
        }
      }

      // Salvar PDF
      const fileName = `ficha-tecnica-${receita.nome.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);

      toast.success('Ficha técnica gerada com sucesso!');
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast.error('Erro ao gerar ficha técnica');
    } finally {
      setExporting(false);
    }
  };

  return { exportarReceitaPDF, exporting };
}
