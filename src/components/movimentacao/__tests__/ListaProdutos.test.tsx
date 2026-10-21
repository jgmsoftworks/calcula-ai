import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ListaProdutos } from '../ListaProdutos';
vi.mock('../ProdutoCard', () => ({ ProdutoCard: ({ produto, onSelect }: any) => <button onClick={() => onSelect(produto)}>{produto.nome}</button> }));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
const product = { id: 'a', nome: 'Morango' };
describe('incremental movement list', () => {
  it('loads the next batch near the bottom and keeps current products selectable while loading', () => {
    let intersect!: IntersectionObserverCallback;
    const disconnect = vi.fn();
    vi.stubGlobal('IntersectionObserver', class { constructor(callback: IntersectionObserverCallback) { intersect = callback; } observe() {} disconnect = disconnect; });
    const more = vi.fn(); const select = vi.fn();
    const props = { produtos: [product], loading: false, categoriaSelecionada: null, onSelectProduto: select, hasMore: true, canLoadMore: true, onLoadMore: more };
    const { rerender } = render(<ListaProdutos {...props} />);
    intersect([{ isIntersecting: true }] as IntersectionObserverEntry[], {} as IntersectionObserver);
    expect(more).toHaveBeenCalledTimes(1);
    rerender(<ListaProdutos {...props} canLoadMore={false} loadingMore />);
    expect(disconnect).toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Carregando mais produtos…' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Morango' }));
    expect(select).toHaveBeenCalledWith(product);
  });
  it('supports manual loading when automatic observation is unavailable and differentiates errors from empty searches', () => {
    vi.stubGlobal('IntersectionObserver', undefined);
    const more = vi.fn();
    const props = { produtos: [product], loading: false, categoriaSelecionada: null, onSelectProduto: vi.fn(), hasMore: true, canLoadMore: true, onLoadMore: more };
    const { rerender } = render(<ListaProdutos {...props} />);
    fireEvent.click(screen.getByRole('button', { name: 'Carregar mais produtos' }));
    expect(more).toHaveBeenCalledTimes(1);
    rerender(<ListaProdutos {...props} produtos={[]} hasMore={false} hasError />);
    expect(screen.queryByText('Nenhum produto encontrado')).not.toBeInTheDocument();
    expect(screen.getByText(/Os produtos não foram carregados/)).toBeVisible();
  });
});
