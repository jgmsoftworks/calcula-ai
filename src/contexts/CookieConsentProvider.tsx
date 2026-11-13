import { useCallback, useEffect, useMemo, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { CONSENT_VERSION, CookieConsent, applyConsentToGtag, getOrCreateAnonymousId, getStoredConsent, persistConsent } from '@/lib/consent';
import { Ctx, type ConsentContextValue } from '@/hooks/useCookieConsent';

async function recordConsentRows(
  userId: string | null,
  consent: CookieConsent
): Promise<void> {
  const anonymous_id = userId ? null : getOrCreateAnonymousId();
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : null;
  const base = {
    user_id: userId,
    anonymous_id,
    version: consent.version,
    user_agent: ua,
    ip: null as string | null, // IP é capturado no servidor pelo Supabase logs; não confiar em client
  };

  const rows = [
    { ...base, consent_type: 'cookies_necessary', accepted: true },
    { ...base, consent_type: 'cookies_analytics', accepted: consent.analytics },
    { ...base, consent_type: 'cookies_marketing', accepted: consent.marketing },
  ];

  try {
    await supabase.from('user_consents').insert(rows);
  } catch (err) {
    // Não bloquear UX em caso de falha de gravação
    console.warn('[consent] Falha ao registrar consentimento no servidor', err);
  }
}

export function CookieConsentProvider({ children }: { children: ReactNode }) {
  const [consent, setConsent] = useState<CookieConsent | null>(null);
  const [showPreferences, setShowPreferences] = useState(false);

  // Hidrata consentimento existente e aplica ao gtag
  useEffect(() => {
    const stored = getStoredConsent();
    if (stored) {
      setConsent(stored);
      applyConsentToGtag(stored);
    }
  }, []);

  const persist = useCallback(async (next: CookieConsent) => {
    persistConsent(next);
    setConsent(next);
    applyConsentToGtag(next);
    const { data } = await supabase.auth.getUser();
    await recordConsentRows(data?.user?.id ?? null, next);
  }, []);

  const acceptAll = useCallback(async () => {
    await persist({
      necessary: true,
      analytics: true,
      marketing: true,
      version: CONSENT_VERSION,
      acceptedAt: new Date().toISOString(),
    });
  }, [persist]);

  const rejectAll = useCallback(async () => {
    await persist({
      necessary: true,
      analytics: false,
      marketing: false,
      version: CONSENT_VERSION,
      acceptedAt: new Date().toISOString(),
    });
  }, [persist]);

  const saveCustom = useCallback(
    async (analytics: boolean, marketing: boolean) => {
      await persist({
        necessary: true,
        analytics,
        marketing,
        version: CONSENT_VERSION,
        acceptedAt: new Date().toISOString(),
      });
    },
    [persist]
  );

  const value = useMemo<ConsentContextValue>(
    () => ({
      consent,
      needsDecision: consent === null,
      showPreferences,
      openPreferences: () => setShowPreferences(true),
      closePreferences: () => setShowPreferences(false),
      acceptAll,
      rejectAll,
      saveCustom,
    }),
    [consent, showPreferences, acceptAll, rejectAll, saveCustom]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
