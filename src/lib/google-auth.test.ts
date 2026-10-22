import { describe, expect, it, vi } from 'vitest';
import { startGoogleSignIn } from './google-auth';

const redirectTo = 'https://preview.example.test/?trial=1&source=landing';
const providerUrl = 'https://auth.example.test/authorize?provider=google';

function setup(embedded = true) {
  const tab = { opener: {}, closed: false, close: vi.fn(), location: { replace: vi.fn() } };
  const open = vi.fn(() => tab as unknown as Window);
  const browser = { self: window, top: embedded ? null : window, open };
  const auth = { signInWithOAuth: vi.fn().mockResolvedValue({ data: { url: providerUrl }, error: null }) };
  return { tab, open, browser, auth };
}

describe('Google sign-in outside embedded previews', () => {
  it('opens the tab during the click, before awaiting the SDK, and preserves the trial return URL', async () => {
    const { tab, open, browser, auth } = setup();
    let finish!: (value: unknown) => void;
    auth.signInWithOAuth.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    const result = startGoogleSignIn(auth, redirectTo, browser);
    expect(open).toHaveBeenCalledOnce();
    expect(tab.opener).toBeNull();
    expect(tab.location.replace).not.toHaveBeenCalled();
    expect(auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: 'google', options: { redirectTo, skipBrowserRedirect: true },
    });
    finish({ data: { url: providerUrl }, error: null });
    expect(await result).toEqual({ error: null, openedInNewTab: true });
    expect(tab.location.replace).toHaveBeenCalledWith(providerUrl);
  });

  it('uses the ordinary same-tab flow on the published site', async () => {
    const { open, browser, auth } = setup(false);
    expect(await startGoogleSignIn(auth, redirectTo, browser)).toEqual({ error: null, openedInNewTab: false });
    expect(open).not.toHaveBeenCalled();
    expect(auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: 'google', options: { redirectTo, skipBrowserRedirect: false },
    });
  });

  it('does not navigate the iframe when popups are blocked', async () => {
    const { browser, auth } = setup();
    browser.open.mockReturnValue(null as unknown as Window);
    const { error } = await startGoogleSignIn(auth, redirectTo, browser);
    expect(error?.message).toContain('Permita a abertura');
    expect(auth.signInWithOAuth).not.toHaveBeenCalled();
  });

  it.each(['returned', 'thrown'])('closes the unused tab when the SDK error is %s', async (kind) => {
    const { tab, browser, auth } = setup();
    const error = new Error('Provider unavailable');
    if (kind === 'returned') auth.signInWithOAuth.mockResolvedValue({ data: { url: null }, error });
    else auth.signInWithOAuth.mockRejectedValue(error);
    expect((await startGoogleSignIn(auth, redirectTo, browser)).error).toBe(error);
    expect(tab.close).toHaveBeenCalledOnce();
    expect(tab.location.replace).not.toHaveBeenCalled();
  });

  it('recovers if the user closes the new tab before OAuth is ready', async () => {
    const { tab, browser, auth } = setup();
    tab.closed = true;
    const { error } = await startGoogleSignIn(auth, redirectTo, browser);
    expect(error?.message).toContain('foi fechada');
    expect(tab.location.replace).not.toHaveBeenCalled();
  });

  it('closes a blank tab if the SDK returns no authorization URL', async () => {
    const { tab, browser, auth } = setup();
    auth.signInWithOAuth.mockResolvedValue({ data: { url: null }, error: null });
    expect((await startGoogleSignIn(auth, redirectTo, browser)).error).toBeInstanceOf(Error);
    expect(tab.close).toHaveBeenCalledOnce();
  });
});
