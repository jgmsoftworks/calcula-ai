import { emptyNutritionLabel, type NutritionLabel, type NutrientId } from './nutritionLabel';

const patterns: [NutrientId, RegExp][] = [
  ['energia', /valor energetico|energia/],
  ['acucares_adicionados', /acucares adicionados/],
  ['acucares_totais', /acucares totais/],
  ['carboidratos', /carboidratos/],
  ['proteinas', /proteinas/],
  ['gorduras_saturadas', /gorduras saturadas/],
  ['gorduras_trans', /gorduras trans/],
  ['gorduras_totais', /gorduras totais/],
  ['fibras', /fibras (?:alimentares|alimentar)|fibra alimentar/],
  ['sodio', /sodio/], ['lactose', /lactose/], ['galactose', /galactose/],
];
const normalize = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const numeric = (text: string) => Number(text.replace(',', '.'));

/** Conservative OCR parsing: unknown columns/units remain blank for human transcription. */
export function parseNutritionText(text: string): NutritionLabel {
  const result = emptyNutritionLabel();
  result.nutrientes = [];
  result.origem = 'foto';
  const lines = normalize(text).split(/\r?\n/).filter(line => line.trim());
  const firstData = lines.findIndex(line => patterns.some(([, regex]) => regex.test(line)));
  const header = lines.slice(0, firstData < 0 ? lines.length : firstData);
  // Only an explicit column heading (not the package size or serving description) establishes a basis.
  const columnLine = [...header].reverse().find(line =>
    !/porc(?:ao|oes)|embalagem/.test(line) && /^\s*[|:]?\s*\d+(?:[.,]\d+)?\s*(?:kg|ml|g|l)\b/.test(line));
  const columns = columnLine ? [...columnLine.matchAll(/\b(\d+(?:[.,]\d+)?)\s*(kg|ml|g|l)\b/g)] : [];
  if (columns.length && numeric(columns[0][1]) > 0 && numeric(columns[0][1]) <= 1_000_000) {
    result.quantidade_referencia = numeric(columns[0][1]);
    result.unidade_referencia = columns[0][2] as NutritionLabel['unidade_referencia'];
  } else if (header.some(line => /quantidade por porc(?:ao|oes)/.test(line))) {
    const serving = header.join(' ').match(/porcao\s*:?\s*(\d+(?:[.,]\d+)?)\s*(kg|ml|g|l)\b/);
    if (serving && numeric(serving[1]) > 0 && numeric(serving[1]) <= 1_000_000) {
      result.quantidade_referencia = numeric(serving[1]);
      result.unidade_referencia = serving[2] as NutritionLabel['unidade_referencia'];
    }
  }
  for (const line of lines) {
    const match = patterns.find(([, regex]) => regex.test(line));
    if (!match || result.nutrientes.some(row => row.nutriente === match[0])) continue;
    const [id, regex] = match;
    const tail = line.slice((line.match(regex)?.index ?? 0) + (line.match(regex)?.[0].length ?? 0));
    // Do not turn inequalities, missing values, kJ or invalid decimal separators into exact amounts.
    const uncertain = /[<>≤≥]|nao|significativ|kj|\d[.,]\d+[.,]\d/.test(tail);
    const values = [...tail.matchAll(/\b\d+(?:[.,]\d+)?\b/g)];
    const unit = tail.match(/\b(kcal|mg|g)\b/)?.[1];
    const expectedUnit = id === 'energia' ? 'kcal' : id === 'sodio' ? 'mg' : 'g';
    const value = values.length ? numeric(values[0][0]) : null;
    const enoughColumns = values.length >= Math.max(columns.length, 1);
    result.nutrientes.push({
      nutriente: id,
      quantidade: !uncertain && enoughColumns && result.quantidade_referencia !== null && unit === expectedUnit && value !== null && value <= 1_000_000 ? value : null,
    });
  }
  return result;
}
