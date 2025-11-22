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
      let currentY = 15;
      
      // ============================================================================
      // CABEÇALHO - Nome da receita centralizado
      // ============================================================================
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      const nomeReceita = receita.nome.toUpperCase();
      doc.text(nomeReceita, pageWidth / 2, currentY, { align: 'center' });
      currentY += 8;
      
      // Linha horizontal abaixo do nome
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.5);
      doc.line(15, currentY, pageWidth - 15, currentY);
      currentY += 10;
      
      // ============================================================================
      // TRÊS COLUNAS: Esquerda (Logo + Empresa) | Centro (Foto) | Direita (Dados)
      // ============================================================================
      
      const colEsquerdaX = 15;
      const colEsquerdaWidth = 55;
      const colCentroX = 80;
      const colCentroWidth = 90;
      const colDireitaX = 180;
      const colDireitaWidth = pageWidth - colDireitaX - 15;
      
      let yEsquerda = currentY;
      let yDireita = currentY;
      
      // -------------------------
      // COLUNA ESQUERDA - Logo
      // -------------------------
      const logoSize = 50;
      if (profile?.logo_empresa_url) {
        try {
          doc.addImage(profile.logo_empresa_url, 'PNG', colEsquerdaX, yEsquerda, logoSize, logoSize);
          doc.setDrawColor(200, 200, 200);
          doc.setLineWidth(0.3);
          doc.rect(colEsquerdaX, yEsquerda, logoSize, logoSize);
        } catch (error) {
          console.error('Erro ao adicionar logo da empresa:', error);
          doc.setFillColor(240, 240, 240);
          doc.rect(colEsquerdaX, yEsquerda, logoSize, logoSize, 'F');
          doc.setDrawColor(200, 200, 200);
          doc.rect(colEsquerdaX, yEsquerda, logoSize, logoSize);
        }
      } else {
        doc.setFillColor(240, 240, 240);
        doc.rect(colEsquerdaX, yEsquerda, logoSize, logoSize, 'F');
        doc.setDrawColor(200, 200, 200);
        doc.rect(colEsquerdaX, yEsquerda, logoSize, logoSize);
      }
      yEsquerda += logoSize + 3;
      
      // -------------------------
      // COLUNA ESQUERDA - Dados da Empresa
      // -------------------------
      const dadosEmpresa = [
        profile?.business_name || 'Nome da Empresa',
        profile?.cnpj_cpf ? `CNPJ/CPF: ${profile.cnpj_cpf}` : 'CNPJ/CPF: -',
        profile?.telefone_comercial || profile?.phone || 'Telefone: -'
      ];
      
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      
      dadosEmpresa.forEach((dado) => {
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.3);
        doc.rect(colEsquerdaX, yEsquerda, colEsquerdaWidth, 9);
        doc.text(dado, colEsquerdaX + 2, yEsquerda + 6);
        yEsquerda += 9;
      });
      
      // -------------------------
      // COLUNA CENTRO - Foto do Produto
      // -------------------------
      const fotoProdutoHeight = 100;
      if (receita.imagem_url) {
        try {
          doc.addImage(receita.imagem_url, 'JPEG', colCentroX, currentY, colCentroWidth, fotoProdutoHeight);
          doc.setDrawColor(200, 200, 200);
          doc.setLineWidth(0.3);
          doc.rect(colCentroX, currentY, colCentroWidth, fotoProdutoHeight);
        } catch (error) {
          console.error('Erro ao adicionar foto do produto:', error);
          doc.setFillColor(240, 240, 240);
          doc.rect(colCentroX, currentY, colCentroWidth, fotoProdutoHeight, 'F');
          doc.setDrawColor(200, 200, 200);
          doc.rect(colCentroX, currentY, colCentroWidth, fotoProdutoHeight);
          doc.setFontSize(9);
          doc.setTextColor(150, 150, 150);
          doc.text('Sem imagem', colCentroX + colCentroWidth / 2, currentY + fotoProdutoHeight / 2, { align: 'center' });
        }
      } else {
        doc.setFillColor(240, 240, 240);
        doc.rect(colCentroX, currentY, colCentroWidth, fotoProdutoHeight, 'F');
        doc.setDrawColor(200, 200, 200);
        doc.rect(colCentroX, currentY, colCentroWidth, fotoProdutoHeight);
        doc.setFontSize(9);
        doc.setTextColor(150, 150, 150);
        doc.text('Sem imagem', colCentroX + colCentroWidth / 2, currentY + fotoProdutoHeight / 2, { align: 'center' });
      }
      
      // -------------------------
      // COLUNA DIREITA - Card "Dados"
      // -------------------------
      // Cabeçalho do card
      doc.setFillColor(100, 100, 100);
      doc.rect(colDireitaX, yDireita, colDireitaWidth, 8, 'F');
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text('Dados:', colDireitaX + 2, yDireita + 5.5);
      yDireita += 8;
      
      // Conteúdo do card (3 linhas)
      const dadosReceita = [
        { label: 'Tipo do Produto:', valor: receita.tipos_produto?.nome || '-' },
        { 
          label: 'Rendimento:', 
          valor: receita.rendimento_valor && receita.rendimento_unidade 
            ? `${formatQuantidade(receita.rendimento_valor)} ${receita.rendimento_unidade}`
            : '-'
        },
        { 
          label: 'Peso unitário:', 
          valor: receita.peso_unitario ? `${formatQuantidade(receita.peso_unitario)} g` : '-'
        }
      ];
      
      doc.setFontSize(8);
      doc.setTextColor(0, 0, 0);
      
      dadosReceita.forEach((dado) => {
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.3);
        doc.rect(colDireitaX, yDireita, colDireitaWidth, 10);
        
        doc.setFont('helvetica', 'bold');
        const labelWidth = doc.getTextWidth(dado.label);
        doc.text(dado.label, colDireitaX + 2, yDireita + 7);
        
        doc.setFont('helvetica', 'normal');
        doc.text(dado.valor, colDireitaX + 2 + labelWidth + 1, yDireita + 7);
        
        yDireita += 10;
      });
      
      yDireita += 3; // Espaço entre cards
      
      // -------------------------
      // COLUNA DIREITA - Card "Conservação"
      // -------------------------
      // Cabeçalho do card
      doc.setFillColor(100, 100, 100);
      doc.rect(colDireitaX, yDireita, colDireitaWidth, 8, 'F');
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text('Conservação:', colDireitaX + 2, yDireita + 5.5);
      yDireita += 8;
      
      // Tabela de conservação (3 colunas x 4 linhas)
      const conservacao = receita.conservacao as ConservacaoData || {};
      
      // Larguras das colunas
      const colWidth1 = colDireitaWidth * 0.35; // Local
      const colWidth2 = colDireitaWidth * 0.30; // Temp
      const colWidth3 = colDireitaWidth * 0.35; // Tempo
      
      // Cabeçalho da tabela
      const headers = ['Local', 'Temp. °C', 'Tempo'];
      const headerY = yDireita;
      
      // Fundo cinza claro no cabeçalho
      doc.setFillColor(220, 220, 220);
      doc.rect(colDireitaX, headerY, colDireitaWidth, 8, 'F');
      
      // Bordas e texto do cabeçalho
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.3);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      
      let xPos = colDireitaX;
      headers.forEach((header, i) => {
        const width = i === 0 ? colWidth1 : i === 1 ? colWidth2 : colWidth3;
        doc.rect(xPos, headerY, width, 8);
        doc.text(header, xPos + 2, headerY + 5.5);
        xPos += width;
      });
      
      yDireita += 8;
      
      // Linhas de dados
      const conservacaoRows = [
        {
          local: 'Congelado',
          temp: conservacao.congelado?.temperatura ? `${conservacao.congelado.temperatura}` : '',
          tempo: conservacao.congelado?.tempo || ''
        },
        {
          local: 'Refrigerado',
          temp: conservacao.refrigerado?.temperatura ? `${conservacao.refrigerado.temperatura}` : '',
          tempo: conservacao.refrigerado?.tempo || ''
        },
        {
          local: 'Ambiente',
          temp: conservacao.ambiente?.temperatura ? `${conservacao.ambiente.temperatura}` : '',
          tempo: conservacao.ambiente?.tempo || ''
        }
      ];
      
      doc.setFont('helvetica', 'normal');
      
      conservacaoRows.forEach((row) => {
        xPos = colDireitaX;
        
        // Local
        doc.rect(xPos, yDireita, colWidth1, 8);
        doc.text(row.local, xPos + 2, yDireita + 5.5);
        xPos += colWidth1;
        
        // Temperatura
        doc.rect(xPos, yDireita, colWidth2, 8);
        doc.text(row.temp, xPos + 2, yDireita + 5.5);
        xPos += colWidth2;
        
        // Tempo
        doc.rect(xPos, yDireita, colWidth3, 8);
        doc.text(row.tempo, xPos + 2, yDireita + 5.5);
        
        yDireita += 8;
      });
      
      // Ajustar currentY para continuar após as 3 colunas
      currentY = Math.max(yEsquerda, yDireita, currentY + fotoProdutoHeight) + 10;

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
