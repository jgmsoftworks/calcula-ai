import { useState } from 'react';
import jsPDF from 'jspdf';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatters } from '@/lib/formatters';

interface ConservacaoData {
  congelado?: { temperatura?: string; tempo?: string; unidade?: string };
  refrigerado?: { temperatura?: string; tempo?: string; unidade?: string };
  ambiente?: { temperatura?: string; tempo?: string; unidade?: string };
}

export function useExportReceitaPDF() {
  const [exporting, setExporting] = useState(false);

  const formatQuantidade = (quantidade: number): string => {
    return formatters.quantidadeContinua(quantidade, 3);
  };

  // Função para formatar unidades de forma completa (ex: "g" -> "Grama (g)")
  const formatUnidadeCompleta = (unidade: string): string => {
    const mapa: Record<string, string> = {
      'cm': 'Centímetro (cm)',
      'cx': 'Caixa (cx)',
      'fd': 'Fardo (fd)',
      'g': 'Grama (g)',
      'k': 'Quilo (k)',
      'kg': 'Quilo (kg)',
      'l': 'Litro (l)',
      'm': 'Metro (m)',
      'ml': 'Mililitro (ml)',
      'pct': 'Pacote (pct)',
      'un': 'Unidade (un)'
    };
    
    const unidadeLower = unidade?.toLowerCase().trim() || 'un';
    return mapa[unidadeLower] || unidade;
  };

  // Função para converter URL de imagem para Base64
  const imageUrlToBase64 = async (url: string): Promise<string | null> => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
    } catch {
      return null;
    }
  };

  const exportarReceitaPDF = async (receitaId: string) => {
    try {
      setExporting(true);

      // Buscar dados do usuário e perfil
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data: profile } = await supabase
        .from('profiles')
        .select('nome_fantasia, cnpj_cpf, telefone_comercial, whatsapp, celular, phone, logo_empresa_url')
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

      // Converter imagens para Base64 antes de criar o PDF
      const logoBase64 = profile?.logo_empresa_url 
        ? await imageUrlToBase64(profile.logo_empresa_url) 
        : null;
      const receitaImageBase64 = receita.imagem_url 
        ? await imageUrlToBase64(receita.imagem_url) 
        : null;

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
      
      // Cálculo proporcional das 3 colunas (33% cada) - LARGURAS IGUAIS
      const margem = 15;
      const larguraUtil = pageWidth - (margem * 2); // ~180pts
      const espacamento = 8; // espaço entre colunas (reduzido para melhor aproveitamento)
      const larguraColuna = (larguraUtil - (espacamento * 2)) / 3; // cada coluna = largura igual

      const colEsquerdaX = margem;
      const colEsquerdaWidth = larguraColuna;
      const colCentroX = margem + larguraColuna + espacamento;
      const colCentroWidth = larguraColuna;
      const colDireitaX = margem + (larguraColuna * 2) + (espacamento * 2);
      const colDireitaWidth = larguraColuna;
      
      // ALTURA FIXA para todas as colunas (baseada na altura da foto do centro)
      const alturaBloco = larguraColuna * 1.2; // ~65pts - altura de referência da foto
      
      let yEsquerda = currentY;
      let yDireita = currentY;
      
      // -------------------------
      // COLUNA ESQUERDA - Logo + Dados da Empresa (tudo dentro de alturaBloco)
      // -------------------------
      // Calcular proporções para caber em alturaBloco
      const logoHeight = alturaBloco * 0.55; // ~55% para logo
      const dadosEmpresaRowHeight = (alturaBloco - logoHeight) / 3; // ~15% por linha de dados
      
      // Logo da empresa
      if (logoBase64) {
        try {
          doc.addImage(logoBase64, 'PNG', colEsquerdaX, yEsquerda, colEsquerdaWidth, logoHeight);
          doc.setDrawColor(200, 200, 200);
          doc.setLineWidth(0.3);
          doc.rect(colEsquerdaX, yEsquerda, colEsquerdaWidth, logoHeight);
        } catch (error) {
          console.error('Erro ao adicionar logo da empresa:', error);
          doc.setFillColor(240, 240, 240);
          doc.rect(colEsquerdaX, yEsquerda, colEsquerdaWidth, logoHeight, 'F');
          doc.setDrawColor(200, 200, 200);
          doc.rect(colEsquerdaX, yEsquerda, colEsquerdaWidth, logoHeight);
        }
      } else {
        doc.setFillColor(240, 240, 240);
        doc.rect(colEsquerdaX, yEsquerda, colEsquerdaWidth, logoHeight, 'F');
        doc.setDrawColor(200, 200, 200);
        doc.rect(colEsquerdaX, yEsquerda, colEsquerdaWidth, logoHeight);
      }
      yEsquerda += logoHeight;
      
      // Dados da Empresa (3 linhas)
      const dadosEmpresa = [
        profile?.nome_fantasia || 'Nome da Empresa',
        profile?.cnpj_cpf ? `CNPJ/CPF: ${profile.cnpj_cpf}` : 'CNPJ/CPF: -',
        profile?.telefone_comercial || profile?.whatsapp || profile?.celular || profile?.phone || 'Telefone: -'
      ];
      
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      
      dadosEmpresa.forEach((dado) => {
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.3);
        doc.rect(colEsquerdaX, yEsquerda, colEsquerdaWidth, dadosEmpresaRowHeight);
        doc.text(dado.substring(0, 25), colEsquerdaX + 2, yEsquerda + dadosEmpresaRowHeight * 0.65);
        yEsquerda += dadosEmpresaRowHeight;
      });
      
      // -------------------------
      // COLUNA CENTRO - Foto do Produto (altura = alturaBloco)
      // -------------------------
      if (receitaImageBase64) {
        try {
          doc.addImage(receitaImageBase64, 'JPEG', colCentroX, currentY, colCentroWidth, alturaBloco);
          doc.setDrawColor(200, 200, 200);
          doc.setLineWidth(0.3);
          doc.rect(colCentroX, currentY, colCentroWidth, alturaBloco);
        } catch (error) {
          console.error('Erro ao adicionar foto do produto:', error);
          doc.setFillColor(240, 240, 240);
          doc.rect(colCentroX, currentY, colCentroWidth, alturaBloco, 'F');
          doc.setDrawColor(200, 200, 200);
          doc.rect(colCentroX, currentY, colCentroWidth, alturaBloco);
          doc.setFontSize(9);
          doc.setTextColor(150, 150, 150);
          doc.text('Sem imagem', colCentroX + colCentroWidth / 2, currentY + alturaBloco / 2, { align: 'center' });
        }
      } else {
        doc.setFillColor(240, 240, 240);
        doc.rect(colCentroX, currentY, colCentroWidth, alturaBloco, 'F');
        doc.setDrawColor(200, 200, 200);
        doc.rect(colCentroX, currentY, colCentroWidth, alturaBloco);
        doc.setFontSize(9);
        doc.setTextColor(150, 150, 150);
        doc.text('Sem imagem', colCentroX + colCentroWidth / 2, currentY + alturaBloco / 2, { align: 'center' });
      }
      
      // -------------------------
      // COLUNA DIREITA - Cards "Dados" e "Conservação" (tudo dentro de alturaBloco)
      // -------------------------
      // Calcular alturas proporcionais para caber em alturaBloco
      const cardHeaderHeight = 6;
      const cardDadosRowHeight = 7;
      const conservacaoRowHeight = 6;
      const espacoEntreCards = 2;
      
      // Card "Dados" - Cabeçalho
      doc.setFillColor(100, 100, 100);
      doc.rect(colDireitaX, yDireita, colDireitaWidth, cardHeaderHeight, 'F');
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text('Dados:', colDireitaX + 2, yDireita + 4.5);
      yDireita += cardHeaderHeight;
      
      // Conteúdo do card (3 linhas)
      const dadosReceita = [
        { label: 'Tipo:', valor: (receita.tipos_produto?.nome || '-').substring(0, 25) },
        { 
          label: 'Rendim.:', 
          valor: receita.rendimento_valor && receita.rendimento_unidade 
            ? `${formatQuantidade(receita.rendimento_valor)} ${formatUnidadeCompleta(receita.rendimento_unidade)}`
            : '-'
        },
        { 
          label: 'Peso unit.:', 
          valor: receita.peso_unitario ? `${formatQuantidade(receita.peso_unitario)} g` : '-'
        }
      ];
      
      doc.setFontSize(7);
      doc.setTextColor(0, 0, 0);
      
      dadosReceita.forEach((dado) => {
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.3);
        doc.rect(colDireitaX, yDireita, colDireitaWidth, cardDadosRowHeight);
        
        doc.setFont('helvetica', 'bold');
        doc.text(dado.label, colDireitaX + 1, yDireita + 5);
        
        doc.setFont('helvetica', 'normal');
        const labelWidth = doc.getTextWidth(dado.label);
        doc.text(dado.valor, colDireitaX + 1 + labelWidth + 1, yDireita + 5);
        
        yDireita += cardDadosRowHeight;
      });
      
      yDireita += espacoEntreCards; // Espaço entre cards
      
      // Card "Conservação" - Cabeçalho
      doc.setFillColor(100, 100, 100);
      doc.rect(colDireitaX, yDireita, colDireitaWidth, cardHeaderHeight, 'F');
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text('Conservação:', colDireitaX + 2, yDireita + 4.5);
      yDireita += cardHeaderHeight;
      
      // Tabela de conservação (3 colunas x 4 linhas)
      const conservacao = receita.conservacao as ConservacaoData || {};
      
      // Larguras das colunas
      const colWidth1 = colDireitaWidth * 0.35; // Local
      const colWidth2 = colDireitaWidth * 0.30; // Temp
      const colWidth3 = colDireitaWidth * 0.35; // Tempo
      
      // Cabeçalho da tabela
      const headers = ['Local', 'Temp.', 'Tempo'];
      const headerY = yDireita;
      
      // Fundo cinza claro no cabeçalho
      doc.setFillColor(220, 220, 220);
      doc.rect(colDireitaX, headerY, colDireitaWidth, conservacaoRowHeight, 'F');
      
      // Bordas e texto do cabeçalho
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.3);
      doc.setFontSize(6);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      
      let xPos = colDireitaX;
      headers.forEach((header, i) => {
        const width = i === 0 ? colWidth1 : i === 1 ? colWidth2 : colWidth3;
        doc.rect(xPos, headerY, width, conservacaoRowHeight);
        doc.text(header, xPos + 1, headerY + 4);
        xPos += width;
      });
      
      yDireita += conservacaoRowHeight;
      
      // Linhas de dados
      const conservacaoRows = [
        {
          local: 'Congelado',
          temp: conservacao.congelado?.temperatura ? `${conservacao.congelado.temperatura}` : '',
          tempo: conservacao.congelado?.tempo ? `${conservacao.congelado.tempo} ${conservacao.congelado.unidade || ''}`.trim() : ''
        },
        {
          local: 'Refrigerado',
          temp: conservacao.refrigerado?.temperatura ? `${conservacao.refrigerado.temperatura}` : '',
          tempo: conservacao.refrigerado?.tempo ? `${conservacao.refrigerado.tempo} ${conservacao.refrigerado.unidade || ''}`.trim() : ''
        },
        {
          local: 'Ambiente',
          temp: conservacao.ambiente?.temperatura ? `${conservacao.ambiente.temperatura}` : '',
          tempo: conservacao.ambiente?.tempo ? `${conservacao.ambiente.tempo} ${conservacao.ambiente.unidade || ''}`.trim() : ''
        }
      ];
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6);
      
      conservacaoRows.forEach((row) => {
        xPos = colDireitaX;
        
        // Local
        doc.rect(xPos, yDireita, colWidth1, conservacaoRowHeight);
        doc.text(String(row.local).substring(0, 10), xPos + 1, yDireita + 4);
        xPos += colWidth1;
        
        // Temperatura
        doc.rect(xPos, yDireita, colWidth2, conservacaoRowHeight);
        doc.text(String(row.temp).substring(0, 5), xPos + 1, yDireita + 4);
        xPos += colWidth2;
        
        // Tempo
        doc.rect(xPos, yDireita, colWidth3, conservacaoRowHeight);
        doc.text(String(row.tempo).substring(0, 10), xPos + 1, yDireita + 4);
        
        yDireita += conservacaoRowHeight;
      });
      
      // Ajustar currentY para continuar após as 3 colunas
      currentY = Math.max(yEsquerda, yDireita, currentY + alturaBloco) + 10;

      // === FUNÇÃO AUXILIAR PARA QUEBRAR TEXTO EM MÚLTIPLAS LINHAS ===
      const wrapText = (text: string, maxWidth: number): string[] => {
        if (!text) return [''];
        
        const words = text.split(' ');
        const lines: string[] = [];
        let currentLine = '';

        words.forEach(word => {
          const testLine = currentLine ? `${currentLine} ${word}` : word;
          const testWidth = doc.getTextWidth(testLine);
          
          if (testWidth > maxWidth - 4) { // 4 = padding interno
            if (currentLine) lines.push(currentLine);
            // Se a palavra sozinha é maior que a largura, quebrar a palavra
            if (doc.getTextWidth(word) > maxWidth - 4) {
              let remaining = word;
              while (remaining.length > 0) {
                let fit = remaining;
                while (doc.getTextWidth(fit) > maxWidth - 4 && fit.length > 1) {
                  fit = fit.substring(0, fit.length - 1);
                }
                lines.push(fit);
                remaining = remaining.substring(fit.length);
              }
              currentLine = '';
            } else {
              currentLine = word;
            }
          } else {
            currentLine = testLine;
          }
        });
        
        if (currentLine) lines.push(currentLine);
        return lines.length ? lines : [''];
      };

      // === LAYOUT DE DUAS COLUNAS: TABELAS (ESQUERDA ~60%) + MODO DE PREPARO (DIREITA ~40%) ===
      const secaoInicioY = currentY; // Salvar posição inicial para ambas colunas
      const colunaEsquerdaX = 15;
      const colunaDireitaX = 135; // Empurrar modo de preparo mais para a direita
      const larguraColunaEsquerda = 115; // ~30% maior
      const larguraColunaDireita = pageWidth - colunaDireitaX - 15; // ~30% menor
      
      // Variáveis para controlar Y de cada coluna
      let tabelasY = secaoInicioY;
      let modoPreparoY = secaoInicioY;

      // === FUNÇÃO AUXILIAR PARA CRIAR TABELAS DE ITENS (COLUNA ESQUERDA) ===
      const createItemTable = (
        title: string,
        items: any[],
        getItemData: (item: any) => { nome: string; unidade: string }
      ) => {
        if (items.length === 0) return;

        // Título com fundo (compacto para caber na metade)
        doc.setFillColor(240, 240, 240);
        doc.rect(colunaEsquerdaX, tabelasY, larguraColunaEsquerda, 6, 'F');
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text(title, colunaEsquerdaX + 2, tabelasY + 4);
        tabelasY += 7;

        // Cabeçalho da tabela - colunas ajustadas para ~60% da página
        const colWidths = [45, 27, 14, 14, 14]; // Total: 114 - Un. maior para caber texto completo
        const tableStartY = tabelasY;
        const totalWidth = colWidths.reduce((a, b) => a + b);
        const lineHeight = 4;

        // Cabeçalho com fundo cinza escuro
        doc.setDrawColor(200, 200, 200);
        doc.setFillColor(220, 220, 220);
        doc.rect(colunaEsquerdaX, tableStartY, totalWidth, 7, 'FD');
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);

        let xPos = colunaEsquerdaX + 1;
        const headers = ['Item', 'Un.', '1x', '2x', '3x'];
        headers.forEach((header, i) => {
          doc.text(header, xPos, tableStartY + 5);
          xPos += colWidths[i];
        });

        tabelasY = tableStartY + 7;

        // Linhas da tabela
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        items.forEach((item) => {
          const itemData = getItemData(item);
          const quantidade1x = item.quantidade;
          const quantidade2x = quantidade1x * 2;
          const quantidade3x = quantidade1x * 3;

          // Quebrar texto em linhas para cada coluna
          const nomeLines = wrapText(itemData.nome, colWidths[0]);
          const unidadeLines = wrapText(itemData.unidade, colWidths[1]);
          
          // Calcular altura dinâmica baseada na célula com mais linhas
          const maxLines = Math.max(nomeLines.length, unidadeLines.length, 1);
          const rowHeight = Math.max(6, maxLines * lineHeight + 2);

          // Verificar se precisa de nova página
          if (tabelasY + rowHeight > 270) {
            doc.addPage();
            tabelasY = 20;
            modoPreparoY = 20; // Resetar também o modo de preparo
          }

          // Retângulo da linha com bordas (altura dinâmica)
          doc.setDrawColor(200, 200, 200);
          doc.rect(colunaEsquerdaX, tabelasY, totalWidth, rowHeight);

          // Bordas verticais entre colunas
          let cumulativeWidth = colunaEsquerdaX;
          colWidths.slice(0, -1).forEach((width) => {
            cumulativeWidth += width;
            doc.line(cumulativeWidth, tabelasY, cumulativeWidth, tabelasY + rowHeight);
          });

          // Renderizar texto com múltiplas linhas
          xPos = colunaEsquerdaX + 1;
          
          // Coluna Nome (com word wrap)
          nomeLines.forEach((line, i) => {
            doc.text(line, xPos, tabelasY + 4 + (i * lineHeight));
          });
          xPos += colWidths[0];
          
          // Coluna Unidade (com word wrap)
          unidadeLines.forEach((line, i) => {
            doc.text(line, xPos, tabelasY + 4 + (i * lineHeight));
          });
          xPos += colWidths[1];
          
          // Colunas de quantidade
          doc.text(formatQuantidade(quantidade1x), xPos, tabelasY + 4);
          xPos += colWidths[2];
          
          doc.text(formatQuantidade(quantidade2x), xPos, tabelasY + 4);
          xPos += colWidths[3];
          
          doc.text(formatQuantidade(quantidade3x), xPos, tabelasY + 4);

          tabelasY += rowHeight;
        });

        tabelasY += 4;
      };

      // Renderizar tabelas na coluna esquerda
      if (receita.receita_ingredientes && receita.receita_ingredientes.length > 0) {
        createItemTable(
          'Ingredientes',
          receita.receita_ingredientes,
          (item) => ({
            nome: item.produtos?.nome || 'N/A',
            unidade: formatUnidadeCompleta(item.produtos?.unidade_uso || item.produtos?.unidade_compra || 'un')
          })
        );
      }

      if (receita.receita_sub_receitas && receita.receita_sub_receitas.length > 0) {
        createItemTable(
          'Sub-receitas',
          receita.receita_sub_receitas,
          (item) => ({
            nome: item.sub_receita?.nome || 'N/A',
            unidade: formatUnidadeCompleta(item.sub_receita?.rendimento_unidade || 'un')
          })
        );
      }

      if (receita.receita_embalagens && receita.receita_embalagens.length > 0) {
        createItemTable(
          'Embalagem',
          receita.receita_embalagens,
          (item) => ({
            nome: item.produtos?.nome || 'N/A',
            unidade: formatUnidadeCompleta(item.produtos?.unidade_uso || item.produtos?.unidade_compra || 'un')
          })
        );
      }

      // === MODO DE PREPARO NA COLUNA DIREITA ===
      if (passos.length > 0) {
        // Título com fundo
        doc.setFillColor(240, 240, 240);
        doc.rect(colunaDireitaX, modoPreparoY, larguraColunaDireita, 6, 'F');
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text('Modo de Preparo', colunaDireitaX + 2, modoPreparoY + 4);
        modoPreparoY += 10;

        doc.setFontSize(10);

        passos.forEach((passo: any, index: number) => {
          // Verificar se precisa de nova página
          if (modoPreparoY > 265) {
            doc.addPage();
            modoPreparoY = 20;
            tabelasY = 20;
          }

          const numero = passo.ordem ?? index + 1;
          
          // Número do passo em bold
          doc.setFont('helvetica', 'bold');
          doc.text(`${numero}.`, colunaDireitaX, modoPreparoY);
          
          // Descrição com wrap automático usando nossa função wrapText
          doc.setFont('helvetica', 'normal');
          const descricaoLines = wrapText(passo.descricao, larguraColunaDireita - 10);
          
          descricaoLines.forEach((line: string, lineIndex: number) => {
            if (modoPreparoY > 268) {
              doc.addPage();
              modoPreparoY = 20;
              tabelasY = 20;
            }
            doc.text(line, colunaDireitaX + 6, modoPreparoY);
            modoPreparoY += 4;
          });

          modoPreparoY += 2; // Espaço entre passos
        });
      }

      // Sincronizar Y final - próximo conteúdo começa após a maior das duas colunas
      currentY = Math.max(tabelasY, modoPreparoY) + 5;

      // === RODAPÉ COM DADOS DA EMPRESA (em todas as páginas) ===
      const totalPages = doc.getNumberOfPages();
      
      // Carregar logo Calculaí uma vez
      let logoCalcBase64: string | null = null;
      try {
        logoCalcBase64 = await imageUrlToBase64('/assets/logo-calculaai.png');
      } catch (err) {
        console.log('Logo Calculaí não disponível');
      }
      
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
        if (profile?.nome_fantasia) footerParts.push(profile.nome_fantasia);
        if (profile?.cnpj_cpf) footerParts.push(`CNPJ: ${profile.cnpj_cpf}`);
        const telefone = profile?.telefone_comercial || profile?.whatsapp || profile?.celular || profile?.phone;
        if (telefone) footerParts.push(`Tel: ${telefone}`);
        
        if (footerParts.length > 0) {
          doc.text(footerParts.join(' | '), pageWidth / 2, footerY + 2, { align: 'center' });
        }
        
        // Logo Calculaí no canto inferior direito (pequena mas legível)
        if (logoCalcBase64) {
          const logoWidth = 25;  // ~25mm
          const logoHeight = 8;  // Proporcional
          const logoX = pageWidth - logoWidth - 10; // 10mm da borda direita
          const logoY = doc.internal.pageSize.getHeight() - logoHeight - 5; // 5mm do fundo
          
          doc.addImage(logoCalcBase64, 'PNG', logoX, logoY, logoWidth, logoHeight);
        }
      }

      // Salvar PDF
      const fileName = `ficha-tecnica-${receita.nome.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);

      toast.success('Ficha técnica gerada com sucesso!');
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      toast.error(`Erro ao gerar ficha técnica: ${errorMessage}`);
    } finally {
      setExporting(false);
    }
  };

  return { exportarReceitaPDF, exporting };
}
