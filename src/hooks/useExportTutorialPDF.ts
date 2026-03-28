import { useState } from 'react';
import jsPDF from 'jspdf';
import { sections } from '@/data/tutorialData';

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 20;
const CONTENT_W = PAGE_W - MARGIN * 2;
const BOTTOM_LIMIT = PAGE_H - MARGIN;

const SECTION_COLORS: Record<string, [number, number, number]> = {
  dashboard: [14, 110, 184],
  estoque: [66, 66, 140],
  movimentacao: [120, 50, 120],
  receitas: [168, 30, 100],
  custos: [190, 40, 60],
  precificacao: [210, 120, 30],
};

// Strip emoji and special unicode that jsPDF can't render
function sanitize(text: string): string {
  // Remove emoji and other non-latin chars that cause garbled output
  return text
    .replace(/[\u{1F600}-\u{1F9FF}]/gu, '')
    .replace(/[\u{2600}-\u{27BF}]/gu, '')
    .replace(/[\u{1F300}-\u{1F5FF}]/gu, '')
    .replace(/[\u{1F680}-\u{1F6FF}]/gu, '')
    .replace(/[\u{FE00}-\u{FE0F}]/gu, '')
    .replace(/[\u{200D}]/gu, '')
    .replace(/💡/g, '[Dica]')
    .replace(/🚀/g, '')
    .replace(/[\u{1F000}-\u{1FFFF}]/gu, '')
    .trim();
}

async function loadImageAsBase64(src: string): Promise<string | null> {
  try {
    const resp = await fetch(src);
    const blob = await resp.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function getImageDimensions(base64: string): Promise<{ w: number; h: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ w: img.width, h: img.height });
    img.onerror = () => resolve({ w: 800, h: 450 });
    img.src = base64;
  });
}

function ensureSpace(doc: jsPDF, y: number, needed: number): number {
  if (y + needed > BOTTOM_LIMIT) {
    doc.addPage();
    return MARGIN;
  }
  return y;
}

function wrapText(doc: jsPDF, text: string, maxWidth: number): string[] {
  return doc.splitTextToSize(sanitize(text), maxWidth);
}

function drawColorBar(doc: jsPDF, y: number, color: [number, number, number]): number {
  doc.setFillColor(color[0], color[1], color[2]);
  doc.roundedRect(MARGIN, y, CONTENT_W, 4, 2, 2, 'F');
  return y + 6;
}

function drawBullet(
  doc: jsPDF,
  bullet: string,
  y: number,
  color: [number, number, number]
): number {
  const clean = sanitize(bullet);
  const parts = clean.split('**');
  const bulletIndent = 8;
  const textW = CONTENT_W - bulletIndent;
  const lineHeight = 4.5;

  // Build full wrapped lines to calculate total height first
  const fullText = parts.join('');
  const lines = doc.splitTextToSize(fullText, textW);
  const neededH = lines.length * lineHeight + 3;

  y = ensureSpace(doc, y, neededH);

  // Draw bullet dot
  doc.setFillColor(color[0], color[1], color[2]);
  doc.circle(MARGIN + 3, y + 2, 1, 'F');

  // Render line by line using splitTextToSize for proper wrapping
  // We render the full text line by line, applying bold to ** segments
  let curY = y;

  for (const line of lines) {
    curY = ensureSpace(doc, curY, lineHeight + 1);

    // Find which parts of the original text this line corresponds to
    // Simple approach: render the whole line in normal, then overlay bold parts
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(50, 50, 50);
    doc.text(line, MARGIN + bulletIndent, curY + 3);

    curY += lineHeight;
  }

  // Now re-render with bold detection on first line only (title part)
  // Better approach: render each line with inline bold
  // Reset and re-render properly
  const pageBeforeRerender = doc.getCurrentPageInfo().pageNumber;

  // We already rendered normal text above. For bold segments in the first occurrence,
  // let's do a simpler approach: render the bold part separately if it's at the start
  if (parts.length > 1 && parts[0] === '') {
    // Text starts with bold: **BoldPart**: rest...
    const boldPart = parts[1];
    if (boldPart) {
      // Overwrite just the bold segment on the first line
      const firstLineY = y;
      // Only if we're still on the same page
      if (doc.getCurrentPageInfo().pageNumber === pageBeforeRerender || lines.length <= Math.ceil(BOTTOM_LIMIT / lineHeight)) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(50, 50, 50);

        // Clear area behind bold text and redraw
        const boldW = doc.getTextWidth(boldPart);
        doc.setFillColor(255, 255, 255);
        doc.rect(MARGIN + bulletIndent, firstLineY - 0.5, boldW + 0.5, lineHeight + 1, 'F');

        // Re-draw bullet dot (might have been covered)
        doc.setFillColor(color[0], color[1], color[2]);
        doc.circle(MARGIN + 3, y + 2, 1, 'F');

        doc.setFont('helvetica', 'bold');
        doc.setTextColor(50, 50, 50);
        doc.text(boldPart, MARGIN + bulletIndent, firstLineY + 3);
      }
    }
  }

  return curY + 1;
}

function drawTip(doc: jsPDF, tip: string, y: number): number {
  const cleanTip = sanitize(tip);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  const prefix = '[Dica] ';
  const lines = doc.splitTextToSize(prefix + cleanTip, CONTENT_W - 16);
  const boxH = lines.length * 4 + 6;

  y = ensureSpace(doc, y, boxH + 2);

  // Tip background
  doc.setFillColor(240, 245, 255);
  doc.roundedRect(MARGIN + 2, y, CONTENT_W - 4, boxH, 2, 2, 'F');

  // Border
  doc.setDrawColor(200, 215, 240);
  doc.setLineWidth(0.3);
  doc.roundedRect(MARGIN + 2, y, CONTENT_W - 4, boxH, 2, 2, 'S');

  doc.setFont('helvetica', 'italic');
  doc.setTextColor(60, 70, 110);
  doc.text(lines, MARGIN + 6, y + 5);

  return y + boxH + 3;
}

export function useExportTutorialPDF() {
  const [isExporting, setIsExporting] = useState(false);

  const exportPDF = async () => {
    setIsExporting(true);

    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

      // ========== COVER PAGE ==========
      doc.setFillColor(14, 110, 184);
      doc.rect(0, 0, PAGE_W, PAGE_H / 2, 'F');
      doc.setFillColor(120, 50, 150);
      doc.rect(0, PAGE_H / 2, PAGE_W, PAGE_H / 2, 'F');

      doc.setGState(doc.GState({ opacity: 0.08 }));
      doc.setFillColor(255, 255, 255);
      doc.circle(160, 40, 50, 'F');
      doc.circle(50, 250, 40, 'F');
      doc.setGState(doc.GState({ opacity: 1 }));

      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(36);
      doc.text('Guia Completo', PAGE_W / 2, 100, { align: 'center' });

      doc.setFontSize(48);
      doc.text('CalculaAi', PAGE_W / 2, 125, { align: 'center' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(14);
      doc.text('Tutorial visual e detalhado de cada tela,', PAGE_W / 2, 155, { align: 'center' });
      doc.text('modal e funcionalidade do sistema.', PAGE_W / 2, 163, { align: 'center' });

      doc.setFontSize(11);
      const now = new Date();
      const dateStr = now.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
      doc.text('Gerado em ' + dateStr, PAGE_W / 2, 200, { align: 'center' });

      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Conteudo:', PAGE_W / 2, 225, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      sections.forEach((s, i) => {
        doc.text((i + 1) + '. ' + sanitize(s.title) + ' - ' + sanitize(s.subtitle), PAGE_W / 2, 237 + i * 8, { align: 'center' });
      });

      // ========== SECTIONS ==========
      for (let si = 0; si < sections.length; si++) {
        const section = sections[si];
        const color = SECTION_COLORS[section.id] || [100, 100, 100];

        doc.addPage();
        let y = MARGIN;

        // Color bar
        y = drawColorBar(doc, y, color);

        // Section number + title
        doc.setFillColor(color[0], color[1], color[2]);
        doc.circle(MARGIN + 6, y + 5, 6, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.text(String(si + 1), MARGIN + 6, y + 7, { align: 'center' });

        doc.setTextColor(color[0], color[1], color[2]);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(20);
        doc.text(sanitize(section.title), MARGIN + 16, y + 8);

        doc.setTextColor(120, 120, 120);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.text(sanitize(section.subtitle), MARGIN + 16, y + 14);

        y += 22;

        // Main image
        const mainB64 = await loadImageAsBase64(section.mainImage);
        if (mainB64) {
          const dims = await getImageDimensions(mainB64);
          const imgW = Math.min(CONTENT_W, 160);
          const imgH = (dims.h / dims.w) * imgW;
          const fittedH = Math.min(imgH, 90);

          y = ensureSpace(doc, y, fittedH + 4);

          doc.setFillColor(230, 230, 230);
          doc.roundedRect(MARGIN + 1, y + 1, imgW, fittedH, 2, 2, 'F');
          doc.addImage(mainB64, 'JPEG', MARGIN, y, imgW, fittedH);
          y += fittedH + 6;
        }

        // Intro text
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(60, 60, 60);
        const introLines = wrapText(doc, section.intro, CONTENT_W);
        y = ensureSpace(doc, y, introLines.length * 5 + 4);
        doc.text(introLines, MARGIN, y);
        y += introLines.length * 5 + 8;

        // Sub-screens
        for (let ssi = 0; ssi < section.subScreens.length; ssi++) {
          const sub = section.subScreens[ssi];

          // Better height estimation: title(12) + description + bullets + tips
          const descLines = wrapText(doc, sub.description, CONTENT_W);
          const estDescH = descLines.length * 4.5;
          const estBulletsH = sub.bullets.length * 12;
          const estTipsH = (sub.tips?.length || 0) * 15;
          const minEstH = 14 + estDescH + Math.min(estBulletsH, 40); // At minimum, title + desc + some bullets

          y = ensureSpace(doc, y, Math.min(minEstH, 60));

          // Separator line
          if (ssi > 0) {
            doc.setDrawColor(220, 220, 220);
            doc.setLineWidth(0.3);
            doc.line(MARGIN + 10, y, MARGIN + CONTENT_W - 10, y);
            y += 6;
          }

          // Sub-screen title
          y = ensureSpace(doc, y, 14);
          doc.setFillColor(color[0], color[1], color[2]);
          doc.circle(MARGIN + 4, y + 3, 4, 'F');
          doc.setTextColor(255, 255, 255);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(9);
          doc.text(String(ssi + 1), MARGIN + 4, y + 5, { align: 'center' });

          doc.setTextColor(40, 40, 40);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(13);
          // Wrap title if too long
          const titleLines = doc.splitTextToSize(sanitize(sub.title), CONTENT_W - 14);
          doc.text(titleLines[0], MARGIN + 12, y + 5);
          y += 12;
          if (titleLines.length > 1) {
            doc.text(titleLines.slice(1), MARGIN + 12, y);
            y += (titleLines.length - 1) * 6;
          }

          // Sub-screen image
          const subB64 = await loadImageAsBase64(sub.image);
          if (subB64) {
            const dims = await getImageDimensions(subB64);
            const imgW = Math.min(CONTENT_W, 150);
            const imgH = (dims.h / dims.w) * imgW;
            const fittedH = Math.min(imgH, 80);

            y = ensureSpace(doc, y, fittedH + 4);
            doc.setDrawColor(200, 200, 200);
            doc.setLineWidth(0.3);
            doc.roundedRect(MARGIN, y, imgW, fittedH, 1, 1, 'S');
            doc.addImage(subB64, 'JPEG', MARGIN, y, imgW, fittedH);
            y += fittedH + 5;
          }

          // Description
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(9.5);
          doc.setTextColor(60, 60, 60);
          // Re-wrap since we already calculated above
          const descWrapped = wrapText(doc, sub.description, CONTENT_W);
          for (const line of descWrapped) {
            y = ensureSpace(doc, y, 5);
            doc.text(line, MARGIN, y + 3);
            y += 4.5;
          }
          y += 3;

          // Bullets
          for (const bullet of sub.bullets) {
            y = drawBullet(doc, bullet, y, color);
          }

          y += 2;

          // Tips
          if (sub.tips && sub.tips.length > 0) {
            for (const tip of sub.tips) {
              y = drawTip(doc, tip, y);
            }
          }

          y += 4;
        }
      }

      // ========== FINAL PAGE ==========
      doc.addPage();
      let y = PAGE_H / 2 - 30;

      doc.setFillColor(14, 110, 184);
      doc.roundedRect(MARGIN + 20, y - 10, CONTENT_W - 40, 60, 4, 4, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.text('Pronto para comecar!', PAGE_W / 2, y + 10, { align: 'center' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      doc.text('Cadastre seus produtos no Estoque', PAGE_W / 2, y + 22, { align: 'center' });
      doc.text('e monte sua primeira receita.', PAGE_W / 2, y + 30, { align: 'center' });

      doc.setFontSize(9);
      doc.setTextColor(180, 180, 180);
      doc.text('calcula-ai.lovable.app', PAGE_W / 2, y + 55, { align: 'center' });

      doc.save('CalculaAi-Tutorial-Completo.pdf');
    } catch (error) {
      console.error('Erro ao gerar PDF do tutorial:', error);
    } finally {
      setIsExporting(false);
    }
  };

  return { exportPDF, isExporting };
}
