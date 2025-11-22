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
          tipos_produto (
            nome
          )
        `)
        .eq('id', receitaId)
        .single();

      if (receitaError) throw receitaError;
      if (!receita) throw new Error('Receita não encontrada');

      // Buscar passos de preparo em query separada
      const { data: passosPreparo, error: passosError } = await supabase
        .from('receita_passos_preparo')
        .select('ordem, descricao')
        .eq('receita_id', receitaId)
        .order('ordem', { ascending: true });

      if (passosError) {
        console.error('Erro ao buscar passos de preparo para o PDF:', passosError);
      }

      const passos = passosPreparo ?? [];

      // Criar PDF
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      let currentY = 10;

      // === CABEÇALHO PROFISSIONAL ===
      // Retângulo principal do cabeçalho
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.5);
      doc.rect(15, 10, pageWidth - 30, 50);

      // Logo da empresa (canto superior esquerdo)
      if (profile?.logo_empresa_url) {
        try {
          doc.addImage(profile.logo_empresa_url, 'PNG', 20, 15, 40, 40);
          doc.rect(20, 15, 40, 40); // Borda ao redor do logo
        } catch (error) {
          console.error('Erro ao adicionar logo:', error);
          // Desenhar retângulo vazio como fallback
          doc.setFillColor(240, 240, 240);
          doc.rect(20, 15, 40, 40, 'F');
        }
      } else {
        // Retângulo vazio se não tiver logo
        doc.setFillColor(240, 240, 240);
        doc.rect(20, 15, 40, 40, 'F');
      }

      // Foto do produto (canto superior direito)
      if (receita.imagem_url) {
        try {
          doc.addImage(receita.imagem_url, 'JPEG', pageWidth - 60, 15, 40, 40);
          doc.rect(pageWidth - 60, 15, 40, 40); // Borda ao redor da foto
        } catch (error) {
          console.error('Erro ao adicionar foto do produto:', error);
          // Desenhar retângulo vazio como fallback
          doc.setFillColor(240, 240, 240);
          doc.rect(pageWidth - 60, 15, 40, 40, 'F');
        }
      } else {
        // Retângulo vazio se não tiver foto
        doc.setFillColor(240, 240, 240);
        doc.rect(pageWidth - 60, 15, 40, 40, 'F');
      }

      currentY = 65;

      // Nome da Receita (centralizado abaixo do cabeçalho)
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text(receita.nome, pageWidth / 2, currentY, { align: 'center' });
      currentY += 8;

      // Linha separadora
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.5);
      doc.line(20, currentY, pageWidth - 20, currentY);
      currentY += 10;

      // === SEÇÃO DADOS ===
      // Título com fundo
      doc.setFillColor(240, 240, 240);
      doc.rect(20, currentY, pageWidth - 40, 7, 'F');
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text('Dados', 22, currentY + 5);
      currentY += 10;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      
      // Cada dado em um retângulo com borda
      const dadosToShow = [];
      if (receita.tipos_produto?.nome) {
        dadosToShow.push(`Tipo do Produto: ${receita.tipos_produto.nome}`);
      }
      if (receita.rendimento_valor && receita.rendimento_unidade) {
        dadosToShow.push(`Rendimento: ${formatQuantidade(receita.rendimento_valor)} ${receita.rendimento_unidade}`);
      }
      if (receita.peso_unitario) {
        dadosToShow.push(`Peso unitário: ${formatQuantidade(receita.peso_unitario)} g`);
      }

      dadosToShow.forEach((dado) => {
        doc.setDrawColor(200, 200, 200);
        doc.rect(20, currentY, pageWidth - 40, 7);
        doc.text(dado, 22, currentY + 5);
        currentY += 7;
      });

      currentY += 5;

      // === SEÇÃO CONSERVAÇÃO ===
      if (receita.conservacao) {
        const conservacao = receita.conservacao as ConservacaoData;
        
        // Título com fundo
        doc.setFillColor(240, 240, 240);
        doc.rect(20, currentY, pageWidth - 40, 7, 'F');
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text('Conservação', 22, currentY + 5);
        currentY += 10;

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

          // Cabeçalho da tabela com fundo cinza escuro
          doc.setDrawColor(200, 200, 200);
          doc.setFillColor(220, 220, 220);
          doc.rect(20, tableStartY, colWidths[0] + colWidths[1] + colWidths[2], 7, 'FD');
          doc.setFontSize(9);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(0, 0, 0);
          
          let xPos = 22;
          headers.forEach((header, i) => {
            doc.text(header, xPos, tableStartY + 5);
            xPos += colWidths[i];
          });
          
          currentY = tableStartY + 7;

          // Linhas da tabela com bordas
          doc.setFont('helvetica', 'normal');
          conservacaoData.forEach((row) => {
            doc.setDrawColor(200, 200, 200);
            doc.rect(20, currentY, colWidths[0] + colWidths[1] + colWidths[2], 7);
            
            // Bordas verticais entre colunas
            doc.line(20 + colWidths[0], currentY, 20 + colWidths[0], currentY + 7);
            doc.line(20 + colWidths[0] + colWidths[1], currentY, 20 + colWidths[0] + colWidths[1], currentY + 7);
            
            doc.text(row[0], 22, currentY + 5);
            doc.text(row[1], 22 + colWidths[0], currentY + 5);
            doc.text(row[2], 22 + colWidths[0] + colWidths[1], currentY + 5);
            currentY += 7;
          });

          currentY += 5;
        }
      }

      // === FUNÇÃO AUXILIAR PARA CRIAR TABELAS DE ITENS ===
      const createItemTable = (
        title: string,
        items: any[],
        getItemData: (item: any) => { nome: string; unidade: string; marcas: string }
      ) => {
        if (items.length === 0) return;

        // Título com fundo
        doc.setFillColor(240, 240, 240);
        doc.rect(20, currentY, pageWidth - 40, 7, 'F');
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text(title, 22, currentY + 5);
        currentY += 10;

        // Cabeçalho da tabela
        const colWidths = [50, 15, 25, 25, 25, 25];
        const tableStartY = currentY;
        const totalWidth = colWidths.reduce((a, b) => a + b);

        // Cabeçalho com fundo cinza escuro
        doc.setDrawColor(200, 200, 200);
        doc.setFillColor(220, 220, 220);
        doc.rect(20, tableStartY, totalWidth, 7, 'FD');
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);

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

          // Retângulo da linha com bordas
          doc.setDrawColor(200, 200, 200);
          doc.rect(20, currentY, totalWidth, 7);

          // Bordas verticais entre colunas
          let cumulativeWidth = 20;
          colWidths.slice(0, -1).forEach((width) => {
            cumulativeWidth += width;
            doc.line(cumulativeWidth, currentY, cumulativeWidth, currentY + 7);
          });

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

      // === SEÇÃO MODO DE PREPARO ===
      if (passos.length > 0) {
        // Verificar se precisa de nova página
        if (currentY > 200) {
          doc.addPage();
          currentY = 20;
        }

        // Título com fundo
        doc.setFillColor(240, 240, 240);
        doc.rect(20, currentY, pageWidth - 40, 7, 'F');
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text('Modo de Preparo', 22, currentY + 5);
        currentY += 10;

        doc.setFontSize(10);

        passos.forEach((passo: any, index: number) => {
          // Verificar se precisa de nova página
          if (currentY > 260) {
            doc.addPage();
            currentY = 20;
          }

          const numero = passo.ordem ?? index + 1;
          
          // Número do passo em bold
          doc.setFont('helvetica', 'bold');
          doc.text(`${numero}.`, 25, currentY);
          
          // Descrição com wrap automático
          doc.setFont('helvetica', 'normal');
          const descricaoLines = doc.splitTextToSize(passo.descricao, pageWidth - 50);
          
          descricaoLines.forEach((line: string, lineIndex: number) => {
            if (currentY > 270) {
              doc.addPage();
              currentY = 20;
            }
            // Primeiro linha alinhada com o número, demais linhas indentadas
            const xOffset = lineIndex === 0 ? 32 : 32;
            doc.text(line, xOffset, currentY);
            currentY += 5;
          });

          currentY += 3; // Espaço entre passos
        });
      }

      // === RODAPÉ COM DADOS DA EMPRESA (em todas as páginas) ===
      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        
        const footerY = doc.internal.pageSize.getHeight() - 15;
        
        // Linha separadora acima do rodapé
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.3);
        doc.line(20, footerY - 3, pageWidth - 20, footerY - 3);
        
        // Texto do rodapé
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 100, 100);
        
        const footerParts = [];
        if (profile?.business_name) footerParts.push(profile.business_name);
        if (profile?.cnpj_cpf) footerParts.push(`CNPJ: ${profile.cnpj_cpf}`);
        const telefone = profile?.telefone_comercial || profile?.phone;
        if (telefone) footerParts.push(`Tel: ${telefone}`);
        
        if (footerParts.length > 0) {
          doc.text(footerParts.join(' | '), pageWidth / 2, footerY + 2, { align: 'center' });
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
