import { describe, it, expect } from "vitest";
import { CONSENT_VERSION, CONSENT_STORAGE_KEY, DEFAULT_DENY, getStoredConsent, applyConsentToGtag } from "../consent";

describe("consent", () => {
  it("exporta versão de consentimento estável (string semver)", () => {
    expect(typeof CONSENT_VERSION).toBe("string");
    expect(CONSENT_VERSION.length).toBeGreaterThan(0);
  });
  it('rejects malformed or obsolete saved choices', () => {
    localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify({ ...DEFAULT_DENY, analytics: 'true', acceptedAt: new Date().toISOString() }));
    expect(getStoredConsent()).toBeNull();
    localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify({ ...DEFAULT_DENY, version: '1.0.0', acceptedAt: new Date().toISOString() }));
    expect(getStoredConsent()).toBeNull();
    localStorage.removeItem(CONSENT_STORAGE_KEY);
  });
  it('disables analytics collection on withdrawal without loading a script', () => {
    applyConsentToGtag(DEFAULT_DENY);
    expect((window as unknown as Record<string, unknown>)['ga-disable-G-HN35ZG4EPG']).toBe(true);
    expect(document.querySelector('script[src*="googletagmanager"]')).toBeNull();
  });
});
