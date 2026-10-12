import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { IngredientesTab } from '../IngredientesTab';
import { EmbalagensTa } from '../EmbalagensTa';
import { SubReceitasTab } from '../SubReceitasTab';

afterEach(cleanup);
const products = Array.from({ length: 100 }, (_, index) => ({ id: String(index), nome: `Produto ${index}`, custo_unitario: 2, unidade_compra: 'un' }));

describe('editor suggestions', () => {
  it.each([IngredientesTab, EmbalagensTa])('bounds initial product rendering while keeping all products searchable', Component => {
    const add = vi.fn();
    render(<Component mode="create" prefetchedProdutos={products} onAddTemp={add} />);
    expect(screen.getAllByRole('button', { name: /^Adicionar Produto/ })).toHaveLength(20);
    fireEvent.click(screen.getByRole('button', { name: 'Mostrar mais' }));
    expect(screen.getAllByRole('button', { name: /^Adicionar Produto/ })).toHaveLength(40);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Produto 99' } });
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar Produto 99' }));
    expect(add).toHaveBeenCalledWith(products[99], 1);
  });

  it('renders sub-recipes without a state-update loop and retains search after no matches', () => {
    render(<SubReceitasTab mode="create" prefetchedSubReceitas={products.map(item => ({ ...item, preco_venda: 2 }))} />);
    expect(screen.getAllByRole('button', { name: 'Adicionar' })).toHaveLength(20);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'not found' } });
    expect(screen.getByRole('textbox')).toHaveValue('not found');
    expect(screen.queryByRole('button', { name: 'Adicionar' })).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Produto 99' } });
    expect(screen.getByRole('button', { name: 'Adicionar' })).toBeInTheDocument();
  });

  it('accepts empty prefetched data without scheduling repeated state updates', () => {
    render(<><IngredientesTab mode="create" /><EmbalagensTa mode="create" /><SubReceitasTab mode="create" /></>);
    expect(screen.getAllByRole('textbox')).toHaveLength(3);
  });
});
