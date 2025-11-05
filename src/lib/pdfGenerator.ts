import jsPDF from 'jspdf';
import type { ReceitaCompleta } from '@/types/receitas';

export async function gerarPDFReceita(receita: ReceitaCompleta) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  let yPosition = 20;

  // Título da Receita
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  const tituloWidth = doc.getTextWidth(receita.nome);
  doc.text(receita.nome, (pageWidth - tituloWidth) / 2, yPosition);
  
  yPosition += 10;
  doc.setLineWidth(0.5);
  doc.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 10;

  // Se tiver imagem, adicionar
  if (receita.imagem_url) {
    try {
      const img = await loadImage(receita.imagem_url);
      const imgWidth = 50;
      const imgHeight = 40;
      doc.addImage(img, 'JPEG', margin, yPosition, imgWidth, imgHeight);
      yPosition += imgHeight + 5;
    } catch (error) {
      console.error('Erro ao carregar imagem:', error);
    }
  }

  // Seção de Dados
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('DADOS', margin, yPosition);
  yPosition += 7;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  
  const dados = [
    `Tipo: ${receita.tipo_produto || 'Não especificado'}`,
    `Rendimento: ${receita.rendimento_valor || 0} ${receita.rendimento_unidade || 'un'}`,
    `Peso Unitário: ${receita.peso_unitario || 0}g`,
    `Tempo Total: ${receita.tempo_preparo_total || 0} min`,
    `Tempo Mão de Obra: ${receita.tempo_preparo_mao_obra || 0} min`,
  ];

  dados.forEach(dado => {
    doc.text(dado, margin + 5, yPosition);
    yPosition += 6;
  });

  yPosition += 5;

  // Seção de Conservação
  if (receita.conservacao) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('CONSERVAÇÃO', margin, yPosition);
    yPosition += 7;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    const conservacao = receita.conservacao;
    if (conservacao.congelado) {
      doc.text(`• Congelado: ${conservacao.congelado.temperatura}°C - ${conservacao.congelado.tempo} ${conservacao.congelado.unidade}`, margin + 5, yPosition);
      yPosition += 6;
    }
    if (conservacao.refrigerado) {
      doc.text(`• Refrigerado: ${conservacao.refrigerado.temperatura}°C - ${conservacao.refrigerado.tempo} ${conservacao.refrigerado.unidade}`, margin + 5, yPosition);
      yPosition += 6;
    }
    if (conservacao.ambiente) {
      doc.text(`• Ambiente: ${conservacao.ambiente.temperatura}°C - ${conservacao.ambiente.tempo} ${conservacao.ambiente.unidade}`, margin + 5, yPosition);
      yPosition += 6;
    }
    yPosition += 5;
  }

  // Verificar se precisa de nova página
  if (yPosition > pageHeight - 60) {
    doc.addPage();
    yPosition = 20;
  }

  // Seção de Ingredientes
  if (receita.ingredientes.length > 0) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('INGREDIENTES', margin, yPosition);
    yPosition += 7;

    // Cabeçalho da tabela
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    const colX1 = margin + 5;
    const colX2 = colX1 + 80;
    const colX3 = colX2 + 30;
    const colX4 = colX3 + 30;

    doc.text('Ingrediente', colX1, yPosition);
    doc.text('Qtd', colX2, yPosition);
    doc.text('Custo Un.', colX3, yPosition);
    doc.text('Total', colX4, yPosition);
    yPosition += 5;

    doc.setFont('helvetica', 'normal');
    receita.ingredientes.forEach(ing => {
      if (yPosition > pageHeight - 30) {
        doc.addPage();
        yPosition = 20;
      }
      
      doc.text(ing.nome.substring(0, 35), colX1, yPosition);
      doc.text(`${ing.quantidade}`, colX2, yPosition);
      doc.text(`R$ ${ing.custo_unitario.toFixed(2)}`, colX3, yPosition);
      doc.text(`R$ ${ing.custo_total.toFixed(2)}`, colX4, yPosition);
      yPosition += 6;
    });

    yPosition += 5;
  }

  // Seção de Embalagens
  if (receita.embalagens.length > 0) {
    if (yPosition > pageHeight - 40) {
      doc.addPage();
      yPosition = 20;
    }

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('EMBALAGENS', margin, yPosition);
    yPosition += 7;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    receita.embalagens.forEach(emb => {
      if (yPosition > pageHeight - 30) {
        doc.addPage();
        yPosition = 20;
      }
      
      doc.text(`• ${emb.nome} - Qtd: ${emb.quantidade} - R$ ${emb.custo_total.toFixed(2)}`, margin + 5, yPosition);
      yPosition += 6;
    });

    yPosition += 5;
  }

  // Modo de Preparo
  if (receita.passos.length > 0) {
    if (yPosition > pageHeight - 40) {
      doc.addPage();
      yPosition = 20;
    }

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('MODO DE PREPARO', margin, yPosition);
    yPosition += 7;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    for (const [index, passo] of receita.passos.entries()) {
      if (yPosition > pageHeight - 40) {
        doc.addPage();
        yPosition = 20;
      }

      doc.setFont('helvetica', 'bold');
      doc.text(`${index + 1}.`, margin + 5, yPosition);
      doc.setFont('helvetica', 'normal');
      
      const passoTexto = doc.splitTextToSize(passo.descricao, pageWidth - margin * 2 - 15);
      doc.text(passoTexto, margin + 12, yPosition);
      yPosition += passoTexto.length * 6 + 3;

      // Se tiver imagem do passo
      if (passo.imagem_url) {
        try {
          if (yPosition > pageHeight - 60) {
            doc.addPage();
            yPosition = 20;
          }
          const img = await loadImage(passo.imagem_url);
          const imgWidth = 60;
          const imgHeight = 45;
          doc.addImage(img, 'JPEG', margin + 12, yPosition, imgWidth, imgHeight);
          yPosition += imgHeight + 5;
        } catch (error) {
          console.error('Erro ao carregar imagem do passo:', error);
        }
      }

      yPosition += 2;
    }
  }

  // Custos finais
  if (yPosition > pageHeight - 50) {
    doc.addPage();
    yPosition = 20;
  }

  yPosition += 10;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('CUSTOS', margin, yPosition);
  yPosition += 7;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  const custoIngredientes = receita.ingredientes.reduce((sum, i) => sum + i.custo_total, 0);
  const custoEmbalagens = receita.embalagens.reduce((sum, e) => sum + e.custo_total, 0);
  const custoMaoObra = receita.mao_obra.reduce((sum, m) => sum + m.valor_total, 0);
  const custoTotal = custoIngredientes + custoEmbalagens + custoMaoObra;

  doc.text(`Ingredientes: R$ ${custoIngredientes.toFixed(2)}`, margin + 5, yPosition);
  yPosition += 6;
  doc.text(`Embalagens: R$ ${custoEmbalagens.toFixed(2)}`, margin + 5, yPosition);
  yPosition += 6;
  doc.text(`Mão de Obra: R$ ${custoMaoObra.toFixed(2)}`, margin + 5, yPosition);
  yPosition += 6;
  
  doc.setFont('helvetica', 'bold');
  doc.text(`CUSTO TOTAL: R$ ${custoTotal.toFixed(2)}`, margin + 5, yPosition);
  yPosition += 6;
  doc.text(`PREÇO VENDA: R$ ${receita.preco_venda.toFixed(2)}`, margin + 5, yPosition);

  // Salvar PDF
  const nomeArquivo = `receita-${receita.nome.toLowerCase().replace(/\s+/g, '_')}.pdf`;
  doc.save(nomeArquivo);
}

// Função auxiliar para carregar imagens
function loadImage(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      } else {
        reject(new Error('Failed to get canvas context'));
      }
    };
    img.onerror = reject;
    img.src = url;
  });
}
