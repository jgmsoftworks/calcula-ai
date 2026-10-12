import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '@/components/ui/tooltip';
import ReceitaEditor from '../ReceitaEditor';
import Receitas from '../Receitas';
import type { ReceitaCompleta } from '@/types/receitas';

const mocks = vi.hoisted(() => ({
  user: { id: 'owner' },
  fetchReceitas: vi.fn(),
  fetchReceitaCompleta: vi.fn(),
  fetchTiposProduto: vi.fn(),
  createReceita: vi.fn(),
  updateReceita: vi.fn(),
  from: vi.fn(),
}));

vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: mocks.user }) }));
vi.mock('@/hooks/useReceitas', () => ({ useReceitas: () => ({ ...mocks, loading: false }) }));
// Keep these tests focused on route changes, hydration and save/return behavior.
// Individual tab widgets do not need to be mounted to exercise the editor lifecycle.
vi.mock('@/components/receitas/GeralTab', () => ({
  GeralTab: ({ formData, onFormChange }: { formData: { nome: string }; onFormChange: (field: string, value: string) => void }) => (
    <label>Nome da Receita *<input value={formData.nome} onChange={event => onFormChange('nome', event.target.value)} /></label>
  ),
}));
vi.mock('@/components/receitas/IngredientesTab', () => ({
  IngredientesTab: ({ tempIngredientes }: { tempIngredientes: ReceitaCompleta['ingredientes'] }) => (
    <div>{tempIngredientes.map(item => <span key={item.id}>{item.produto?.nome}</span>)}</div>
  ),
}));
vi.mock('@/components/receitas/SubReceitasTab', () => ({ SubReceitasTab: () => <div>Sub-receitas</div> }));
vi.mock('@/components/receitas/EmbalagensTa', () => ({ EmbalagensTa: () => <div>Embalagens</div> }));
vi.mock('@/components/receitas/ProjecaoTab', () => ({ ProjecaoTab: () => <div>Projeção</div> }));
vi.mock('@/components/receitas/PrecificacaoTab', () => ({ PrecificacaoTab: () => <div>Precificação</div> }));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => ({
    'receitas.newRecipe': 'Nova Receita', 'receitas.searchRecipe': 'Buscar receita',
  }[key] || key) }),
}));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: mocks.from,
    channel: () => {
      const channel = { on: () => channel, subscribe: () => channel };
      return channel;
    },
    removeChannel: vi.fn(),
  },
}));

const recipe: ReceitaCompleta = {
  id: 'recipe-1', user_id: 'owner', numero_sequencial: 1, nome: 'Bolo de teste',
  rendimento_valor: 10, rendimento_unidade: 'un', tempo_preparo_total: 30,
  tempo_preparo_mao_obra: 0, conservacao: null, observacoes: null, imagem_url: null,
  markup_id: null, preco_venda: 40, status: 'finalizada', peso_unitario: 100,
  created_at: '', updated_at: '', embalagens: [], sub_receitas: [], passos: [], mao_obra: [],
  ingredientes: [{ id: 'ingredient-1', receita_id: 'recipe-1', produto_id: 'flour', quantidade: 250,
    produto: { id: 'flour', nome: 'Farinha de teste', marcas: null, custo_unitario: 8,
      unidade_compra: 'kg', unidade_uso: 'g', fator_conversao: 1000 } }],
};

function Location() {
  const location = useLocation();
  return <output aria-label="Endereço atual">{location.pathname}{location.search}</output>;
}

function openPage(path: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <TooltipProvider>
        <MemoryRouter initialEntries={[path]}>
          <Location />
          <Routes>
            <Route path="/receitas" element={<Receitas />} />
            <Route path="/receitas/nova" element={<ReceitaEditor />} />
            <Route path="/receitas/:id/editar" element={<ReceitaEditor />} />
          </Routes>
        </MemoryRouter>
      </TooltipProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.fetchReceitas.mockResolvedValue([recipe]);
  mocks.fetchReceitaCompleta.mockResolvedValue(recipe);
  mocks.fetchTiposProduto.mockResolvedValue([]);
  mocks.createReceita.mockResolvedValue({ id: 'created-recipe' });
  mocks.updateReceita.mockResolvedValue(true);
  mocks.from.mockImplementation(() => {
    const query = {
      select: () => query, eq: () => query, ilike: () => query, neq: () => query,
      order: () => query, update: () => query, insert: () => query, delete: () => query,
      in: () => query,
      single: async () => ({ data: null, error: null }),
      maybeSingle: async () => ({ data: null, error: null }),
      then: (resolve: (result: unknown) => void) => Promise.resolve({ data: [], error: null }).then(resolve),
    };
    return query;
  });
  Element.prototype.scrollIntoView = vi.fn();
});
afterEach(cleanup);

describe('recipe editor navigation', () => {
  it('opens creation as a page and returns to the same search and filters', async () => {
    openPage('/receitas?busca=Bolo&subReceita=normal');
    fireEvent.click(await screen.findByRole('button', { name: 'Nova Receita' }));
    expect(await screen.findByRole('heading', { name: 'Nova Receita' })).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Endereço atual')).toHaveTextContent('/receitas/nova?busca=Bolo&subReceita=normal');
    fireEvent.click(screen.getByRole('button', { name: 'Voltar para receitas' }));
    expect(await screen.findByPlaceholderText('Buscar receita')).toHaveValue('Bolo');
    expect(screen.getByLabelText('Endereço atual')).toHaveTextContent('/receitas?busca=Bolo&subReceita=normal');
  });

  it('opens the selected recipe from its card, with existing data', async () => {
    openPage('/receitas');
    await screen.findByRole('button', { name: 'Editar' });
    fireEvent.click(screen.getByRole('button', { name: 'Editar' }));
    await waitFor(() => expect(screen.getByLabelText('Nome da Receita *')).toHaveValue(recipe.nome));
    expect(screen.getByLabelText('Endereço atual')).toHaveTextContent('/receitas/recipe-1/editar');
    expect(mocks.fetchReceitaCompleta).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Próximo' }));
    expect(await screen.findByText('Farinha de teste')).toBeInTheDocument();
  });

  it('loads a direct edit URL and returns to the list after saving', async () => {
    openPage('/receitas/recipe-1/editar?busca=Bolo');
    await waitFor(() => expect(screen.getByLabelText('Nome da Receita *')).toHaveValue(recipe.nome));
    fireEvent.change(screen.getByLabelText('Nome da Receita *'), { target: { value: 'Bolo atualizado' } });
    for (let step = 0; step < 5; step++) fireEvent.click(screen.getByRole('button', { name: 'Próximo' }));
    fireEvent.click(screen.getByRole('button', { name: 'Atualizar' }));
    await waitFor(() => expect(mocks.updateReceita).toHaveBeenCalledWith(recipe.id, expect.objectContaining({ nome: 'Bolo atualizado' })));
    expect(await screen.findByPlaceholderText('Buscar receita')).toHaveValue('Bolo');
  });

  it('keeps unsaved edits on a failed save and lets the user cancel', async () => {
    mocks.updateReceita.mockResolvedValue(false);
    openPage('/receitas/recipe-1/editar');
    await waitFor(() => expect(screen.getByLabelText('Nome da Receita *')).toHaveValue(recipe.nome));
    fireEvent.change(screen.getByLabelText('Nome da Receita *'), { target: { value: 'Alteração não salva' } });
    for (let step = 0; step < 5; step++) fireEvent.click(screen.getByRole('button', { name: 'Próximo' }));
    fireEvent.click(screen.getByRole('button', { name: 'Atualizar' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Atualizar' })).toBeEnabled());
    expect(mocks.updateReceita).toHaveBeenCalled();
    expect(screen.getByRole('heading', { name: 'Editar Receita' })).toBeInTheDocument();
    for (let step = 0; step < 5; step++) fireEvent.click(screen.getByRole('button', { name: 'Etapa anterior' }));
    expect(screen.getByLabelText('Nome da Receita *')).toHaveValue('Alteração não salva');
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(await screen.findByPlaceholderText('Buscar receita')).toBeInTheDocument();
  });

  it('creates through all six steps and returns only after saving', async () => {
    openPage('/receitas/nova');
    fireEvent.change(screen.getByLabelText('Nome da Receita *'), { target: { value: 'Bolo novo' } });
    for (let step = 0; step < 5; step++) fireEvent.click(screen.getByRole('button', { name: 'Próximo' }));
    fireEvent.click(screen.getByRole('button', { name: 'Criar' }));
    await waitFor(() => expect(mocks.createReceita).toHaveBeenCalledWith(expect.objectContaining({ nome: 'Bolo novo' })));
    expect(await screen.findByPlaceholderText('Buscar receita')).toBeInTheDocument();
  });

  it('does not open an empty creation form when an edit URL cannot load', async () => {
    mocks.fetchReceitaCompleta.mockResolvedValue(null);
    openPage('/receitas/missing/editar');
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível carregar esta receita');
    expect(screen.queryByLabelText('Nome da Receita *')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Voltar para receitas' }));
    expect(await screen.findByPlaceholderText('Buscar receita')).toBeInTheDocument();
  });
});
