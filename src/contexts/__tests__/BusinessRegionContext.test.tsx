import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import i18n from '@/i18n';
import { formatMoney, setBusinessRegion } from '@/lib/business-region';
import { BusinessRegionProvider, useBusinessRegion } from '../BusinessRegionContext';
const mock = vi.hoisted(() => ({ user: { id: 'owner' }, profile: { business_country: 'BR', preferred_locale: 'pt-BR', region_confirmed: true }, loadError: null as unknown, saveError: null as unknown, update: vi.fn(), signOut: vi.fn() }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: mock.user, loading: false, signOut: mock.signOut }) }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: () => ({
  select: () => ({ eq: () => ({ single: async () => ({ data: mock.profile, error: mock.loadError }) }) }),
  update: (value: Record<string, unknown>) => { mock.update(value); const result = { data: { ...mock.profile, ...value }, error: mock.saveError }; return { eq: () => ({ then: (resolve: (value: typeof result) => void) => Promise.resolve(result).then(resolve), select: () => ({ single: async () => result }) }) }; },
}) } }));
function Probe() { const region = useBusinessRegion(); return <p>{region.country}: {formatMoney(10)}</p>; }
beforeEach(async () => { mock.user = { id: 'owner' }; mock.profile = { business_country: 'BR', preferred_locale: 'pt-BR', region_confirmed: true }; mock.loadError = mock.saveError = null; mock.update.mockClear(); await i18n.changeLanguage('pt-BR'); });
afterEach(() => { cleanup(); setBusinessRegion('BR'); });
it('loads an existing account in its own currency even with a Portuguese browser language', async () => {
  await i18n.changeLanguage('pt-PT');
  render(<BusinessRegionProvider><Probe /></BusinessRegionProvider>);
  expect(await screen.findByText(/BR: R\$/)).toBeVisible();
  expect(mock.update).not.toHaveBeenCalled();
});
it('waits for the Portuguese account before rendering any monetary value', async () => {
  mock.profile = { business_country: 'PT', preferred_locale: 'pt-PT', region_confirmed: true };
  render(<BusinessRegionProvider><Probe /></BusinessRegionProvider>);
  expect(screen.queryByText(/BR:/)).toBeNull();
  expect(await screen.findByText(/PT: 10,00/)).toHaveTextContent('€');
});
it('requires a new Google account to confirm its business country before opening the application', async () => {
  mock.profile.region_confirmed = false;
  render(<BusinessRegionProvider><Probe /></BusinessRegionProvider>);
  expect(await screen.findByText('Vamos preparar sua conta')).toBeVisible();
  expect(screen.queryByText(/BR:/)).toBeNull();
  fireEvent.change(screen.getByLabelText('País do negócio'), { target: { value: 'PT' } });
  fireEvent.click(screen.getByRole('button', { name: 'Confirmar e começar' }));
  expect(await screen.findByText(/PT: 10,00/)).toBeVisible();
  expect(mock.update).toHaveBeenCalledWith({ business_country: 'PT', region_confirmed: true, preferred_locale: 'pt-PT', pais: 'Portugal' });
});
it('fails closed when the account region is unavailable, with a retry action', async () => {
  mock.loadError = { message: 'unavailable' };
  render(<BusinessRegionProvider><Probe /></BusinessRegionProvider>);
  expect(await screen.findByRole('alert')).toBeVisible();
  expect(screen.queryByText(/BR:/)).toBeNull();
  mock.loadError = null;
  fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
  await waitFor(() => expect(screen.getByText(/BR: R\$/)).toBeVisible());
});
