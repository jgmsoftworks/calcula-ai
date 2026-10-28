import { useEffect, useState, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { getLegalStatus, LEGAL_RELEASE, recordLegalAcceptance, requiresLegalAcceptance } from '@/lib/legal';

export function LegalAcceptanceGate({ children }: { children: ReactNode }) {
  const { user, signOut } = useAuth();
  const { pathname } = useLocation();
  const client = useQueryClient();
  const required = !!user && requiresLegalAcceptance(pathname);
  const [terms, setTerms] = useState(false);
  const [privacy, setPrivacy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const queryKey = ['legal-acceptance', user?.id, LEGAL_RELEASE.version];
  const status = useQuery({ queryKey, queryFn: getLegalStatus, enabled: required && LEGAL_RELEASE.status === 'published', retry: false, staleTime: 0, gcTime: 0 });
  useEffect(() => { setTerms(false); setPrivacy(false); setSaveError(''); }, [user?.id]);

  if (!required) return <>{children}</>;
  if (LEGAL_RELEASE.status === 'published' && status.data?.accepted && !status.isError) return <>{children}</>;

  async function accept() {
    if (!terms || !privacy || !status.data || saving) return;
    setSaving(true); setSaveError('');
    try {
      await recordLegalAcceptance(status.data);
      await client.invalidateQueries({ queryKey });
    } catch (error) { setSaveError(error instanceof Error ? error.message : 'Tente novamente.'); }
    finally { setSaving(false); }
  }

  const draft = LEGAL_RELEASE.status !== 'published';
  const error = saveError || (status.error instanceof Error ? status.error.message : '');
  return <main className="min-h-svh flex items-center justify-center bg-background p-5">
    <section aria-labelledby="legal-title" className="w-full max-w-lg space-y-6 rounded-2xl border bg-card p-6 sm:p-8">
      <p className="font-display text-lg font-bold text-primary">Calcula Aí</p>
      <h1 id="legal-title" className="text-2xl font-semibold">Antes de continuar</h1>
      <p className="text-muted-foreground">Confira os documentos que explicam o teste de sete dias, a assinatura e o uso dos seus dados.</p>
      <p className="text-sm text-muted-foreground">Versão {LEGAL_RELEASE.version}. As escolhas de cookies são independentes.</p>
      <label className="flex items-start gap-3 text-sm"><Checkbox checked={terms} onCheckedChange={v => setTerms(v === true)} aria-label="Aceito os Termos de Uso" /><span>Li e aceito os <Link to="/termos-de-uso" target="_blank" rel="noopener" className="text-primary underline">Termos de Uso</Link>.</span></label>
      <label className="flex items-start gap-3 text-sm"><Checkbox checked={privacy} onCheckedChange={v => setPrivacy(v === true)} aria-label="Estou ciente da Política de Privacidade" /><span>Li e estou ciente da <Link to="/politica-de-privacidade" target="_blank" rel="noopener" className="text-primary underline">Política de Privacidade</Link>.</span></label>
      {draft && <p role="status" className="text-sm">Prévia: documentos ainda não publicados. Nenhum aceite será registrado.</p>}
      {status.isLoading && !draft && <p role="status">Conferindo seu aceite…</p>}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <Button className="w-full" disabled={draft || !terms || !privacy || saving || !status.data || status.isError} onClick={() => void accept()}>{saving ? 'Salvando…' : 'Aceitar e continuar'}</Button>
      {status.isError && <Button variant="outline" onClick={() => void status.refetch()}>Tentar novamente</Button>}
      <div className="flex flex-wrap gap-4 text-sm"><Link to="/minha-privacidade" className="underline">Meus dados e exclusão</Link><Link to="/planos" className="underline">Gerenciar assinatura</Link><Button variant="link" className="h-auto p-0" onClick={() => void signOut()}>Sair</Button></div>
    </section>
  </main>;
}
