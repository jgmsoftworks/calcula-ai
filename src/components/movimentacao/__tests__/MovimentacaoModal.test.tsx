import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MovimentacaoModal } from '../MovimentacaoModal';
import type { Produto } from '@/hooks/useEstoque';

afterEach(cleanup);
const produto: Produto = { id: 'morango', user_id: 'owner', codigo_interno: 11, nome: 'MORANGO FRESCO', marcas: ['Marca de teste'], categorias: ['Frutas'], unidade_compra: 'k', unidade_uso: 'g', fator_conversao: 1000, estoque_atual: 12.5, estoque_minimo: 2, custo_unitario: 45, imagem_url: null, ativo: true, codigos_barras: [], created_at: '', updated_at: '' };
async function motivo(name: string) {
  fireEvent.keyDown(screen.getByRole('combobox', { name: 'Motivo' }), { key: 'Enter' });
  fireEvent.keyDown(await screen.findByRole('option', { name }), { key: 'Enter' });
}

describe('stock movement details', () => {
  it('shows purchase/use units and keeps submitted quantities in the purchase unit', async () => {
    const add = vi.fn(); const close = vi.fn();
    render(<MovimentacaoModal produto={produto} open onClose={close} onAddToCart={add} />);
    expect(screen.getByText('Quilo (kg)')).toBeInTheDocument();
    expect(screen.getByText('Grama (g)')).toBeInTheDocument();
    expect(screen.getByText(/1 kg = 1.000 g/)).toBeInTheDocument();
    expect(screen.getByText('12,5 kg')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Quantidade (kg)'), { target: { value: '2,5' } });
    expect(screen.getByText('Equivale a 2.500 g para uso.')).toBeInTheDocument();
    fireEvent.paste(screen.getByLabelText('Custo por kg'), { clipboardData: { getData: () => '300.000,00' } });
    expect(screen.getByLabelText('Subtotal')).toHaveTextContent(/750.000,00/);
    await motivo('Compra de fornecedor');
    fireEvent.click(screen.getByRole('button', { name: /Adicionar/ }));
    expect(add).toHaveBeenCalledWith(expect.objectContaining({ produto_id: 'morango', unidade_compra: 'k', quantidade: 2.5, custo_aplicado: 300000, subtotal: 750000 }));
    expect(close).toHaveBeenCalledOnce();
  });

  it('blocks exits that exceed stock already reserved in the cart and uses the registered cost', async () => {
    const add = vi.fn();
    render(<MovimentacaoModal produto={produto} open onClose={vi.fn()} onAddToCart={add} saidasPendentes={12} />);
    fireEvent.paste(screen.getByLabelText('Custo por kg'), { clipboardData: { getData: () => '99,00' } });
    fireEvent.click(screen.getByRole('radio', { name: /Saída/ }));
    expect(screen.getByLabelText('Custo por kg')).toHaveValue('R$ 45,00');
    expect(screen.getByLabelText('Custo por kg')).toHaveAttribute('readonly');
    expect(screen.getByRole('alert')).toHaveTextContent('Disponível: 0,5 kg');
    await motivo('Consumo interno');
    expect(screen.getByRole('button', { name: /Adicionar/ })).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Quantidade (kg)'), { target: { value: '0,5' } });
    fireEvent.click(screen.getByRole('button', { name: /Adicionar/ }));
    expect(add).toHaveBeenCalledWith(expect.objectContaining({ tipo: 'saida', quantidade: 0.5, custo_aplicado: 45, subtotal: 22.5 }));
  });

  it('resets a reopened movement for the same product and does not invent a conversion', async () => {
    const item = { ...produto, unidade_compra: 'un', unidade_uso: null, fator_conversao: null };
    const props = { produto: item, open: true, onClose: vi.fn(), onAddToCart: vi.fn() };
    const { rerender } = render(<MovimentacaoModal {...props} />);
    expect(screen.getByText('Unidade (un)')).toBeInTheDocument();
    expect(screen.getByText('Unidade de uso não configurada no cadastro.')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Quantidade (un)'), { target: { value: '10' } });
    fireEvent.click(screen.getByRole('radio', { name: /Saída/ }));
    await motivo('Venda');
    rerender(<MovimentacaoModal {...props} open={false} />);
    rerender(<MovimentacaoModal {...props} />);
    expect(screen.getByRole('radio', { name: /Entrada/ })).toBeChecked();
    expect(screen.getByLabelText('Quantidade (un)')).toHaveValue('1');
    expect(screen.getByRole('combobox', { name: 'Motivo' })).toHaveTextContent('Selecione o motivo');
  });

  it('keeps the dialog open if adding to the cart is rejected', async () => {
    const close = vi.fn();
    render(<MovimentacaoModal produto={produto} open onClose={close} onAddToCart={() => false} />);
    await motivo('Compra de fornecedor');
    fireEvent.click(screen.getByRole('button', { name: /Adicionar/ }));
    expect(close).not.toHaveBeenCalled();
  });
});
