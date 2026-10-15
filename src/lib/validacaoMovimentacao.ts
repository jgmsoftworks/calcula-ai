export type ItemValidacaoEstoque = {
  produto_id: string;
  tipo: 'entrada' | 'saida';
  motivo: string;
  quantidade: number;
  custo_aplicado: number;
  subtotal: number;
};

export type SaldoProduto = {
  id: string;
  nome: string;
  estoque_atual: number;
};

/** Soma todas as retiradas do mesmo produto, inclusive linhas duplicadas. */
export function totalizarSaidasPorProduto(itens: readonly ItemValidacaoEstoque[]): Map<string, number> {
  if (!Array.isArray(itens) || itens.length < 1 || itens.length > 200) {
    throw new Error('Adicione entre 1 e 200 itens ao carrinho.');
  }
  const total = new Map<string, number>();
  for (const item of itens) {
    if (!item?.produto_id || !['entrada', 'saida'].includes(item.tipo) ||
        !Number.isFinite(item.quantidade) || item.quantidade <= 0 ||
        item.quantidade > 999999999 || !item.motivo?.trim() ||
        !Number.isFinite(item.custo_aplicado) || item.custo_aplicado < 0 ||
        !Number.isFinite(item.subtotal) || item.subtotal < 0) {
      throw new Error('Confira os produtos, as quantidades e os motivos da movimentação.');
    }
    if (item.tipo === 'saida') {
      total.set(item.produto_id, (total.get(item.produto_id) || 0) + item.quantidade);
    }
  }
  return total;
}

/** Pré-validação de UX; o banco recalcula e bloqueia o saldo com FOR UPDATE. */
export function verificarSaldosDisponiveis(
  saidas: ReadonlyMap<string, number>,
  saldos: readonly SaldoProduto[]
): string | null {
  const porId = new Map(saldos.map(produto => [produto.id, produto]));
  const formatar = (valor: number) => new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 3 }).format(valor);
  for (const [id, total] of saidas) {
    const produto = porId.get(id);
    if (!produto || !Number.isFinite(Number(produto.estoque_atual))) {
      return 'Um produto não está mais disponível no estoque. Atualize e tente novamente.';
    }
    if (Number(produto.estoque_atual) + 0.000000001 < total) {
      return `Estoque insuficiente para ${produto.nome}. Disponível: ${formatar(Number(produto.estoque_atual))}; total de saídas no carrinho: ${formatar(total)}.`;
    }
  }
  return null;
}
