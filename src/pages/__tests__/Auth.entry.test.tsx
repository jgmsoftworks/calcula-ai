import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Auth from '../Auth';

vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: null }) }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }));
vi.mock('@/lib/acquisition', () => ({ rememberAcquisition: vi.fn() }));
vi.mock('@/lib/funnel-analytics', () => ({ trackFunnel: vi.fn() }));
vi.mock('@/components/AuthAnimation', () => ({ AuthAnimation: () => <div>Video</div> }));
vi.mock('next-themes', () => ({ useTheme: () => ({ resolvedTheme: 'light', setTheme: vi.fn() }) }));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'pt-BR' } }),
}));

const openAuth = (entry = '/auth') => render(<MemoryRouter initialEntries={[entry]}><Auth /></MemoryRouter>);

beforeEach(() => {
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  vi.stubGlobal('ResizeObserver', class {
    observe() {}
    unobserve() {}
    disconnect() {}
  });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('authentication page entry', () => {
  it.each(['/auth', '/auth?mode=signup'])('opens %s at the top without focusing a field', (entry) => {
    openAuth(entry);
    expect(document.activeElement).toBe(document.body);
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, left: 0, behavior: 'instant' });
    screen.getByLabelText('auth.email').focus();
    expect(document.activeElement).toBe(document.body);
  });

  it('lets the user focus and edit the email after a tap', () => {
    openAuth();
    const email = screen.getByLabelText('auth.email');
    fireEvent.pointerDown(email);
    email.focus();
    fireEvent.change(email, { target: { value: 'cliente@example.com' } });
    expect(document.activeElement).toBe(email);
    expect(email).toHaveValue('cliente@example.com');
  });

  it('preserves keyboard navigation', () => {
    openAuth();
    fireEvent.keyDown(document, { key: 'Tab' });
    const email = screen.getByLabelText('auth.email');
    email.focus();
    expect(document.activeElement).toBe(email);
  });

  it('clears restored field focus when returning through the page cache', () => {
    openAuth();
    const email = screen.getByLabelText('auth.email');
    fireEvent.pointerDown(email);
    email.focus();
    fireEvent(window, new PageTransitionEvent('pageshow', { persisted: true }));
    expect(document.activeElement).toBe(document.body);
    email.focus();
    expect(document.activeElement).toBe(document.body);
    fireEvent.touchStart(email);
    email.focus();
    expect(document.activeElement).toBe(email);
  });

  it('does not interrupt editing if the first page load finishes after a tap', () => {
    openAuth();
    const email = screen.getByLabelText('auth.email');
    fireEvent.pointerDown(email);
    email.focus();
    fireEvent(window, new PageTransitionEvent('pageshow', { persisted: false }));
    expect(document.activeElement).toBe(email);
  });
});
