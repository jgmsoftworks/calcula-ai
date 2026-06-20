import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import { formatBRL, formatNumber } from '@/lib/formatters';

export interface RelatorioMeta {
  titulo: string;
  filtros?: string[];
  geradoEm?: string;
  empresa?: string;
}

export interface ColunaExport {
  key: string;
  header: string;
  width?: number; // PDF width
  align?: 'left' | 'right' | 'center';
  format?: 'text' | 'number' | 'currency' | 'int';
}

function fmtCell(v: any, fmt?: ColunaExport['format']): string {
  if (v === null || v === undefined || v === '') return '-';
  if (fmt === 'currency') return `R$ ${formatBRL(Number(v) || 0)}`;
  if (fmt === 'number') return formatNumber(Number(v) || 0, 2);
  if (fmt === 'int') return String(Math.round(Number(v) || 0));
  return String(v);
}

function fmtExcelCell(v: any, fmt?: ColunaExport['format']): any {
  if (v === null || v === undefined) return '';
  if (fmt === 'currency' || fmt === 'number' || fmt === 'int') return Number(v) || 0;
  return v;
}

export function exportarRelatorioExcel(
  meta: RelatorioMeta,
  colunas: ColunaExport[],
  rows: any[],
  totais?: Record<string, any>,
) {
  const wb = XLSX.utils.book_new();
  const headerLines: any[][] = [
    [meta.titulo],
    [`Gerado em: ${meta.geradoEm || new Date().toLocaleString('pt-BR')}`],
  ];
  if (meta.filtros && meta.filtros.length) {
    headerLines.push([`Filtros: ${meta.filtros.join(' | ')}`]);
  }
  headerLines.push([]);
  headerLines.push(colunas.map(c => c.header));

  const dataLines = rows.map(r => colunas.map(c => fmtExcelCell(r[c.key], c.format)));
  const allLines = [...headerLines, ...dataLines];

  if (totais) {
    allLines.push([]);
    allLines.push(['TOTAIS']);
    Object.entries(totais).forEach(([k, v]) => allLines.push([k, v]));
  }

  const ws = XLSX.utils.aoa_to_sheet(allLines);
  ws['!cols'] = colunas.map(c => ({ wch: Math.max(c.header.length + 2, 14) }));
  XLSX.utils.book_append_sheet(wb, ws, 'Relatório');

  const fileName = `${meta.titulo.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

export function exportarRelatorioPDF(
  meta: RelatorioMeta,
  colunas: ColunaExport[],
  rows: any[],
  totais?: Record<string, any>,
) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const marginX = 10;
  let y = 14;

  // Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(meta.titulo, marginX, y);
  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(110);
  doc.text(`Gerado em: ${meta.geradoEm || new Date().toLocaleString('pt-BR')}`, marginX, y);
  y += 4;
  if (meta.empresa) {
    doc.text(meta.empresa, marginX, y);
    y += 4;
  }
  if (meta.filtros && meta.filtros.length) {
    const filtrosStr = `Filtros: ${meta.filtros.join(' | ')}`;
    const lines = doc.splitTextToSize(filtrosStr, pageW - marginX * 2);
    doc.text(lines, marginX, y);
    y += lines.length * 4;
  }
  y += 2;
  doc.setTextColor(0);

  // Compute column widths
  const availW = pageW - marginX * 2;
  const totalDef = colunas.reduce((s, c) => s + (c.width || 1), 0);
  const widths = colunas.map(c => ((c.width || 1) / totalDef) * availW);

  // Table header
  const rowH = 6;
  const drawHeader = () => {
    doc.setFillColor(240, 240, 245);
    doc.rect(marginX, y, availW, rowH, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    let x = marginX;
    colunas.forEach((c, i) => {
      const w = widths[i];
      const align = c.align || (c.format && c.format !== 'text' ? 'right' : 'left');
      const tx = align === 'right' ? x + w - 2 : align === 'center' ? x + w / 2 : x + 2;
      doc.text(c.header, tx, y + 4, { align });
      x += w;
    });
    y += rowH;
    doc.setFont('helvetica', 'normal');
  };

  drawHeader();

  doc.setFontSize(8);
  rows.forEach((r, idx) => {
    if (y + rowH > pageH - 14) {
      doc.addPage();
      y = 14;
      drawHeader();
    }
    if (idx % 2 === 0) {
      doc.setFillColor(250, 250, 252);
      doc.rect(marginX, y, availW, rowH, 'F');
    }
    let x = marginX;
    colunas.forEach((c, i) => {
      const w = widths[i];
      const align = c.align || (c.format && c.format !== 'text' ? 'right' : 'left');
      const tx = align === 'right' ? x + w - 2 : align === 'center' ? x + w / 2 : x + 2;
      const text = fmtCell(r[c.key], c.format);
      const truncated = doc.splitTextToSize(text, w - 3)[0] || '';
      doc.text(truncated, tx, y + 4, { align });
      x += w;
    });
    y += rowH;
  });

  if (totais) {
    y += 2;
    if (y + 14 > pageH - 14) { doc.addPage(); y = 14; }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('Totais', marginX, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    Object.entries(totais).forEach(([k, v]) => {
      doc.text(`${k}: ${v}`, marginX, y);
      y += 4;
    });
  }

  // Footer with page numbers
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(140);
    doc.text(`Página ${i} de ${pages}`, pageW - marginX, pageH - 6, { align: 'right' });
    doc.text('CalculaAi', marginX, pageH - 6);
  }

  const fileName = `${meta.titulo.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(fileName);
}
