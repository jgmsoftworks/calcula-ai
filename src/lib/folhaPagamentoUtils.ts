// Helper compartilhado para cálculo do custo total mensal de um funcionário.
// Fonte de verdade única — usada em Custos > Folha de Pagamento e em Precificação > Markup.

export interface FuncionarioCusto {
  salario_base?: number | null;
  adicional?: number | null;
  desconto?: number | null;
  fgts_percent?: number | null;
  fgts_valor?: number | null;
  inss_percent?: number | null;
  inss_valor?: number | null;
  rat_percent?: number | null;
  rat_valor?: number | null;
  ferias_percent?: number | null;
  ferias_valor?: number | null;
  vale_transporte_percent?: number | null;
  vale_transporte_valor?: number | null;
  vale_alimentacao_percent?: number | null;
  vale_alimentacao_valor?: number | null;
  vale_refeicao_percent?: number | null;
  vale_refeicao_valor?: number | null;
  plano_saude_percent?: number | null;
  plano_saude_valor?: number | null;
  outros_percent?: number | null;
  outros_valor?: number | null;
}

// Mesma regra usada em FolhaPagamento.tsx (calculateItemValue):
// se houver percentual definido (>0), aplica-o sobre o salário base; caso contrário usa o valor fixo.
const calculateItemValue = (
  percent: number | null | undefined,
  valor: number | null | undefined,
  salarioBase: number,
): number => {
  const p = Number(percent) || 0;
  const v = Number(valor) || 0;
  if (p > 0) {
    return Math.round((salarioBase * p) / 100 * 100) / 100;
  }
  return v;
};

export const calcularCustoTotalFuncionario = (f: FuncionarioCusto): number => {
  const salarioBase = Number(f.salario_base) || 0;
  const adicional = Number(f.adicional) || 0;
  const desconto = Number(f.desconto) || 0;

  const fgts = calculateItemValue(f.fgts_percent, f.fgts_valor, salarioBase);
  const inss = calculateItemValue(f.inss_percent, f.inss_valor, salarioBase);
  const rat = calculateItemValue(f.rat_percent, f.rat_valor, salarioBase);
  const ferias = calculateItemValue(f.ferias_percent, f.ferias_valor, salarioBase);
  const vt = calculateItemValue(f.vale_transporte_percent, f.vale_transporte_valor, salarioBase);
  const va = calculateItemValue(f.vale_alimentacao_percent, f.vale_alimentacao_valor, salarioBase);
  const vr = calculateItemValue(f.vale_refeicao_percent, f.vale_refeicao_valor, salarioBase);
  const plano = calculateItemValue(f.plano_saude_percent, f.plano_saude_valor, salarioBase);
  const outros = calculateItemValue(f.outros_percent, f.outros_valor, salarioBase);

  const total =
    salarioBase + adicional - desconto +
    fgts + inss + rat + ferias + vt + va + vr + plano + outros;

  return Math.round(total * 100) / 100;
};
