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
export const nutritionLabelSchema = z.object({
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

export type NutritionLabel = z.infer<typeof nutritionLabelSchema>;
export type NutritionRow = NutritionLabel['nutrientes'][number];

export function emptyNutritionLabel(marca = ''): NutritionLabel {
  return {
    versao: 1, quantidade_referencia: null, unidade_referencia: 'g', marca,
    nutrientes: [{ nutriente: '', quantidade: null }], foto_path: null,
    origem: 'manual', conferido: false,
  };
}

export function readNutritionLabel(value: unknown): NutritionLabel | null {
  const result = nutritionLabelSchema.safeParse(value);
  return result.success ? result.data : null;
}

export function missingNutritionFields(value: NutritionLabel): string[] {
  const missing: string[] = [];
  if (value.quantidade_referencia === null) missing.push('Quantidade de referência');
  for (const nutrient of NUTRIENTS) {
    if (nutrient.obrigatorio && !value.nutrientes.some(row => row.nutriente === nutrient.id && row.quantidade !== null)) {
      missing.push(nutrient.nome);
    }
  }
  return missing;
}

/** Add new nutrients only: importing a second photo never overwrites the user's entries. */
export function mergeNutritionImport(current: NutritionLabel, imported: NutritionLabel): NutritionLabel {
  const selected = new Set(current.nutrientes.map(row => row.nutriente).filter(Boolean));
  const existing = current.nutrientes.filter(row => row.nutriente);
  const compatibleBasis = current.quantidade_referencia === null || (
    current.quantidade_referencia === imported.quantidade_referencia && current.unidade_referencia === imported.unidade_referencia
  );
  return {
    ...current,
    quantidade_referencia: current.quantidade_referencia ?? imported.quantidade_referencia,
    unidade_referencia: current.quantidade_referencia === null ? imported.unidade_referencia : current.unidade_referencia,
    nutrientes: [...existing, ...imported.nutrientes.filter(row => row.nutriente && !selected.has(row.nutriente))
      .map(row => compatibleBasis ? row : { ...row, quantidade: null })],
    origem: 'foto', conferido: false,
  };
}
