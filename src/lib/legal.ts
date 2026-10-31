import release from '@/legal/release.json';
import { supabase } from '@/integrations/supabase/client';

export const LEGAL_RELEASE = release;
export type LegalDocumentKey = keyof typeof release.documents;
export const LEGAL_EXEMPT_PATHS = ['/auth', '/auth/success', '/auth/stripe-complete', '/reset-password', '/termos-de-uso', '/politica-de-privacidade', '/cookies', '/minha-privacidade', '/planos'];
export function requiresLegalAcceptance(path: string) {
  return !LEGAL_EXEMPT_PATHS.includes(path) && !path.startsWith('/producao-compartilhada/') && !/^\/(ref|aff|affiliate)\//.test(path);
}

export type LegalStatus = { version: string; content_sha256: string; accepted: boolean };

export async function legalContentHash() {
  const bytes = new TextEncoder().encode(JSON.stringify(release));
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}

// These RPCs only expose the caller's receipt; no user ID or client timestamp is accepted.
export async function getLegalStatus(): Promise<LegalStatus> {
  const { data, error } = await supabase.rpc('legal_acceptance_status');
  if (error || !data?.[0]) throw new Error('Não foi possível conferir os documentos. Tente novamente.');
  if (data[0].version !== release.version) throw new Error('Os documentos foram atualizados. Recarregue esta página.');
  if (data[0].content_sha256 !== await legalContentHash()) throw new Error('O conteúdo dos documentos mudou. Recarregue esta página.');
  return data[0];
}

export async function recordLegalAcceptance(status: LegalStatus) {
  const { error } = await supabase.rpc('accept_legal_documents', {
    p_version: status.version,
    p_content_sha256: status.content_sha256,
    p_accept_terms: true,
    p_acknowledge_privacy: true,
  });
  if (error) throw new Error('Não foi possível salvar seu aceite. Tente novamente.');
}
