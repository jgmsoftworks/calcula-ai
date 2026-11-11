import { getBusinessRegion } from '@/lib/business-region';

export type ReceitaRendimento = { id: string; nome: string; imagem_url?: string | null; rendimento_valor?: number | null; rendimento_unidade?: string | null };
export type ProducaoRendimento = {
  receita_id?: string | null; receita_nome?: string | null; receita?: ReceitaRendimento | null;
  quantidade?: number | null; status?: string;
  rendimento_previsto?: number | null; rendimento_real?: number | null; rendimento_unidade?: string | null;
};
export const formatarRendimento = (valor: number) => new Intl.NumberFormat(getBusinessRegion().locale, { maximumFractionDigits: 3 }).format(valor);
export function rendimentoPrevisto(receita?: ReceitaRendimento | null, vezes = 1): number | null {
  const valor = receita?.rendimento_valor;
  if (!valor || !receita?.rendimento_unidade?.trim() || !Number.isFinite(valor) || valor <= 0 || !Number.isFinite(vezes) || vezes <= 0) return null;
  const total = Math.round(valor * vezes * 1000) / 1000;
  return total > 0 && total < 1e12 ? total : null;
}
export function rendimentoDaTarefa(tarefa: ProducaoRendimento) {
  const previsto = tarefa.rendimento_previsto ?? (tarefa.status !== 'feito' ? rendimentoPrevisto(tarefa.receita, tarefa.quantidade ?? 1) : null);
  const unidade = tarefa.rendimento_unidade || (tarefa.status !== 'feito' ? tarefa.receita?.rendimento_unidade : null) || '';
  return { previsto, unidade, real: tarefa.rendimento_real ?? null };
}
export const temReceitaProducao = (tarefa: ProducaoRendimento) => !!(tarefa.receita_id || tarefa.receita_nome || tarefa.receita);
export function parseRendimentoReal(text: string): number | null {
  if (!/^\d+(?:[,.]\d{1,3})?$/.test(text.trim())) return null;
  const value = Number(text.trim().replace(',', '.'));
  return Number.isFinite(value) && value >= 0 && value < 1e12 ? value : null;
}
