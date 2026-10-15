import { describe, expect, it } from 'vitest';
import { totalizarSaidasPorProduto, verificarSaldosDisponiveis } from '../validacaoMovimentacao';

const saida = (produto_id: string, quantidade: number) => ({
  produto_id, tipo: 'saida' as const, motivo: 'Consumo', quantidade, custo_aplicado: 1, subtotal: quantidade,
});
const entrada = (produto_id: string, quantidade: number) => ({
  produto_id, tipo: 'entrada' as const, motivo: 'Compra', quantidade, custo_aplicado: 1, subtotal: quantidade,
});

describe('proteção contra estoque negativo', () => {
  it('soma as retiradas do mesmo produto, mesmo em duas linhas distintas', () => {
    const total = totalizarSaidasPorProduto([saida('sacola', 50), saida('sacola', 50)]);
    expect(total.get('sacola')).toBe(100);
    expect(verificarSaldosDisponiveis(total, [{ id: 'sacola', nome: 'Sacola', estoque_atual: 50 }]))
      .toContain('Estoque insuficiente');
  });

  it('não compensa as retiradas com entradas artificiais no mesmo carrinho', () => {
    const total = totalizarSaidasPorProduto([entrada('sacola', 100), saida('sacola', 80)]);
    expect(total.get('sacola')).toBe(80);
    expect(verificarSaldosDisponiveis(total, [{ id: 'sacola', nome: 'Sacola', estoque_atual: 50 }]))
      .toContain('Estoque insuficiente');
  });

  it('aceita a retirada total exata e itens de produtos diferentes', () => {
    const total = totalizarSaidasPorProduto([saida('a', 2), saida('a', 3), saida('b', 1)]);
    expect(verificarSaldosDisponiveis(total, [
      { id: 'a', nome: 'Produto A', estoque_atual: 5 },
      { id: 'b', nome: 'Produto B', estoque_atual: 1 },
    ])).toBeNull();
  });

  it('bloqueia item inválido, saldo desatualizado e produto inexistente', () => {
    expect(() => totalizarSaidasPorProduto([saida('a', -1)])).toThrow();
    expect(() => totalizarSaidasPorProduto([saida('a', Number.NaN)])).toThrow();
    expect(() => totalizarSaidasPorProduto([])).toThrow();
    const total = totalizarSaidasPorProduto([saida('a', 2)]);
    expect(verificarSaldosDisponiveis(total, [])).toContain('não está mais disponível');
  });

  it('não rejeita frações exatas devido a ruído de ponto flutuante', () => {
    const total = totalizarSaidasPorProduto([saida('a', 0.1), saida('a', 0.2)]);
    expect(verificarSaldosDisponiveis(total, [{ id: 'a', nome: 'Produto A', estoque_atual: 0.3 }]))
      .toBeNull();
  });
});
