import { useState } from 'react';
import jsPDF from 'jspdf';
import { sections } from '@/data/tutorialData';

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 20;
const CONTENT_W = PAGE_W - MARGIN * 2;
const BOTTOM_LIMIT = PAGE_H - MARGIN;

// Section colors (HSL converted to RGB for jsPDF)
const SECTION_COLORS: Record<string, [number, number, number]> = {
  dashboard: [14, 110, 184],
  estoque: [66, 66, 140],
  movimentacao: [120, 50, 120],
  receitas: [168, 30, 100],
  custos: [190, 40, 60],
  precificacao: [210, 120, 30],
};

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
  return doc.splitTextToSize(text, maxWidth);
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
  const parts = bullet.split('**');
  // Build plain text for wrapping calculation
  const plainText = parts.join('');
  const lines = wrapText(doc, plainText, CONTENT_W - 10);
  const lineHeight = 5;
  const neededH = lines.length * lineHeight + 2;

  y = ensureSpace(doc, y, neededH);

  // Draw bullet dot
  doc.setFillColor(color[0], color[1], color[2]);
  doc.circle(MARGIN + 3, y + 2, 1, 'F');

  // Render text with bold segments
  let curX = MARGIN + 8;
  let curY = y;
  const maxX = MARGIN + CONTENT_W;

  for (let pi = 0; pi < parts.length; pi++) {
    const isBold = pi % 2 === 1;
    doc.setFont('helvetica', isBold ? 'bold' : 'normal');
    doc.setFontSize(9);
    doc.setTextColor(50, 50, 50);

    const words = parts[pi].split(' ');
    for (const word of words) {
      if (!word) continue;
      const wordW = doc.getTextWidth(word + ' ');
      if (curX + wordW > maxX) {
        curX = MARGIN + 8;
        curY += lineHeight;
        curY = ensureSpace(doc, curY, lineHeight);
      }
      doc.text(word + ' ', curX, curY + 3);
      curX += wordW;
    }
  }

  return curY + lineHeight + 1;
}

function drawTip(doc: jsPDF, tip: string, y: number): number {
  doc.setFontSize(8);
  const lines = wrapText(doc, '💡 ' + tip, CONTENT_W - 12);
  const boxH = lines.length * 4.5 + 6;

  y = ensureSpace(doc, y, boxH + 2);

  // Tip background
  doc.setFillColor(240, 245, 255);
  doc.roundedRect(MARGIN + 2, y, CONTENT_W - 4, boxH, 2, 2, 'F');

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 100);
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
      // Background gradient simulation
      doc.setFillColor(14, 110, 184);
      doc.rect(0, 0, PAGE_W, PAGE_H / 2, 'F');
      doc.setFillColor(120, 50, 150);
      doc.rect(0, PAGE_H / 2, PAGE_W, PAGE_H / 2, 'F');

      // Decorative circles
      doc.setFillColor(255, 255, 255, 15);
      doc.setGState(doc.GState({ opacity: 0.08 }));
      doc.circle(160, 40, 50, 'F');
      doc.circle(50, 250, 40, 'F');
      doc.setGState(doc.GState({ opacity: 1 }));

      // Title
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

      // Date
      doc.setFontSize(11);
      const now = new Date();
      const dateStr = now.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
      doc.text(`Gerado em ${dateStr}`, PAGE_W / 2, 200, { align: 'center' });

      // Table of contents
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Conteúdo:', PAGE_W / 2, 225, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      sections.forEach((s, i) => {
        doc.text(`${i + 1}. ${s.title} — ${s.subtitle}`, PAGE_W / 2, 237 + i * 8, { align: 'center' });
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
        doc.text(section.title, MARGIN + 16, y + 8);

        doc.setTextColor(120, 120, 120);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.text(section.subtitle, MARGIN + 16, y + 14);

        y += 22;

        // Main image
        const mainB64 = await loadImageAsBase64(section.mainImage);
        if (mainB64) {
          const dims = await getImageDimensions(mainB64);
          const imgW = Math.min(CONTENT_W, 160);
          const imgH = (dims.h / dims.w) * imgW;
          const fittedH = Math.min(imgH, 90);

          y = ensureSpace(doc, y, fittedH + 4);

          // Shadow
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

          // Estimate needed height for title + image preview
          const estH = 60; // minimum estimate
          y = ensureSpace(doc, y, estH);

          // Separator line between sub-screens
          if (ssi > 0) {
            doc.setDrawColor(220, 220, 220);
            doc.setLineWidth(0.3);
            doc.line(MARGIN + 10, y, MARGIN + CONTENT_W - 10, y);
            y += 6;
          }

          // Sub-screen number badge + title
          y = ensureSpace(doc, y, 12);
          doc.setFillColor(color[0], color[1], color[2]);
          doc.circle(MARGIN + 4, y + 3, 4, 'F');
          doc.setTextColor(255, 255, 255);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(9);
          doc.text(String(ssi + 1), MARGIN + 4, y + 5, { align: 'center' });

          doc.setTextColor(40, 40, 40);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(13);
          doc.text(sub.title, MARGIN + 12, y + 5);
          y += 12;

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
          const descLines = wrapText(doc, sub.description, CONTENT_W);
          y = ensureSpace(doc, y, descLines.length * 4.5 + 4);
          doc.text(descLines, MARGIN, y);
          y += descLines.length * 4.5 + 4;

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
      doc.text('Pronto para começar! 🚀', PAGE_W / 2, y + 10, { align: 'center' });

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
