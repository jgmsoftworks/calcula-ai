import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import type { Plano } from '@/hooks/usePlanos';

const mocks = vi.hoisted(() => ({
  currentPlan: 'lite', access: { loading: false, error: false, isTrial: true, trialExpired: false, daysRemaining: 5, hasSubscription: false, status: 'active', isBlocked: false, refresh: vi.fn() },
  createCheckout: vi.fn(), portal: vi.fn(), reload: vi.fn(), reloadPlan: vi.fn(), toast: vi.fn(), plansError: null as string | null, catalog: [] as Plano[],
}));
vi.mock('@/hooks/usePlanLimits', () => ({ usePlanLimits: () => ({ currentPlan: mocks.currentPlan, loading: false, reloadPlan: mocks.reloadPlan }) }));
vi.mock('@/hooks/useSubscriptionStatus', () => ({ useSubscriptionStatus: () => mocks.access }));
vi.mock('@/hooks/useStripe', () => ({ useStripe: () => ({ createCheckout: mocks.createCheckout, openCustomerPortal: mocks.portal, loading: false }) }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('@/hooks/usePlanos', async importOriginal => ({ ...(await importOriginal<typeof import('@/hooks/usePlanos')>()), usePlanos: () => ({ planos: mocks.catalog, loading: false, error: mocks.plansError, reload: mocks.reload }) }));
import Planos from '../Planos';

function plan(slug: Plano['slug'], price: number, annual: number, recipes: number, pdf: number): Plano {
  return { id: slug, slug, nome_publico: ({ lite: 'Iniciante', professional: 'Profissional', enterprise: 'Empresarial' })[slug], preco_centavos: price, preco_anual_centavos: annual,
    limites: { receitas: recipes, pdf_exports: pdf, markups: slug === 'lite' ? 1 : 3, produtos: slug === 'lite' ? 30 : -1, movimentacoes: -1 }, features: [] } as unknown as Plano;
}
const card = (name: string) => screen.getByRole('article', { name });
beforeEach(() => {
  vi.clearAllMocks();
  mocks.currentPlan = 'lite'; mocks.plansError = null;
  Object.assign(mocks.access, { loading: false, error: false, isTrial: true, trialExpired: false, daysRemaining: 5, hasSubscription: false, status: 'active', isBlocked: false });
  mocks.catalog = [plan('lite', 990, 9590, 5, 0), plan('professional', 2990, 28990, 60, 80), plan('enterprise', 4990, 48590, -1, -1)];
  mocks.createCheckout.mockResolvedValue(undefined); mocks.portal.mockResolvedValue(undefined);
  window.history.replaceState({}, '', '/planos');
});
afterEach(cleanup);

describe('plans selection', () => {
  it('identifies the trial plan and states the actual PDF restriction and quotas', () => {
    render(<Planos />);
    expect(within(card('Iniciante')).getByText('Seu plano no teste')).toBeVisible();
    expect(within(card('Iniciante')).getByText('Fichas técnicas em PDF não incluídas')).toBeVisible();
    expect(within(card('Profissional')).getByText('80 fichas técnicas em PDF por mês')).toBeVisible();
    expect(within(card('Empresarial')).getByText('Receitas sem limite')).toBeVisible();
    expect(screen.getByText('5 dias restantes')).toBeVisible();
    expect(screen.queryByText(/mais popular/i)).toBeNull();
  });
  it('uses live annual values, explains the charge and sends the selected plan, period and affiliate', async () => {
    // A changed catalog price must be reflected without changing page copy.
    mocks.catalog[1].preco_anual_centavos = 28000;
    window.history.replaceState({}, '', '/planos?ref=parceiro');
    render(<Planos />);
    fireEvent.click(screen.getByRole('button', { name: 'Cobrança anual' }));
    expect(screen.getByRole('button', { name: 'Cobrança anual' })).toHaveAttribute('aria-pressed', 'true');
    expect(within(card('Profissional')).getByText('R$ 280,00')).toBeVisible();
    expect(within(card('Profissional')).getByText('R$ 280,00 cobrados por ano. Equivale a R$ 23,33/mês.')).toBeVisible();
    expect(within(card('Profissional')).getByText('R$ 78,80')).toBeVisible();
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Escolher Profissional' })); });
    expect(mocks.createCheckout).toHaveBeenCalledExactlyOnceWith('professional', 'yearly', 'parceiro');
    expect(mocks.portal).not.toHaveBeenCalled();
  });
  it('keeps monthly checkout available to an expired trial without changing accounts', async () => {
    mocks.access.trialExpired = true; mocks.access.isBlocked = true; mocks.access.daysRemaining = 0;
    render(<Planos />);
    expect(screen.getByText('Teste encerrado')).toBeVisible();
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Escolher Iniciante' })); });
    expect(mocks.createCheckout).toHaveBeenCalledExactlyOnceWith('lite', 'monthly', undefined);
  });
  it('sends an existing subscription to management instead of starting a second checkout', async () => {
    mocks.access.hasSubscription = true; mocks.access.isTrial = false; mocks.currentPlan = 'professional';
    render(<Planos />);
    expect(card('Profissional')).toHaveAttribute('data-current', 'true');
    await act(async () => { fireEvent.click(within(card('Empresarial')).getByRole('button', { name: 'Alterar assinatura' })); });
    expect(mocks.portal).toHaveBeenCalledOnce(); expect(mocks.createCheckout).not.toHaveBeenCalled();
  });
  it('blocks all plan buttons while checkout is opening and recovers afterwards', async () => {
    let finish!: () => void;
    mocks.createCheckout.mockReturnValueOnce(new Promise<void>(resolve => { finish = resolve; }));
    render(<Planos />);
    fireEvent.click(screen.getByRole('button', { name: 'Escolher Profissional' }));
    expect(screen.getByRole('button', { name: 'Abrindo…' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Escolher Iniciante' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Escolher Iniciante' }));
    expect(mocks.createCheckout).toHaveBeenCalledOnce();
    await act(async () => { finish(); });
    expect(screen.getByRole('button', { name: 'Escolher Iniciante' })).toBeEnabled();
  });
  it('does not present a missing annual price as a free plan', () => {
    mocks.catalog[0].preco_anual_centavos = 0;
    render(<Planos />); fireEvent.click(screen.getByRole('button', { name: 'Cobrança anual' }));
    expect(within(card('Iniciante')).getByRole('button', { name: 'Indisponível no anual' })).toBeDisabled();
    expect(within(card('Iniciante')).queryByText('Grátis')).toBeNull();
  });
  it('keeps contracting disabled when account verification failed', () => {
    mocks.access.error = true; render(<Planos />);
    expect(screen.getByRole('button', { name: 'Escolher Iniciante' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(mocks.access.refresh).toHaveBeenCalledOnce();
  });
  it('offers recovery instead of an empty price grid when the catalog fails', () => {
    mocks.plansError = 'network'; mocks.catalog = []; render(<Planos />);
    expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível carregar os planos');
    fireEvent.click(screen.getByRole('button', { name: 'Carregar planos novamente' }));
    expect(mocks.reload).toHaveBeenCalledOnce();
    expect(screen.queryByRole('table')).toBeNull();
  });
});
