import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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

it('distinguishes same-name recipes by their registered product type throughout selection', async () => {
  const recipes = [
    { id: 'bolo', numero_sequencial: 70, tipo_cadastrado: { nome: 'Bolo gelado' } },
    { id: 'fatia', numero_sequencial: 154, tipo_cadastrado: { nome: 'Fatia suprema' } },
    { id: 'sem-tipo', numero_sequencial: 182, tipo_cadastrado: null },
  ].map(recipe => ({
    ...recipe, nome: 'Frutas vermelhas', tipo_produto: 'FINAL', rendimento_valor: 1, rendimento_unidade: 'un',
  }));
  const selectRecipes = vi.fn();
  mocks.from.mockImplementation((table: string) => {
    const query = {
      select: (fields: string) => { if (table === 'receitas') selectRecipes(fields); return query; },
      eq: () => query, order: () => Promise.resolve({ data: table === 'receitas' ? recipes : [] }),
    };
    return query;
  });
  mocks.rpc.mockResolvedValue({ data: 10 });
  render(<RegistrarPerdaModal open onOpenChange={vi.fn()} onSaved={vi.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: /Receitas produzidas/ }));
  expect(await screen.findByText('Tipo: Bolo gelado')).toBeVisible();
  expect(screen.getByText('Tipo: Fatia suprema')).toBeVisible();
  expect(screen.getByText('Sem tipo')).toBeVisible();
  expect(selectRecipes).toHaveBeenCalledWith(expect.stringContaining('tipo_cadastrado:tipos_produto(nome)'));

  fireEvent.change(screen.getByPlaceholderText(/Buscar receita/), { target: { value: 'fatia' } });
  expect(screen.queryByText('#70 Frutas vermelhas')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /Adicionar.*Frutas vermelhas/ }));
  const details = screen.getByRole('dialog', { name: 'Adicionar receita' });
  expect(within(details).getByText('Tipo: Fatia suprema')).toBeVisible();
  fireEvent.click(within(details).getByRole('button', { name: 'Adicionar' }));

  fireEvent.change(screen.getByPlaceholderText(/Buscar receita/), { target: { value: 'sem resultado' } });
  expect(screen.getByText('Tipo: Fatia suprema')).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Registrar 1 perda' }));
  fireEvent.click(screen.getByRole('button', { name: 'Não, somente registrar a perda' }));
  await waitFor(() => expect(mocks.register).toHaveBeenCalledWith([
    expect.objectContaining({ receita_id: 'fatia', nome_item: 'Frutas vermelhas', quantidade: 1 }),
  ], { silent: true }));
});
