import { describe, expect, it } from 'vitest';
import { emptyNutritionLabel, mergeNutritionImport, missingNutritionFields, nutritionLabelSchema, nutritionLabelsSchema, readNutritionLabels, NUTRIENTS } from '../nutritionLabel';
import { parseNutritionText } from '../nutritionImport';

describe('stock nutrition data', () => {
  it('keeps unknown amounts different from declared zero, including after serialization', () => {
    const label = emptyNutritionLabel('Marca A');
    label.nutrientes = [{ nutriente: 'Sódio', unidade: 'mg', quantidade: 0 }, { nutriente: 'Proteínas', unidade: 'g', quantidade: null }];
    const saved = nutritionLabelSchema.parse(JSON.parse(JSON.stringify(label)));
    expect(saved.nutrientes[0].quantidade).toBe(0);
    expect(saved.nutrientes[1].quantidade).toBeNull();
    expect(missingNutritionFields(saved)).toContain('Quantidade de Proteínas');
    expect(missingNutritionFields(saved)).not.toContain('Sódio');
  });

  it('rejects negative amounts and repeated nutrients', () => {
    for (const nutrientes of [
      [{ nutriente: 'Sódio', unidade: 'mg', quantidade: -1 }],
      [{ nutriente: 'Proteínas', unidade: 'g', quantidade: 1 }, { nutriente: 'Proteínas', unidade: 'g', quantidade: 2 }],
    ]) expect(nutritionLabelSchema.safeParse({ ...emptyNutritionLabel('Marca A'), nutrientes }).success).toBe(false);
  });

  it('accepts a complete manually transcribed table', () => {
    const label = { ...emptyNutritionLabel('Marca A'), quantidade_referencia: 100, nutrientes: NUTRIENTS.filter(item => item.obrigatorio).map(item => ({ nutriente: item.nome, unidade: item.unidade, quantidade: 0 })) };
    expect(missingNutritionFields(label)).toEqual([]);
  });

  it('accepts custom nutrients and reviews only the entered rows', () => {
    const label = { ...emptyNutritionLabel('Marca A'), quantidade_referencia: 100, nutrientes: [{ nutriente: 'Vitamina C', quantidade: 0, unidade: 'mg' }] };
    expect(nutritionLabelSchema.safeParse(label).success).toBe(true);
    expect(missingNutritionFields(label)).toEqual([]);
    expect(nutritionLabelsSchema.safeParse([label, { ...emptyNutritionLabel(' marca a '), marca: ' marca a ' }]).success).toBe(false);
  });

  it('reads legacy nutrition losslessly and prefers the collection when present', () => {
    const legacy = { versao: 1, quantidade_referencia: 20, unidade_referencia: 'g', marca: 'Marca antiga', nutrientes: [{ nutriente: 'sodio', quantidade: 0 }], foto_path: null, origem: 'manual', conferido: false };
    const converted = readNutritionLabels(null, legacy);
    expect(converted[0]).toMatchObject({ marca: 'Marca antiga', quantidade_referencia: 20, nutrientes: [{ nutriente: 'Sódio', quantidade: 0, unidade: 'mg' }] });
    expect(readNutritionLabels([], legacy)).toEqual([]);
    expect(() => readNutritionLabels({ invalid: true }, legacy)).toThrow();
  });

  it('imports an explicit 100 g column without mixing the portion or %VD', () => {
    const label = parseNutritionText('INFORMAÇÃO NUTRICIONAL\nPorções por embalagem: 5\nPorção: 20 g\n100 g    20 g    %VD\nValor energético (kcal) 420 84 4\nCarboidratos (g) 50 10 3\nAçúcares totais (g) 4,5 0,9\nAçúcares adicionados (g) 0 0 0\nSódio (mg) 100 20 1');
    expect(label.quantidade_referencia).toBe(100);
    expect(label.nutrientes).toContainEqual({ nutriente: 'Valor energético', unidade: 'kcal', quantidade: 420 });
    expect(label.nutrientes).toContainEqual({ nutriente: 'Açúcares totais', unidade: 'g', quantidade: 4.5 });
    expect(label.nutrientes).toContainEqual({ nutriente: 'Açúcares adicionados', unidade: 'g', quantidade: 0 });
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
    const current = { ...emptyNutritionLabel('Marca A'), quantidade_referencia: 20, nutrientes: [{ nutriente: 'Proteínas', unidade: 'g', quantidade: 3 }] };
    const imported = parseNutritionText('100 g\nProteínas (g) 10\nSódio (mg) 50');
    const merged = mergeNutritionImport(current, imported);
    expect(merged.quantidade_referencia).toBe(20);
    expect(merged.nutrientes).toEqual([{ nutriente: 'Proteínas', unidade: 'g', quantidade: 3 }, { nutriente: 'Sódio', unidade: 'mg', quantidade: null }]);
  });
});
