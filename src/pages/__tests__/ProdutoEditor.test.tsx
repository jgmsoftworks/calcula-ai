import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ProdutoEditor from '../ProdutoEditor';
import Estoque from '../Estoque';
import type { Produto } from '@/hooks/useEstoque';

const mocks = vi.hoisted(() => ({
  from: vi.fn(), eq: vi.fn(), load: vi.fn(), list: vi.fn(), create: vi.fn(), update: vi.fn(), code: vi.fn(),
  brands: vi.fn().mockResolvedValue([]), categories: vi.fn().mockResolvedValue([]),
}));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'owner-1' } }) }));
vi.mock('@/hooks/useEstoque', () => ({ useEstoque: () => ({ fetchProdutos: mocks.list, createProduto: mocks.create, updateProduto: mocks.update, gerarCodigoInterno: mocks.code }) }));
vi.mock('@/hooks/useMarcasCategorias', () => ({ useMarcasCategorias: () => ({ fetchMarcas: mocks.brands, fetchCategorias: mocks.categories }) }));
vi.mock('@/hooks/useExportProdutos', () => ({ useExportProdutos: () => ({ exportarProdutos: vi.fn() }) }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: mocks.from } }));
vi.mock('@/components/estoque/CodigosBarrasInput', () => ({ CodigosBarrasInput: () => null }));
vi.mock('@/components/estoque/MarcasSelector', () => ({ MarcasSelector: () => null }));
vi.mock('@/components/estoque/CategoriasSelector', () => ({ CategoriasSelector: () => null }));
vi.mock('@/components/estoque/HistoricoProduto', () => ({ HistoricoProduto: () => <p>Movimentações do produto</p> }));
vi.mock('@/components/estoque/SugestaoFotosModal', () => ({ SugestaoFotosModal: () => null }));
vi.mock('@/components/estoque/ConsumoMedioCard', () => ({ ConsumoMedioCard: () => null }));
vi.mock('@/components/estoque/ImportProdutosExcel', () => ({ ImportProdutosExcel: () => null }));
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

const product: Produto = {
  id: 'product-1', user_id: 'owner-1', nome: 'Farinha', codigo_interno: 7, codigos_barras: [], marcas: ['Marca A'], categorias: [],
  unidade_compra: 'k', custo_unitario: 8, estoque_atual: 20, estoque_minimo: 2, unidade_uso: 'g', fator_conversao: 1000,
  imagem_url: null, ativo: true, created_at: '', updated_at: '',
};
const filters = '?q=Farinha&unidade=k&abaixo=1';
function CurrentLocation() {
  const location = useLocation();
  return <output aria-label="Endereço atual">{location.pathname}{location.search}</output>;
}
function openPage(path: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}><MemoryRouter initialEntries={[path]}>
    <CurrentLocation /><Routes>
      <Route path="/estoque" element={<Estoque />} />
      <Route path="/estoque/novo" element={<ProdutoEditor />} />
      <Route path="/estoque/:id/editar" element={<ProdutoEditor />} />
    </Routes>
  </MemoryRouter></QueryClientProvider>);
}
function tab(name: string) { fireEvent.mouseDown(screen.getByRole('tab', { name }), { button: 0, ctrlKey: false }); }
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
  const query = { select: vi.fn().mockReturnThis(), eq: mocks.eq, abortSignal: vi.fn().mockReturnThis(), maybeSingle: mocks.load };
  mocks.eq.mockReturnValue(query);
  mocks.from.mockReturnValue(query);
  mocks.load.mockResolvedValue({ data: product, error: null });
  mocks.list.mockResolvedValue([product]);
  mocks.create.mockResolvedValue(product);
  mocks.update.mockResolvedValue(product);
  mocks.code.mockResolvedValue(7);
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe('stock product page navigation and saving', () => {
  it('opens an editor page from the list and returns with every filter preserved', async () => {
    openPage(`/estoque${filters}`);
    fireEvent.click(await screen.findByRole('button', { name: 'Editar Farinha' }));
    expect(await screen.findByRole('heading', { name: 'Editar Produto' })).toBeVisible();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Endereço atual')).toHaveTextContent(`/estoque/product-1/editar${filters}`);
    expect(mocks.eq).toHaveBeenCalledWith('id', 'product-1');
    expect(mocks.eq).toHaveBeenCalledWith('user_id', 'owner-1');
    expect(mocks.eq).toHaveBeenCalledWith('ativo', true);
    fireEvent.click(screen.getByRole('button', { name: 'Voltar para produtos' }));
    expect(await screen.findByPlaceholderText('Buscar produto...')).toHaveValue('Farinha');
    expect(screen.getByLabelText('Endereço atual')).toHaveTextContent(`/estoque${filters}`);
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it('creates a product from the list with usage fields on the stock tab', async () => {
    openPage('/estoque');
    fireEvent.click((await screen.findAllByRole('button', { name: 'Criar Produto' }))[0]);
    await waitFor(() => expect(screen.getByLabelText('Código Interno *')).toHaveValue(7));
    expect(screen.getByRole('heading', { name: 'Modo de Uso' })).toBeVisible();
    expect(screen.queryByRole('tab', { name: 'Modo de Uso' })).not.toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Histórico' })).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Nome do Produto *'), { target: { value: 'Chocolate' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar Produto' }));
    await waitFor(() => expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({ nome: 'Chocolate', codigo_interno: 7, unidade_compra: 'un' })));
    await waitFor(() => expect(screen.getByLabelText('Endereço atual')).toHaveTextContent(/^\/estoque$/));
    expect(mocks.load).not.toHaveBeenCalled();
  });

  it('keeps drafts across all tabs and waits for saving before returning', async () => {
    let finish!: (value: Produto) => void;
    mocks.update.mockReturnValue(new Promise<Produto>(resolve => { finish = resolve; }));
    openPage(`/estoque/product-1/editar${filters}`);
    fireEvent.change(await screen.findByLabelText('Nome do Produto *'), { target: { value: 'Farinha integral' } });
    tab('Rótulo nutricional');
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar rótulo nutricional' }));
    fireEvent.change(screen.getByLabelText('Quantidade de referência'), { target: { value: '100' } });
    tab('Histórico');
    expect(screen.getByText('Movimentações do produto')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Salvar Produto' })).toBeVisible();
    tab('Rótulo nutricional');
    expect(screen.getByLabelText('Quantidade de referência')).toHaveValue('100');
    fireEvent.click(screen.getByRole('button', { name: 'Salvar Produto' }));
    await waitFor(() => expect(mocks.update).toHaveBeenCalledOnce());
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Voltar para produtos' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Salvando...' })).toBeDisabled();
    expect(mocks.update).toHaveBeenCalledWith('product-1', expect.objectContaining({ nome: 'Farinha integral', custo_unitario: 8, estoque_atual: 20, fator_conversao: 1000, rotulos_nutricionais: [expect.objectContaining({ quantidade_referencia: 100 })] }));
    await act(async () => finish(product));
    await waitFor(() => expect(screen.getByLabelText('Endereço atual')).toHaveTextContent(`/estoque${filters}`));
  });

  it('retains the draft on save failure and allows another attempt', async () => {
    mocks.update.mockResolvedValueOnce(null);
    openPage('/estoque/product-1/editar');
    fireEvent.change(await screen.findByLabelText('Nome do Produto *'), { target: { value: 'Farinha revisada' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar Produto' }));
    await waitFor(() => expect(mocks.update).toHaveBeenCalledOnce());
    await waitFor(() => expect(screen.getByRole('button', { name: 'Salvar Produto' })).toBeEnabled());
    expect(screen.getByLabelText('Nome do Produto *')).toHaveValue('Farinha revisada');
    fireEvent.click(screen.getByRole('button', { name: 'Salvar Produto' }));
    await waitFor(() => expect(mocks.update).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.getByLabelText('Endereço atual')).toHaveTextContent(/^\/estoque$/));
  });

  it('shows a recoverable load error instead of a blank edit form', async () => {
    mocks.load.mockResolvedValueOnce({ data: null, error: null });
    openPage('/estoque/product-1/editar');
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível carregar este produto');
    expect(screen.queryByRole('button', { name: 'Salvar Produto' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(await screen.findByLabelText('Nome do Produto *')).toHaveValue('Farinha');
  });

  it('returns to required fields when saving an incomplete product from another tab', async () => {
    openPage('/estoque/novo');
    await waitFor(() => expect(screen.getByLabelText('Código Interno *')).toHaveValue(7));
    tab('Rótulo nutricional');
    fireEvent.click(screen.getByRole('button', { name: 'Salvar Produto' }));
    expect(await screen.findByLabelText('Nome do Produto *')).toHaveAttribute('aria-invalid', 'true');
    expect(mocks.create).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.getByLabelText('Endereço atual')).toHaveTextContent(/^\/estoque$/);
    expect(mocks.create).not.toHaveBeenCalled();
  });
});
