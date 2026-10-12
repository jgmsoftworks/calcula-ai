import { describe, expect, it } from 'vitest';
import { emptyNutritionLabel, mergeNutritionImport, missingNutritionFields, nutritionLabelSchema, NUTRIENTS } from '../nutritionLabel';
import { parseNutritionText } from '../nutritionImport';

describe('stock nutrition data', () => {
  it('keeps unknown amounts different from declared zero, including after serialization', () => {
    const label = emptyNutritionLabel();
    label.nutrientes = [{ nutriente: 'sodio', quantidade: 0 }, { nutriente: 'proteinas', quantidade: null }];
    const saved = nutritionLabelSchema.parse(JSON.parse(JSON.stringify(label)));
    expect(saved.nutrientes[0].quantidade).toBe(0);
    expect(saved.nutrientes[1].quantidade).toBeNull();
    expect(missingNutritionFields(saved)).toContain('Proteínas');
    expect(missingNutritionFields(saved)).not.toContain('Sódio');
  });

  it('rejects negative amounts, repeated nutrients and unsupported labels', () => {
    for (const nutrientes of [
      [{ nutriente: 'sodio', quantidade: -1 }],
      [{ nutriente: 'proteinas', quantidade: 1 }, { nutriente: 'proteinas', quantidade: 2 }],
      [{ nutriente: 'zero_acucar', quantidade: 0 }],
    ]) expect(nutritionLabelSchema.safeParse({ ...emptyNutritionLabel(), nutrientes }).success).toBe(false);
  });

  it('accepts a complete manually transcribed table', () => {
    const label = { ...emptyNutritionLabel(), quantidade_referencia: 100, nutrientes: NUTRIENTS.filter(item => item.obrigatorio).map(item => ({ nutriente: item.id, quantidade: 0 })) };
    expect(missingNutritionFields(label)).toEqual([]);
  });

  it('imports an explicit 100 g column without mixing the portion or %VD', () => {
    const label = parseNutritionText('INFORMAÇÃO NUTRICIONAL\nPorções por embalagem: 5\nPorção: 20 g\n100 g    20 g    %VD\nValor energético (kcal) 420 84 4\nCarboidratos (g) 50 10 3\nAçúcares totais (g) 4,5 0,9\nAçúcares adicionados (g) 0 0 0\nSódio (mg) 100 20 1');
    expect(label.quantidade_referencia).toBe(100);
    expect(label.nutrientes).toContainEqual({ nutriente: 'energia', quantidade: 420 });
    expect(label.nutrientes).toContainEqual({ nutriente: 'acucares_totais', quantidade: 4.5 });
    expect(label.nutrientes).toContainEqual({ nutriente: 'acucares_adicionados', quantidade: 0 });
    expect(label.conferido).toBe(false);
  });

  it('uses the first explicit column even when it is a serving rather than 100 g', () => {
    const label = parseNutritionText('30 g    100 g    %VD\nProteínas (g) 3 10 6');
    expect(label.quantidade_referencia).toBe(30);
    expect(label.nutrientes[0].quantidade).toBe(3);
  });

  it('leaves ambiguous OCR data blank instead of inventing a basis, unit or zero', () => {
    const missingHeader = parseNutritionText('Peso líquido 500 g\nPorção: 20 g\nProteínas (g) 8 1,6 3');
    expect(missingHeader.quantidade_referencia).toBeNull();
    expect(missingHeader.nutrientes[0].quantidade).toBeNull();
    const label = parseNutritionText('100 g\nProteínas (g) < 0,5\nSódio (g) 2\nCarboidratos (g) —\nValor energético (kJ) 100');
    expect(label.nutrientes.every(item => item.quantidade === null)).toBe(true);
  });

  it('keeps existing manual amounts and refuses to mix reference quantities', () => {
    const current = { ...emptyNutritionLabel(), quantidade_referencia: 20, nutrientes: [{ nutriente: 'proteinas', quantidade: 3 }] };
    const imported = parseNutritionText('100 g\nProteínas (g) 10\nSódio (mg) 50');
    const merged = mergeNutritionImport(current, imported);
    expect(merged.quantidade_referencia).toBe(20);
    expect(merged.nutrientes).toEqual([{ nutriente: 'proteinas', quantidade: 3 }, { nutriente: 'sodio', quantidade: null }]);
  });
});
