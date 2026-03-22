// ============================================================
// CMV Calculations — Lógica isolada para Custo de Mercadoria Vendida
// Fórmula: CMV = Estoque Inicial + Compras Líquidas - Estoque Final
// ============================================================

import { toZonedTime, fromZonedTime } from 'date-fns-tz';
import { supabase } from '@/integrations/supabase/client';

const BRASILIA_TZ = 'America/Sao_Paulo';

// Motivos que invalidam uma entrada como "compra"
const MOTIVOS_EXCLUIDOS = ['ajuste', 'inventário', 'transferência', 'bonificação', 'cancelamento'];

// -------------------------------------------------------
// Tipos
// -------------------------------------------------------

export interface CmvBreakdown {
  estoqueInicial: number | null;
  estoqueInicialEstimado: boolean;
  comprasLiquidas: number;
  estoqueFinal: number;
  faturamentoLiquido: number | null;
}

export interface CmvResult {
  cmvDisponivel: boolean;
  cmvValor: number | null;
  cmvPercentual: number | null;
  breakdown: CmvBreakdown;
}

interface Movimentacao {
  quantidade: number;
  custo_aplicado: number | null;
  subtotal: number | null;
  motivo: string | null;
}

interface ProdutoEstoque {
  estoque_atual: number;
  custo_unitario: number;
}

// -------------------------------------------------------
// getCurrentMonthRangeBrasilia
// Retorna { start, end } em ISO UTC para o mês atual em Brasília
// -------------------------------------------------------
export function getCurrentMonthRangeBrasilia(): { start: string; end: string } {
  const now = new Date();
  const nowBrasilia = toZonedTime(now, BRASILIA_TZ);

  // Primeiro dia do mês às 00:00:00 em Brasília
  const startOfMonth = new Date(nowBrasilia.getFullYear(), nowBrasilia.getMonth(), 1, 0, 0, 0);
  const startUTC = fromZonedTime(startOfMonth, BRASILIA_TZ);

  // Momento atual convertido
  const endUTC = fromZonedTime(nowBrasilia, BRASILIA_TZ);

  return {
    start: startUTC.toISOString(),
    end: endUTC.toISOString(),
  };
}

// -------------------------------------------------------
// getCompetenciaAnterior
// Retorna a competência do mês anterior no formato "YYYY-MM"
// -------------------------------------------------------
export function getCompetenciaAnterior(): string {
  const now = new Date();
  const nowBrasilia = toZonedTime(now, BRASILIA_TZ);
  const year = nowBrasilia.getFullYear();
  const month = nowBrasilia.getMonth(); // 0-indexed, já é o mês anterior ao atual

  // Se janeiro (0), voltar para dezembro do ano anterior
  const prevYear = month === 0 ? year - 1 : year;
  const prevMonth = month === 0 ? 12 : month;

  return `${prevYear}-${String(prevMonth).padStart(2, '0')}`;
}

// -------------------------------------------------------
// calculateEstoqueFinal
// EF = SUM(estoque_atual * custo_unitario) dos produtos ativos
// -------------------------------------------------------
export function calculateEstoqueFinal(produtos: ProdutoEstoque[]): number {
  return produtos.reduce((sum, p) => {
    return sum + ((p.estoque_atual || 0) * (p.custo_unitario || 0));
  }, 0);
}

// -------------------------------------------------------
// calculateComprasLiquidas
// Soma entradas válidas a custo, exclui ajustes/inventário/etc,
// subtrai devoluções ao fornecedor
// -------------------------------------------------------
export function calculateComprasLiquidas(entradas: Movimentacao[]): number {
  return entradas.reduce((sum, mov) => {
    const motivo = (mov.motivo || '').toLowerCase();

    // Verificar se é motivo excluído
    const isExcluido = MOTIVOS_EXCLUIDOS.some((m) => motivo.includes(m));
    if (isExcluido) return sum;

    const valorItem = (mov.custo_aplicado || 0) * (mov.quantidade || 0);

    // Devolução ao fornecedor: subtrair
    if (motivo.includes('devolução') && motivo.includes('fornecedor')) {
      return sum - valorItem;
    }

    // Entrada válida: somar
    return sum + valorItem;
  }, 0);
}

// -------------------------------------------------------
// getEstoqueInicialReal
// Busca o fechamento do mês anterior. Retorna null se não existir.
// NÃO cria estimativa nem reconstrói EI por fórmula.
// -------------------------------------------------------
export async function getEstoqueInicialReal(
  userId: string,
  competenciaAnterior: string
): Promise<number | null> {
  const { data, error } = await supabase
    .from('estoque_fechamentos_mensais')
    .select('valor_estoque_fechamento')
    .eq('user_id', userId)
    .eq('competencia', competenciaAnterior)
    .maybeSingle();

  if (error) {
    console.error('Erro ao buscar fechamento mensal:', error);
    return null;
  }

  if (!data) return null;

  return Number(data.valor_estoque_fechamento);
}

// -------------------------------------------------------
// calculateCMVValor
// CMV = EI + Compras Líquidas - EF
// -------------------------------------------------------
export function calculateCMVValor(
  estoqueInicial: number,
  comprasLiquidas: number,
  estoqueFinal: number
): number {
  return estoqueInicial + comprasLiquidas - estoqueFinal;
}

// -------------------------------------------------------
// calculateCMVPercentual
// CMV% = (CMV / Faturamento) * 100
// Retorna null se faturamento for zero/null/undefined
// -------------------------------------------------------
export function calculateCMVPercentual(
  cmvValor: number,
  faturamento: number | null | undefined
): number | null {
  if (!faturamento || faturamento === 0) return null;
  return (cmvValor / faturamento) * 100;
}

// -------------------------------------------------------
// getFaturamentoLiquidoMes
// Busca o faturamento líquido do mês.
// PROVISÓRIO: soma subtotais das saídas com motivo "Venda"
// Preparado para integração futura com tabela de vendas real.
// -------------------------------------------------------
export async function getFaturamentoLiquidoMes(
  userId: string,
  start: string,
  end: string
): Promise<number | null> {
  // Buscar saídas com motivo que indica venda
  const { data, error } = await supabase
    .from('movimentacoes')
    .select('subtotal, custo_aplicado, quantidade, motivo')
    .eq('user_id', userId)
    .eq('tipo', 'saida')
    .gte('data_hora', start)
    .lte('data_hora', end);

  if (error) {
    console.error('Erro ao buscar faturamento:', error);
    return null;
  }

  if (!data || data.length === 0) return null;

  // Filtrar apenas saídas com motivo de venda
  const vendas = data.filter((mov) => {
    const motivo = (mov.motivo || '').toLowerCase();
    return motivo.includes('venda');
  });

  if (vendas.length === 0) return null;

  const total = vendas.reduce((sum, mov) => {
    return sum + (mov.subtotal || (mov.custo_aplicado || 0) * (mov.quantidade || 0));
  }, 0);

  return total;
}

// -------------------------------------------------------
// calcularCmvCompleto
// Orquestra todas as funções acima e retorna o resultado final
// -------------------------------------------------------
export async function calcularCmvCompleto(
  userId: string,
  produtosAtivos: ProdutoEstoque[],
  entradasMes: Movimentacao[]
): Promise<CmvResult> {
  const competenciaAnterior = getCompetenciaAnterior();
  const { start, end } = getCurrentMonthRangeBrasilia();

  // Buscar EI real e faturamento em paralelo
  const [estoqueInicial, faturamentoLiquido] = await Promise.all([
    getEstoqueInicialReal(userId, competenciaAnterior),
    getFaturamentoLiquidoMes(userId, start, end),
  ]);

  // Calcular EF e Compras
  const estoqueFinal = calculateEstoqueFinal(produtosAtivos);
  const comprasLiquidas = calculateComprasLiquidas(entradasMes);

  const breakdown: CmvBreakdown = {
    estoqueInicial,
    comprasLiquidas,
    estoqueFinal,
    faturamentoLiquido,
  };

  // Se não há fechamento anterior, CMV indisponível
  if (estoqueInicial === null) {
    return {
      cmvDisponivel: false,
      cmvValor: null,
      cmvPercentual: null,
      breakdown,
    };
  }

  // Calcular CMV
  const cmvValor = calculateCMVValor(estoqueInicial, comprasLiquidas, estoqueFinal);
  const cmvPercentual = calculateCMVPercentual(cmvValor, faturamentoLiquido);

  return {
    cmvDisponivel: true,
    cmvValor,
    cmvPercentual,
    breakdown,
  };
}
