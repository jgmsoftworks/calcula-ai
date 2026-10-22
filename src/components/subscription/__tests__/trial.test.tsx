import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const mocks = vi.hoisted(() => ({ access: {} as Record<string, unknown>, checkout: vi.fn(), portal: vi.fn(), refresh: vi.fn(), signOut: vi.fn(), reloadPlan: vi.fn() }));
vi.mock('@/hooks/useSubscriptionStatus', () => ({ useSubscriptionStatus: () => ({ ...mocks.access, refresh: mocks.refresh }) }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ signOut: mocks.signOut }) }));
vi.mock('@/hooks/usePlanLimits', () => ({ usePlanLimits: () => ({ currentPlan: 'lite', loading: false, reloadPlan: mocks.reloadPlan }) }));
vi.mock('@/hooks/usePlanos', async importOriginal => ({
  ...await importOriginal<typeof import('@/hooks/usePlanos')>(),
  usePlanos: () => ({ loading: false, planos: [{ id: 'lite', slug: 'lite', nome_publico: 'Iniciante', preco_centavos: 990, preco_anual_centavos: 9590, limites: { produtos: 30, receitas: 5, markups: 1, pdf_exports: 0, movimentacoes: -1 }, features: ['30 matérias-primas', '5 receitas', '1 bloco de markup'] }] }),
}));
vi.mock('@/hooks/useStripe', () => ({ useStripe: () => ({ createCheckout: mocks.checkout, openCustomerPortal: mocks.portal, loading: false }) }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }), toast: vi.fn() }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string, vars?: { name: string }) => vars?.name ? `Assinar ${vars.name}` : key }) }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { functions: { invoke: vi.fn() } } }));

import { SubscriptionStatusGate } from '../SubscriptionStatusGate';
import { TrialBadge } from '../TrialBadge';
import Planos from '@/pages/Planos';

beforeEach(() => {
  mocks.access = { loading: false, error: false, isBlocked: false, isTrial: true, trialExpired: false, daysRemaining: 7, hasSubscription: false, status: 'active' };
  vi.clearAllMocks();
});
afterEach(cleanup);
const open = (children: React.ReactNode, route = '/') => render(<MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>);

describe('seven-day Iniciante trial', () => {
  it('shows the remaining days in a link to plans', () => {
    open(<TrialBadge />);
    expect(screen.getByRole('link', { name: '7 dias restantes no teste Iniciante. Ver planos' })).toHaveAttribute('href', '/planos');
  });
  it('does not show a trial badge for an existing subscriber', () => {
    mocks.access.isTrial = false; open(<TrialBadge />); expect(screen.queryByRole('link')).toBeNull();
  });
  it.each([{ loading: true }, { error: true }, { isBlocked: true, trialExpired: true }])('does not mount operational resources for %o', state => {
    Object.assign(mocks.access, state);
    const mount = vi.fn(); const Content = () => { mount(); return <p>Operational data</p>; };
    open(<SubscriptionStatusGate><Content /></SubscriptionStatusGate>);
    expect(mount).not.toHaveBeenCalled(); expect(screen.queryByText('Operational data')).toBeNull();
  });
  it('expired test explains data retention and offers plan selection', () => {
    Object.assign(mocks.access, { isBlocked: true, trialExpired: true, daysRemaining: 0 });
    open(<SubscriptionStatusGate><p>App</p></SubscriptionStatusGate>);
    expect(screen.getByText('Seus 7 dias de teste terminaram')).toBeVisible();
    expect(screen.getByText('Seus dados continuam salvos')).toBeVisible();
    expect(screen.getByRole('link', { name: /Escolher plano e continuar/ })).toHaveAttribute('href', '/planos');
    expect(screen.queryByRole('button', { name: /Regularizar assinatura/ })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Já paguei, atualizar' })); expect(mocks.refresh).toHaveBeenCalled();
  });
  it.each([false, true])('Iniciante opens checkout for a trial account (expired: %s)', async expired => {
    Object.assign(mocks.access, { isBlocked: expired, trialExpired: expired, daysRemaining: expired ? 0 : 7 });
    open(<SubscriptionStatusGate><Planos /></SubscriptionStatusGate>, '/planos');
    fireEvent.click(screen.getByRole('button', { name: 'Assinar Iniciante' }));
    expect(mocks.checkout).toHaveBeenCalledWith('lite', 'monthly', undefined);
    expect(mocks.portal).not.toHaveBeenCalled();
  });
  it('uses the existing subscription portal instead of creating a duplicate subscription', () => {
    Object.assign(mocks.access, { isTrial: false, hasSubscription: true });
    open(<Planos />, '/planos');
    fireEvent.click(screen.getByRole('button', { name: 'plans.manageSubscription' }));
    expect(mocks.portal).toHaveBeenCalled(); expect(mocks.checkout).not.toHaveBeenCalled();
  });
});
