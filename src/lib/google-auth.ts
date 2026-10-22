import type { SupabaseClient } from '@supabase/supabase-js';

type OAuthClient = Pick<SupabaseClient['auth'], 'signInWithOAuth'>;
type OAuthBrowser = Pick<Window, 'self' | 'top' | 'open'>;

/** Google refuses to load inside an embedded preview. Keep OAuth top-level. */
export async function startGoogleSignIn(
  auth: OAuthClient,
  redirectTo: string,
  browser: OAuthBrowser = window,
): Promise<{ error: Error | null; openedInNewTab: boolean }> {
  const embedded = browser.self !== browser.top;
  let loginTab: Window | null = null;

  try {
    if (embedded) {
      // Open during the click, before async work consumes the user gesture.
      loginTab = browser.open('about:blank', '_blank');
      if (!loginTab) {
        throw new Error('Permita a abertura de novas abas e tente novamente, ou abra o aplicativo em uma aba própria.');
      }
      // The provider does not need access to the editor or the original tab.
      loginTab.opener = null;
    }

    const { data, error } = await auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo, skipBrowserRedirect: embedded },
    });
    if (error) throw error;

    if (loginTab) {
      if (loginTab.closed) throw new Error('A aba de login foi fechada. Tente novamente.');
      if (!data.url) throw new Error('Não foi possível abrir o Google. Tente novamente.');
      loginTab.location.replace(data.url);
    }
    return { error: null, openedInNewTab: embedded };
  } catch (error) {
    loginTab?.close();
    return {
      error: error instanceof Error ? error : new Error('Não foi possível abrir o Google. Tente novamente.'),
      openedInNewTab: false,
    };
  }
}
