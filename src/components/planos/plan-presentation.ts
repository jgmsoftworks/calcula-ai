import type { Plano, PlanoLimites, PlanSlug } from '@/hooks/usePlanos';

export const planPositioning: Record<PlanSlug, { audience: string; description: string }> = {
  lite: { audience: 'Para começar', description: 'Organize os custos das suas primeiras receitas e defina seus preços.' },
  professional: { audience: 'Para ampliar o cardápio', description: 'Mais receitas e fichas técnicas para acompanhar o ritmo da sua produção.' },
  enterprise: { audience: 'Para uma operação maior', description: 'Receitas, matérias-primas e fichas técnicas sem limite de quantidade.' },
};

export const comparisonRows: { key: keyof PlanoLimites; label: string; explanation?: string }[] = [
  { key: 'receitas', label: 'Receitas cadastradas' },
  { key: 'produtos', label: 'Matérias-primas' },
  { key: 'markups', label: 'Blocos de precificação', explanation: 'Markup' },
  { key: 'pdf_exports', label: 'Fichas técnicas em PDF', explanation: 'Downloads e impressões por mês' },
  { key: 'movimentacoes', label: 'Movimentações de estoque' },
];

export function annualSaving(plan: Plano) {
  if (plan.preco_centavos <= 0 || plan.preco_anual_centavos <= 0) return 0;
  return Math.max(0, plan.preco_centavos * 12 - plan.preco_anual_centavos);
}

export function limitLabel(value: number | undefined) {
  if (value === undefined || value === null) return 'Não informado';
  if (value === -1) return 'Sem limite';
  if (value === 0) return 'Não incluído';
  return value.toLocaleString('pt-BR');
}

export function planBenefits(plan: Plano) {
  const { receitas, produtos, markups, pdf_exports, movimentacoes } = plan.limites;
  const amount = (value: number | undefined, single: string, plural: string) =>
    value === -1 ? `${plural} sem limite` : value === undefined ? `${plural}: consulte os limites` : `${value} ${value === 1 ? single : plural.toLocaleLowerCase('pt-BR')}`;
  const benefits = [
    { label: amount(receitas, 'receita', 'Receitas'), included: receitas !== 0 },
    { label: amount(produtos, 'matéria-prima', 'Matérias-primas'), included: produtos !== 0 },
    { label: amount(markups, 'bloco de precificação', 'Blocos de precificação'), included: markups !== 0 },
    { label: pdf_exports === 0 ? 'Fichas técnicas em PDF não incluídas' : pdf_exports === -1 ? 'Fichas técnicas em PDF sem limite' : `${pdf_exports} fichas técnicas em PDF por mês`, included: pdf_exports !== 0 },
    { label: movimentacoes === -1 ? 'Movimentações de estoque sem limite' : amount(movimentacoes, 'movimentação de estoque', 'Movimentações de estoque'), included: movimentacoes !== 0 },
  ];
  // Keep catalog extras, while quantities above always use the enforced limits.
  const extras = plan.features.filter(feature => !/receita|mat[eé]ria|markup|precifica|movimenta|ficha|impress|ilimitad/i.test(feature));
  return [...benefits, ...extras.map(label => ({ label, included: true }))];
}
