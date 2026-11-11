import { describe, expect, it, vi } from 'vitest';
vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }));
import { custoUnitarioGeladeira, receitaPodeEntrar } from '../geladeiraData';
import { calcularDadosReceita } from '../receitasData';
import type { ReceitaComDados } from '@/types/receitas';
const recipe = (changes = {}) => ({ rendimento_valor: 10, rendimento_unidade: 'un', status: 'finalizada', preco_venda: 999,
  custo_ingredientes: 5, custo_embalagens: 4, custo_mao_obra: 3, custo_sub_receitas: 5, ...changes } as ReceitaComDados);
describe('Fridge costs', () => {
  it('uses total recipe cost divided by output for both final and subrecipes', () => {
    expect(custoUnitarioGeladeira(recipe())).toBe(1.7);
    expect(custoUnitarioGeladeira(recipe({ markup: { tipo: 'sub_receita' }, rendimento_valor: 2 }))).toBe(8.5);
  });
  it('keeps zero cost valid but does not invent a cost for missing yield', () => {
    expect(custoUnitarioGeladeira(recipe({ custo_ingredientes: 0, custo_embalagens: 0, custo_mao_obra: 0, custo_sub_receitas: 0 }))).toBe(0);
    for (const rendimento_valor of [0, null, -1, NaN, Infinity]) expect(custoUnitarioGeladeira(recipe({ rendimento_valor }))).toBeNull();
    expect(receitaPodeEntrar(recipe({ rendimento_unidade: '' }))).toBe(false);
    expect(receitaPodeEntrar(recipe({ status: 'rascunho' }))).toBe(false);
  });
  it('reuses the recipe component calculation with fractional units', () => {
    const data = calcularDadosReceita({ ...recipe(), ingredientes: [{ quantidade: 500, produto: { custo_unitario: 10, unidade_uso: 'g', fator_conversao: 1000 } }],
      embalagens: [{ quantidade: 2, produto: { custo_unitario: 2, unidade_uso: null, fator_conversao: null } }], mao_obra: [{ valor_total: 3 }],
      sub_receitas: [{ quantidade: 0.5, sub_receita: { preco_venda: 20, rendimento_valor: 2 } }] });
    expect(custoUnitarioGeladeira(data)).toBe(1.7);
  });
});
