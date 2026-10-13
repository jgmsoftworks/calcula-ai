import { z } from 'zod';

export const NUTRIENTS = [
  { id: 'energia', nome: 'Valor energético', unidade: 'kcal', obrigatorio: true },
  { id: 'carboidratos', nome: 'Carboidratos', unidade: 'g', obrigatorio: true },
  { id: 'acucares_totais', nome: 'Açúcares totais', unidade: 'g', obrigatorio: true },
  { id: 'acucares_adicionados', nome: 'Açúcares adicionados', unidade: 'g', obrigatorio: true },
  { id: 'proteinas', nome: 'Proteínas', unidade: 'g', obrigatorio: true },
  { id: 'gorduras_totais', nome: 'Gorduras totais', unidade: 'g', obrigatorio: true },
  { id: 'gorduras_saturadas', nome: 'Gorduras saturadas', unidade: 'g', obrigatorio: true },
  { id: 'gorduras_trans', nome: 'Gorduras trans', unidade: 'g', obrigatorio: true },
  { id: 'fibras', nome: 'Fibras alimentares', unidade: 'g', obrigatorio: true },
  { id: 'sodio', nome: 'Sódio', unidade: 'mg', obrigatorio: true },
  { id: 'lactose', nome: 'Lactose', unidade: 'g', obrigatorio: false },
  { id: 'galactose', nome: 'Galactose', unidade: 'g', obrigatorio: false },
] as const;

export type NutrientId = typeof NUTRIENTS[number]['id'];
const amount = z.number().finite().min(0).max(1_000_000);
const legacyNutritionLabelSchema = z.object({
  versao: z.literal(1),
  quantidade_referencia: amount.positive().nullable(),
  unidade_referencia: z.enum(['g', 'kg', 'ml', 'l']),
  marca: z.string().max(120),
  nutrientes: z.array(z.object({
    nutriente: z.string().refine(value => value === '' || NUTRIENTS.some(item => item.id === value)),
    quantidade: amount.nullable(),
  }).strict()).max(12),
  foto_path: z.string().max(250).nullable(),
  origem: z.enum(['manual', 'foto']),
  conferido: z.boolean(),
}).strict().refine(value => {
  const ids = value.nutrientes.map(row => row.nutriente).filter(Boolean);
  return new Set(ids).size === ids.length;
}, 'Não repita o mesmo nutriente.');

export const nutritionKey = (name: string) => name.trim().toLowerCase();
export const MAX_NUTRITION_LABELS = 50;
export const MAX_NUTRITION_ROWS = 100;
export const nutritionLabelSchema = z.object({
  versao: z.literal(2),
  id: z.string().uuid(),
  quantidade_referencia: amount.positive().nullable(),
  unidade_referencia: z.enum(['g', 'kg', 'ml', 'l']),
  marca: z.string().max(120),
  nutrientes: z.array(z.object({
    nutriente: z.string().max(120),
    quantidade: amount.nullable(),
    unidade: z.string().max(16),
  }).strict()).max(MAX_NUTRITION_ROWS),
  foto_path: z.string().max(250).nullable(),
  origem: z.enum(['manual', 'foto']),
  conferido: z.boolean(),
}).strict().refine(value => {
  const names = value.nutrientes.map(row => nutritionKey(row.nutriente)).filter(Boolean);
  return new Set(names).size === names.length;
}, 'Não repita o mesmo nutriente.');

export const nutritionLabelsSchema = z.array(nutritionLabelSchema).max(MAX_NUTRITION_LABELS).refine(labels => {
  const brands = labels.map(label => nutritionKey(label.marca));
  return new Set(brands).size === brands.length && new Set(labels.map(label => label.id)).size === labels.length;
}, 'Cada marca deve ter apenas um rótulo.');

export type NutritionLabel = z.infer<typeof nutritionLabelSchema>;
export type NutritionRow = NutritionLabel['nutrientes'][number];

export function emptyNutritionLabel(marca = ''): NutritionLabel {
  return {
    versao: 2, id: crypto.randomUUID(), quantidade_referencia: null, unidade_referencia: 'g', marca,
    nutrientes: [{ nutriente: '', quantidade: null, unidade: '' }], foto_path: null,
    origem: 'manual', conferido: false,
  };
}

export function readNutritionLabel(value: unknown): NutritionLabel | null {
  const current = nutritionLabelSchema.safeParse(value);
  if (current.success) return current.data;
  const legacy = legacyNutritionLabelSchema.safeParse(value);
  if (!legacy.success) return null;
  return { ...legacy.data, versao: 2, id: crypto.randomUUID(), nutrientes: legacy.data.nutrientes.map(row => {
    const known = NUTRIENTS.find(item => item.id === row.nutriente);
    return { ...row, nutriente: known?.nome ?? row.nutriente, unidade: known?.unidade ?? '' };
  }) };
}

/** A separate column keeps older clients from overwriting the new collection. */
export function readNutritionLabels(current: unknown, legacy?: unknown): NutritionLabel[] {
  if (current !== undefined && current !== null) {
    const parsed = nutritionLabelsSchema.safeParse(current);
    if (!parsed.success) throw new Error('Não foi possível ler os rótulos salvos. Atualize a página antes de editar.');
    return parsed.data;
  }
  const label = readNutritionLabel(legacy);
  if (legacy != null && !label) throw new Error('Não foi possível ler o rótulo salvo.');
  return label ? [label] : [];
}

/** Only the rows actually entered are reviewed; there is no mandatory nutrient list. */
export function missingNutritionFields(value: NutritionLabel): string[] {
  const missing: string[] = [];
  if (!value.marca.trim()) missing.push('Marca');
  if (value.quantidade_referencia === null) missing.push('Quantidade de referência');
  if (!value.nutrientes.length) missing.push('Adicione uma linha');
  value.nutrientes.forEach((row, index) => {
    if (!row.nutriente.trim()) missing.push(`Nome da linha ${index + 1}`);
    if (row.quantidade === null) missing.push(`Quantidade de ${row.nutriente || `linha ${index + 1}`}`);
    if (!row.unidade.trim()) missing.push(`Unidade de ${row.nutriente || `linha ${index + 1}`}`);
  });
  return missing;
}

/** Add new nutrients only: never replace manual values or the selected brand/id. */
export function mergeNutritionImport(current: NutritionLabel, imported: NutritionLabel): NutritionLabel {
  const selected = new Set(current.nutrientes.map(row => nutritionKey(row.nutriente)).filter(Boolean));
  const existing = current.nutrientes.filter(row => row.nutriente || row.quantidade !== null || row.unidade);
  const compatibleBasis = current.quantidade_referencia === null || (
    current.quantidade_referencia === imported.quantidade_referencia && current.unidade_referencia === imported.unidade_referencia
  );
  return {
    ...current,
    quantidade_referencia: current.quantidade_referencia ?? imported.quantidade_referencia,
    unidade_referencia: current.quantidade_referencia === null ? imported.unidade_referencia : current.unidade_referencia,
    nutrientes: [...existing, ...imported.nutrientes.filter(row => row.nutriente && !selected.has(nutritionKey(row.nutriente)))
      .map(row => compatibleBasis ? row : { ...row, quantidade: null })].slice(0, MAX_NUTRITION_ROWS),
    origem: 'foto', conferido: false,
  };
}
