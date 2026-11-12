import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { RegistrarPerdaModal } from './RegistrarPerdaModal';

const mocks = vi.hoisted(() => ({ from: vi.fn(), rpc: vi.fn(), register: vi.fn(), cost: vi.fn(), fridge: vi.fn() }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'synthetic-owner' } }) }));
vi.mock('@/hooks/usePerdas', async importOriginal => ({ ...await importOriginal<typeof import('@/hooks/usePerdas')>(), usePerdas: () => ({ registrarPerdas: mocks.register, calcularCustoReceita: mocks.cost }) }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: mocks.from, rpc: mocks.rpc } }));
vi.mock('@/lib/geladeiraData', () => ({ fetchGeladeira: mocks.fridge, geladeiraComoProduto: vi.fn() }));

beforeEach(() => {
  mocks.fridge.mockResolvedValue([]); mocks.cost.mockResolvedValue(10); mocks.register.mockResolvedValue(true);
  mocks.from.mockImplementation((table: string) => {
    const data = table === 'produtos' ? [{ id: 'flour', nome: 'Farinha', custo_unitario: 5, unidade_compra: 'kg', estoque_atual: 10, estoque_minimo: 1, imagem_url: null, marcas: [], categorias: [] }] : [];
    const query = { select: () => query, eq: () => query, order: () => Promise.resolve({ data, error: null }) };
    return query;
  });
});
afterEach(() => { cleanup(); vi.resetAllMocks(); });

it('keeps the current product-selection and register-without-stock flow after removing inactive layouts', async () => {
  const saved = vi.fn(); const close = vi.fn();
  render(<RegistrarPerdaModal open onOpenChange={close} onSaved={saved} />);
  fireEvent.click(screen.getByRole('button', { name: /Produtos do estoque/ }));
  fireEvent.click(await screen.findByRole('button', { name: 'Adicionar Farinha' }));
  fireEvent.click(screen.getByRole('button', { name: 'Adicionar' }));
  fireEvent.click(screen.getByRole('button', { name: 'Registrar 1 perda' }));
  fireEvent.click(screen.getByRole('button', { name: 'Não, somente registrar a perda' }));
  await waitFor(() => expect(saved).toHaveBeenCalledTimes(1));
  expect(mocks.register).toHaveBeenCalledWith([expect.objectContaining({ tipo: 'produto', produto_id: 'flour', quantidade: 1, custo_unitario: 5, baixar_estoque: false })], { silent: true });
  expect(close).toHaveBeenCalledWith(false);
});
