import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import Tutorial from '../Tutorial';

const mocks = vi.hoisted(() => ({
  isAdmin: false,
  toast: vi.fn(),
  signedUrl: vi.fn(),
  from: vi.fn(),
  rows: {} as Record<string, Array<Record<string, unknown>>>,
  filters: [] as string[],
  ranges: [] as Array<[string, number, number]>,
}));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'owner' }, isAdmin: mocks.isAdmin }) }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: mocks.from, storage: { from: () => ({ createSignedUrl: mocks.signedUrl }) } },
}));

const lesson = (id: string, category = 'module-1') => ({
  id, category_id: category, title: `Aula ${id}`, description: null,
  storage_path: `${id}.mp4`, sort_order: 0, is_published: true,
});

beforeEach(() => {
  vi.clearAllMocks();
  mocks.isAdmin = false;
  mocks.filters = [];
  mocks.ranges = [];
  mocks.rows = {
    tutorial_categories: [{ id: 'module-1', title: 'Primeiros passos', description: null, sort_order: 0, is_published: true }],
    tutorial_videos: [lesson('1'), lesson('2')],
  };
  mocks.signedUrl.mockImplementation(async (path: string) => ({ data: { signedUrl: `https://example.com/${path}` }, error: null }));
  mocks.from.mockImplementation((table: string) => {
    let start = 0;
    let end = 249;
    let publishedOnly = false;
    const query = {
      select: () => query,
      order: () => query,
      range: (from: number, to: number) => { start = from; end = to; mocks.ranges.push([table, from, to]); return query; },
      eq: () => { publishedOnly = true; mocks.filters.push(table); return query; },
      then: (resolve: (result: unknown) => void) => Promise.resolve({
        data: (mocks.rows[table] || []).filter((row) => !publishedOnly || row.is_published).slice(start, end + 1), error: null,
      }).then(resolve),
    };
    return query;
  });
});
afterEach(cleanup);

describe('course lessons', () => {
  it('only prepares the selected lesson and replaces its player on navigation', async () => {
    const { container } = render(<Tutorial />);
    await screen.findByLabelText('Aula 1');
    expect(mocks.signedUrl).toHaveBeenCalledTimes(1);
    expect(container.querySelectorAll('video')).toHaveLength(1);
    expect(screen.getByLabelText('Aula 1')).toHaveAttribute('playsinline');
    expect(screen.getByRole('button', { name: 'Anterior' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Próxima aula' }));
    await screen.findByLabelText('Aula 2');
    expect(mocks.signedUrl).toHaveBeenCalledTimes(2);
    expect(container.querySelectorAll('video')).toHaveLength(1);
    expect(screen.queryByLabelText('Aula 1')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Próxima aula' })).toBeDisabled();
  });

  it('filters unpublished content for learners and hides editing tools', async () => {
    mocks.rows.tutorial_videos.push({ ...lesson('draft'), is_published: false });
    render(<Tutorial />);
    await screen.findByLabelText('Aula 1');
    expect(mocks.filters).toEqual(expect.arrayContaining(['tutorial_categories', 'tutorial_videos']));
    expect(screen.queryByText('Aula draft')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Adicionar conteúdo' })).not.toBeInTheDocument();
  });

  it('loads lessons beyond the first data page without preloading their videos', async () => {
    mocks.rows.tutorial_videos = Array.from({ length: 251 }, (_, index) => lesson(String(index + 1)));
    render(<Tutorial />);
    await screen.findByRole('button', { name: '251. Aula 251' });
    expect(mocks.ranges).toContainEqual(['tutorial_videos', 250, 499]);
    expect(mocks.signedUrl).toHaveBeenCalledTimes(1);
  });

  it('ignores a late URL response for a lesson that was already left', async () => {
    let resolveFirst!: (value: unknown) => void;
    mocks.signedUrl.mockImplementationOnce(() => new Promise((resolve) => { resolveFirst = resolve; }));
    render(<Tutorial />);
    fireEvent.click(await screen.findByRole('button', { name: 'Próxima aula' }));
    await screen.findByLabelText('Aula 2');
    resolveFirst({ data: { signedUrl: 'https://example.com/old.mp4' }, error: null });
    await waitFor(() => expect(screen.getByLabelText('Aula 2')).toHaveAttribute('src', 'https://example.com/2.mp4'));
    expect(screen.queryByLabelText('Aula 1')).not.toBeInTheDocument();
  });

  it('offers a retry when playback fails and requests a fresh URL', async () => {
    render(<Tutorial />);
    fireEvent.error(await screen.findByLabelText('Aula 1'));
    expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível reproduzir');
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    await screen.findByLabelText('Aula 1');
    expect(mocks.signedUrl).toHaveBeenCalledTimes(2);
  });

  it('lets administrators open the upload and module controls', async () => {
    mocks.isAdmin = true;
    render(<Tutorial />);
    fireEvent.click(await screen.findByRole('button', { name: 'Adicionar conteúdo' }));
    expect(screen.getByLabelText('Arquivo de vídeo')).toHaveAttribute('type', 'file');
    expect(screen.getByRole('button', { name: 'Criar módulo' })).toBeInTheDocument();
    expect(mocks.filters).toHaveLength(0);
  });
});
