import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import PerfilNegocio from '../PerfilNegocio';

const mocks = vi.hoisted(() => ({ userId: 'account-a' as string | null, read: vi.fn(), upsert: vi.fn(), from: vi.fn(), toast: vi.fn(), loadConfiguration: vi.fn(), upload: vi.fn(), update: vi.fn(), write: vi.fn() }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: mocks.userId ? { id: mocks.userId } : null }) }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: mocks.from, storage: { from: () => ({ upload: mocks.upload, getPublicUrl: () => ({ data: { publicUrl: 'https://example.invalid/new-logo.png' } }) }) } } }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock('@/hooks/useOptimizedUserConfigurations', () => ({ useOptimizedUserConfigurations: () => ({ loadConfiguration: mocks.loadConfiguration }) }));
vi.mock('@/contexts/BusinessRegionContext', () => ({ useBusinessRegion: () => ({ country: 'BR', name: 'Brasil', currency: 'BRL' }) }));
vi.mock('@/components/LanguageSelector', () => ({ LanguageSelector: () => null }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('@/i18n/localizeText', () => ({ localizeText: (text: string) => text }));
const page = () => <MemoryRouter><PerfilNegocio /></MemoryRouter>;
const savedProfile = (name: string) => ({ id: `profile-${name}`, full_name: 'Pessoa sintética', nome_fantasia: name, pais: 'Brasil', phone: '123', data_abertura: '2020-01-02', cor_primaria: '#123456' });

beforeEach(() => {
  mocks.userId = 'account-a';
  const query = { select: () => query, eq: () => query, single: mocks.read, upsert: mocks.upsert, update: mocks.update,
    then: (resolve: (value: { error: null }) => unknown) => mocks.write().then(resolve) };
  mocks.update.mockReturnValue(query);
  mocks.from.mockReturnValue(query);
  mocks.read.mockResolvedValue({ data: savedProfile('Empresa A'), error: null });
  mocks.upsert.mockResolvedValue({ error: null });
  mocks.upload.mockResolvedValue({ error: null });
  mocks.write.mockResolvedValue({ error: null });
  mocks.loadConfiguration.mockResolvedValue(null);
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => { cleanup(); vi.resetAllMocks(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

it('blocks an empty form after a read failure and recovers through retry', async () => {
  mocks.read.mockResolvedValueOnce({ data: null, error: { message: 'offline' } });
  render(page());
  expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível carregar');
  expect(screen.queryByRole('button', { name: 'Salvar Todas as Informações' })).not.toBeInTheDocument();
  expect(mocks.upsert).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
  expect(await screen.findByLabelText('Nome Fantasia *')).toHaveValue('Empresa A');
});

it('waits for the account before loading the profile', async () => {
  mocks.userId = null;
  const { rerender } = render(page());
  expect(mocks.read).not.toHaveBeenCalled();
  mocks.userId = 'account-a'; rerender(page());
  await waitFor(() => expect(screen.getByLabelText('Nome Fantasia *')).toHaveValue('Empresa A'));
});

it('ignores an older account response after switching accounts', async () => {
  let finish!: (value: { data: ReturnType<typeof savedProfile>; error: null }) => void;
  mocks.read.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  const { rerender } = render(page());
  mocks.read.mockResolvedValueOnce({ data: savedProfile('Empresa B'), error: null });
  mocks.userId = 'account-b'; rerender(page());
  await waitFor(() => expect(screen.getByLabelText('Nome Fantasia *')).toHaveValue('Empresa B'));
  await act(async () => finish({ data: savedProfile('Empresa A atrasada'), error: null }));
  expect(screen.getByLabelText('Nome Fantasia *')).toHaveValue('Empresa B');
});

it('preserves stored fields when saving an edit and reports actual save failures', async () => {
  mocks.upsert.mockResolvedValueOnce({ error: { message: 'write failed' } });
  render(page());
  const name = await screen.findByLabelText('Nome Fantasia *');
  await waitFor(() => expect(name).toHaveValue('Empresa A'));
  fireEvent.change(name, { target: { value: 'Novo nome' } });
  fireEvent.click(screen.getByRole('button', { name: 'Salvar Todas as Informações' }));
  await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Erro ao atualizar perfil', variant: 'destructive' })));
  expect(mocks.upsert).toHaveBeenCalledWith(expect.objectContaining({ id: 'profile-Empresa A', user_id: 'account-a', nome_fantasia: 'Novo nome', phone: '123', data_abertura: '2020-01-02', cor_primaria: '#123456' }));
  expect(mocks.toast).not.toHaveBeenCalledWith(expect.objectContaining({ title: 'Perfil atualizado' }));
  expect(name).toHaveValue('Novo nome');
});

it('does not restore the previous account logo after switching to a profile without one', async () => {
  mocks.read.mockResolvedValueOnce({ data: { ...savedProfile('Empresa A'), logo_empresa_url: 'https://example.invalid/logo-a.png' }, error: null });
  const { rerender } = render(page());
  expect(await screen.findByAltText('Logo preview')).toHaveAttribute('src', 'https://example.invalid/logo-a.png');
  mocks.userId = 'account-b'; rerender(page());
  await waitFor(() => expect(screen.getByLabelText('Nome Fantasia *')).toHaveValue('Empresa A'));
  expect(screen.queryByAltText('Logo preview')).not.toBeInTheDocument();
});

it('does not expose an editable empty form while the profile request is pending', async () => {
  let finish!: (value: { data: ReturnType<typeof savedProfile>; error: null }) => void;
  mocks.read.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  render(page());
  expect(screen.getByRole('status')).toHaveTextContent('Carregando perfil');
  expect(screen.queryByLabelText('Nome Fantasia *')).not.toBeInTheDocument();
  await act(async () => finish({ data: savedProfile('Carregada'), error: null }));
  expect(screen.getByLabelText('Nome Fantasia *')).toHaveValue('Carregada');
});

it('keeps the chosen image when a legacy logo request finishes later', async () => {
  let finish!: (value: string) => void;
  mocks.loadConfiguration.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  render(page());
  const input = await screen.findByLabelText('Imagem da empresa');
  fireEvent.change(input, { target: { files: [new File(['synthetic image'], 'logo.png', { type: 'image/png' })] } });
  await waitFor(() => expect(screen.getByAltText('Logo preview').getAttribute('src')).toMatch(/^data:image\/png/));
  const chosenPreview = screen.getByAltText('Logo preview').getAttribute('src');
  await act(async () => finish('https://example.invalid/old-logo.png'));
  expect(screen.getByAltText('Logo preview')).toHaveAttribute('src', chosenPreview);
});

it('uploads the selected logo and persists its URL before confirming success', async () => {
  render(page());
  const input = await screen.findByLabelText('Imagem da empresa');
  const file = new File(['synthetic image'], 'logo.png', { type: 'image/png' });
  fireEvent.change(input, { target: { files: [file] } });
  await waitFor(() => expect(screen.getByAltText('Logo preview').getAttribute('src')).toMatch(/^data:/));
  fireEvent.click(screen.getByRole('button', { name: 'Salvar Logo' }));
  await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Logo atualizado' })));
  expect(mocks.upload).toHaveBeenCalledWith(expect.stringMatching(/^account-a\/\d+\.png$/), file, { upsert: true, contentType: 'image/png' });
  expect(mocks.update).toHaveBeenCalledWith({ logo_empresa_url: 'https://example.invalid/new-logo.png' });
  expect(screen.getByAltText('Logo preview')).toHaveAttribute('src', 'https://example.invalid/new-logo.png');
  expect(screen.queryByRole('button', { name: 'Salvar Logo' })).not.toBeInTheDocument();
});

it('does not confirm a previous account save in the current account', async () => {
  let finish!: (value: { error: null }) => void;
  mocks.upsert.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  const { rerender } = render(page());
  fireEvent.click(await screen.findByRole('button', { name: 'Salvar Todas as Informações' }));
  mocks.read.mockResolvedValueOnce({ data: savedProfile('Empresa B'), error: null });
  mocks.userId = 'account-b'; rerender(page());
  await waitFor(() => expect(screen.getByLabelText('Nome Fantasia *')).toHaveValue('Empresa B'));
  await act(async () => finish({ error: null }));
  expect(mocks.toast).not.toHaveBeenCalled();
  expect(screen.getByRole('button', { name: 'Salvar Todas as Informações' })).not.toBeDisabled();
});

it('does not fill the address from a CEP that has since been changed', async () => {
  let finish!: (value: Response) => void;
  const fetchCEP = vi.fn(() => new Promise<Response>(resolve => { finish = resolve; }));
  vi.stubGlobal('fetch', fetchCEP);
  render(page());
  const input = await screen.findByLabelText('CEP');
  fireEvent.change(input, { target: { value: '74000000' } });
  fireEvent.click(screen.getByRole('button', { name: 'Buscar endereço pelo CEP' }));
  fireEvent.change(input, { target: { value: '75000000' } });
  await act(async () => finish(new Response(JSON.stringify({ logradouro: 'Endereço antigo', uf: 'GO' }), { status: 200 })));
  expect(screen.getByLabelText('Logradouro')).toHaveValue('');
  expect(input).toHaveValue('75000-000');
  expect(mocks.toast).not.toHaveBeenCalled();
  expect(screen.getByRole('button', { name: 'Buscar endereço pelo CEP' })).not.toBeDisabled();
});

it('fills a matching CEP successfully and reports an HTTP failure without clearing the address', async () => {
  const fetchCEP = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ logradouro: 'Rua sintética', bairro: 'Centro', localidade: 'Goiânia', uf: 'GO', complemento: '' }), { status: 200 }))
    .mockResolvedValueOnce(new Response('{}', { status: 503 }));
  vi.stubGlobal('fetch', fetchCEP);
  render(page());
  const input = await screen.findByLabelText('CEP');
  fireEvent.change(input, { target: { value: '74000000' } });
  fireEvent.click(screen.getByRole('button', { name: 'Buscar endereço pelo CEP' }));
  await waitFor(() => expect(screen.getByLabelText('Logradouro')).toHaveValue('Rua sintética'));
  expect(screen.getByLabelText('Estado')).toHaveValue('GO');
  fireEvent.click(screen.getByRole('button', { name: 'Buscar endereço pelo CEP' }));
  await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Erro ao buscar CEP', variant: 'destructive' })));
  expect(screen.getByLabelText('Logradouro')).toHaveValue('Rua sintética');
});
