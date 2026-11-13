import { createContext, useContext } from 'react';

import { CookieConsent } from '@/lib/consent';

export type ConsentContextValue = {
  consent: CookieConsent | null;
  needsDecision: boolean;
  showPreferences: boolean;
  openPreferences: () => void;
  closePreferences: () => void;
  acceptAll: () => Promise<void>;
  rejectAll: () => Promise<void>;
  saveCustom: (analytics: boolean, marketing: boolean) => Promise<void>;
};

export const Ctx = createContext<ConsentContextValue | undefined>(undefined);

export function useCookieConsent(): ConsentContextValue {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useCookieConsent must be used within CookieConsentProvider');
  return ctx;
}
