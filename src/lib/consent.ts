/**
 * Sistema de Consentimento LGPD — Cookies
 *
 * - Versionado (qualquer alteração nesse texto/categorias deve incrementar CONSENT_VERSION)
 * - Persistido em localStorage para uso pré-login
 * - Persistido também no Supabase (tabela user_consents) para prova jurídica
 * - Integrado com Google Consent Mode v2
 */

export const CONSENT_VERSION = '1.0.0';
export const CONSENT_STORAGE_KEY = 'calculaai_cookie_consent_v1';
export const ANON_ID_KEY = 'calculaai_anon_id';

export type ConsentCategory = 'necessary' | 'analytics' | 'marketing';

export interface CookieConsent {
  necessary: true; // sempre true por força LGPD/legítimo interesse
  analytics: boolean;
  marketing: boolean;
  version: string;
  acceptedAt: string; // ISO
}

export const DEFAULT_DENY: CookieConsent = {
  necessary: true,
  analytics: false,
  marketing: false,
  version: CONSENT_VERSION,
  acceptedAt: '',
};

export function getStoredConsent(): CookieConsent | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(CONSENT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CookieConsent;
    if (parsed.version !== CONSENT_VERSION) return null; // força re-consent em mudança de versão
    return parsed;
  } catch {
    return null;
  }
}

export function persistConsent(consent: CookieConsent): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(consent));
}

export function clearStoredConsent(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(CONSENT_STORAGE_KEY);
}

export function getOrCreateAnonymousId(): string {
  if (typeof window === 'undefined') return '';
  let id = localStorage.getItem(ANON_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(ANON_ID_KEY, id);
  }
  return id;
}

/**
 * Aplica o consentimento ao Google Consent Mode v2 e carrega o GA4
 * apenas se 'analytics' foi aceito.
 */
export function applyConsentToGtag(consent: CookieConsent): void {
  if (typeof window === 'undefined') return;
  const w = window as any;

  // Garantir dataLayer e gtag stub
  w.dataLayer = w.dataLayer || [];
  if (!w.gtag) {
    w.gtag = function () {
      // eslint-disable-next-line prefer-rest-params
      w.dataLayer.push(arguments);
    };
  }

  // Atualiza Consent Mode v2
  w.gtag('consent', 'update', {
    ad_storage: consent.marketing ? 'granted' : 'denied',
    ad_user_data: consent.marketing ? 'granted' : 'denied',
    ad_personalization: consent.marketing ? 'granted' : 'denied',
    analytics_storage: consent.analytics ? 'granted' : 'denied',
    functionality_storage: 'granted',
    security_storage: 'granted',
  });

  // Se analytics foi aceito e o script ainda não foi carregado, carregar agora
  if (consent.analytics && !w.__ga4_loaded__) {
    const GA_ID = 'G-HN35ZG4EPG';
    const s = document.createElement('script');
    s.async = true;
    s.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
    document.head.appendChild(s);
    w.gtag('js', new Date());
    w.gtag('config', GA_ID, { anonymize_ip: true });
    w.__ga4_loaded__ = true;
  }
}
