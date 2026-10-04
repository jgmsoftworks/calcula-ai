import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import Tutorial from '../Tutorial';

const mocks = vi.hoisted(() => ({
  isAdmin: false,
  toast: vi.fn(),
  signedUrl: vi.fn(),
  upload: vi.fn(),
  remove: vi.fn(),
  insert: vi.fn(),
  delete: vi.fn(),
  from: vi.fn(),
  rows: {} as Record<string, Array<Record<string, unknown>>>,
  filters: [] as string[],
  ranges: [] as Array<[string, number, number]>,
}));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'owner' }, isAdmin: mocks.isAdmin }) }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: mocks.from, storage: { from: () => ({ createSignedUrl: mocks.signedUrl, upload: mocks.upload, remove: mocks.remove }) } },
}));

const lesson = (id: string, category = 'module-1') => ({
  id, category_id: category, title: `Aula ${id}`, description: null,
  storage_path: `${id}.mp4`, youtube_video_id: null, sort_order: 0, is_published: true,
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
  mocks.upload.mockResolvedValue({ error: null });
  mocks.remove.mockResolvedValue({ error: null });
  mocks.insert.mockResolvedValue({ error: null });
  mocks.delete.mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });
  mocks.from.mockImplementation((table: string) => {
    let start = 0;
    let end = 249;
    let publishedOnly = false;
    const query = {
      insert: mocks.insert,
      delete: mocks.delete,
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
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

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
    expect(screen.getByRole('radio', { name: 'YouTube' })).toBeChecked();
    expect(screen.getByLabelText('Link do YouTube')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('radio', { name: 'Arquivo de vídeo' }));
    expect(screen.getByLabelText('Arquivo de vídeo', { selector: 'input[type="file"]' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Criar módulo' })).toBeInTheDocument();
    expect(mocks.filters).toHaveLength(0);
  });

  it('embeds only the selected YouTube lesson and switches cleanly to a stored video', async () => {
    mocks.rows.tutorial_videos[0] = { ...lesson('1'), storage_path: null, youtube_video_id: 'M7lc1UVf-VE' };
    const { container } = render(<Tutorial />);
    const frame = await screen.findByTitle('Aula 1');
    expect(frame).toHaveAttribute('src', 'https://www.youtube-nocookie.com/embed/M7lc1UVf-VE?playsinline=1&rel=0');
    expect(frame).toHaveAttribute('allowfullscreen');
    expect(frame).toHaveAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
    expect(screen.getByRole('link', { name: 'Abrir no YouTube' })).toHaveAttribute('href', 'https://www.youtube.com/watch?v=M7lc1UVf-VE');
    expect(mocks.signedUrl).not.toHaveBeenCalled();
    expect(container.querySelectorAll('iframe')).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'Próxima aula' }));
    await screen.findByLabelText('Aula 2');
    expect(container.querySelectorAll('iframe')).toHaveLength(0);
    fireEvent.click(screen.getByRole('button', { name: 'Anterior' }));
    await screen.findByTitle('Aula 1');
    expect(container.querySelectorAll('video')).toHaveLength(0);
    expect(mocks.signedUrl).toHaveBeenCalledTimes(1);
  });

  it('saves a normalized YouTube ID without uploading a file', async () => {
    mocks.isAdmin = true;
    render(<Tutorial />);
    fireEvent.click(await screen.findByRole('button', { name: 'Adicionar conteúdo' }));
    fireEvent.change(screen.getByLabelText('Título'), { target: { value: 'Minha aula' } });
    fireEvent.change(screen.getByLabelText('Link do YouTube'), { target: { value: 'https://youtu.be/M7lc1UVf-VE?si=tracking&t=40' } });
    fireEvent.click(screen.getByLabelText('Publicar imediatamente'));
    fireEvent.click(screen.getByRole('button', { name: 'Salvar aula' }));
    await waitFor(() => expect(mocks.insert).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Minha aula', category_id: 'module-1', storage_path: null,
      youtube_video_id: 'M7lc1UVf-VE', is_published: true,
    })));
    expect(mocks.upload).not.toHaveBeenCalled();
    expect(mocks.remove).not.toHaveBeenCalled();
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith({ title: 'Aula publicada com sucesso' }));
  });

  it('blocks invalid links and preserves form contents on save failure', async () => {
    mocks.isAdmin = true;
    mocks.insert.mockResolvedValue({ error: { message: 'Falha de conexão' } });
    render(<Tutorial />);
    fireEvent.click(await screen.findByRole('button', { name: 'Adicionar conteúdo' }));
    fireEvent.change(screen.getByLabelText('Título'), { target: { value: 'Minha aula' } });
    fireEvent.change(screen.getByLabelText('Link do YouTube'), { target: { value: 'https://youtube.com.evil.example/watch?v=M7lc1UVf-VE' } });
    expect(screen.getByRole('button', { name: 'Salvar aula' })).toBeDisabled();
    expect(screen.getByLabelText('Link do YouTube')).toHaveAttribute('aria-invalid', 'true');
    fireEvent.change(screen.getByLabelText('Link do YouTube'), { target: { value: 'https://youtu.be/M7lc1UVf-VE' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar aula' }));
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Erro ao salvar aula' })));
    expect(screen.getByLabelText('Título')).toHaveValue('Minha aula');
    expect(screen.getByLabelText('Link do YouTube')).toHaveValue('https://youtu.be/M7lc1UVf-VE');
    expect(mocks.remove).not.toHaveBeenCalled();
  });

  it('keeps original file upload available without mixing the two sources', async () => {
    mocks.isAdmin = true;
    render(<Tutorial />);
    fireEvent.click(await screen.findByRole('button', { name: 'Adicionar conteúdo' }));
    fireEvent.change(screen.getByLabelText('Link do YouTube'), { target: { value: 'https://youtu.be/M7lc1UVf-VE' } });
    fireEvent.click(screen.getByRole('radio', { name: 'Arquivo de vídeo' }));
    fireEvent.change(screen.getByLabelText('Título'), { target: { value: 'Arquivo original' } });
    const file = new File(['original'], 'aula.mp4', { type: 'video/mp4' });
    fireEvent.change(screen.getByLabelText('Arquivo de vídeo', { selector: 'input[type="file"]' }), { target: { files: [file] } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar aula' }));
    await waitFor(() => expect(mocks.insert).toHaveBeenCalledWith(expect.objectContaining({
      storage_path: expect.stringMatching(/^owner\/.+-aula.mp4$/), youtube_video_id: null, is_published: false,
    })));
    expect(mocks.upload).toHaveBeenCalledWith(expect.any(String), file, { contentType: 'video/mp4', upsert: false });
  });

  it('deletes a YouTube lesson without trying to delete a storage object', async () => {
    mocks.isAdmin = true;
    mocks.rows.tutorial_videos = [{ ...lesson('1'), storage_path: null, youtube_video_id: 'M7lc1UVf-VE' }];
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<Tutorial />);
    fireEvent.click(await screen.findByText('Gerenciar esta aula'));
    fireEvent.click(screen.getByRole('button', { name: 'Excluir aula' }));
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith({ title: 'Vídeo apagado' }));
    expect(mocks.delete).toHaveBeenCalledTimes(1);
    expect(mocks.remove).not.toHaveBeenCalled();
  });
});
