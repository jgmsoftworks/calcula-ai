import { localizeText } from '@/i18n/localizeText';
import { useTranslation as usePortugalTranslation } from 'react-i18next';
import { getBusinessRegion } from '@/lib/business-region';
import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AlertTriangle, Lock, RefreshCw, LogOut, CheckCircle2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useSubscriptionStatus } from '@/hooks/useSubscriptionStatus';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export function SubscriptionStatusGate({ children }: { children: React.ReactNode }) {
  usePortugalTranslation();
  const access = useSubscriptionStatus();
  const { signOut } = useAuth();
  const { pathname } = useLocation();
  const [portalLoading, setPortalLoading] = useState(false);
  const openPortal = async () => {
    setPortalLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal');
      if (error || !data?.url) throw new Error('Não foi possível abrir o pagamento. Tente novamente.');
      window.location.assign(data.url);
    } catch (err) {
      toast({ title: 'Pagamento indisponível', description: err instanceof Error ? err.message : 'Tente novamente.', variant: 'destructive' });
    } finally { setPortalLoading(false); }
  };

  // Billing and statutory privacy controls remain reachable; operational routes do not.
  if (pathname === '/planos' || pathname === '/minha-privacidade') return <>{children}</>;
  if (access.loading) return <div className="min-h-svh flex items-center justify-center gap-3"><LoadingSpinner /><p>Conferindo seu acesso…</p></div>;
  if (access.error) return <div className="min-h-svh flex flex-col items-center justify-center gap-4 p-6 text-center">
    <AlertTriangle className="h-9 w-9 text-amber-500" />
    <h1 className="text-xl font-semibold">Não foi possível conferir seu acesso</h1>
    <p className="text-muted-foreground">Confira sua conexão e tente novamente.</p>
    <Button onClick={() => void access.refresh()}>Tentar novamente</Button>
    <Button variant="ghost" onClick={() => void signOut()}>Sair</Button>
  </div>;

  if (access.isBlocked) return (
    <main className="min-h-svh flex items-center justify-center bg-gradient-to-br from-background via-primary/5 to-background p-4">
      <Card className="w-full max-w-xl overflow-hidden border-primary/20 shadow-xl">
        <div className="h-1.5 bg-gradient-to-r from-[#0483e4] to-[#7328b1]" />
        <div className="space-y-6 p-6 text-center sm:p-9">
          <p className="font-display text-xl font-bold text-primary">Calcula Aí</p>
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10"><Lock className="h-8 w-8 text-primary" /></div>
          <div className="space-y-3">
            <h1 className="font-display text-2xl font-bold">{access.trialExpired ? 'Seus 7 dias de teste terminaram' : 'Escolha como continuar'}</h1>
            <p className="text-muted-foreground">Escolha uma forma de pagamento para prosseguir e continuar usando o aplicativo.</p>
          </div>
          <div className="flex gap-3 rounded-xl border border-primary/15 bg-primary/5 p-4 text-left">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div><p className="font-semibold">{localizeText("Seus dados continuam salvos")}</p><p className="mt-1 text-sm text-muted-foreground">Assine um plano e continue nesta mesma conta, com seus produtos, receitas e histórico. O acesso será liberado após a confirmação do pagamento.</p></div>
          </div>
          <div className="space-y-3">
            <Button asChild size="lg" className="w-full bg-gradient-to-r from-[#0483e4] to-[#7328b1] text-white"><Link to="/planos"><Sparkles className="mr-2 h-4 w-4" />Escolher plano e continuar</Link></Button>
            {access.hasSubscription && <Button variant="outline" className="w-full" onClick={() => void openPortal()} disabled={portalLoading}>{portalLoading ? 'Abrindo…' : 'Regularizar assinatura existente'}</Button>}
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => void access.refresh()}><RefreshCw className="mr-2 h-4 w-4" />Já paguei, atualizar</Button>
            <Button variant="ghost" size="sm" onClick={() => void signOut()}><LogOut className="mr-2 h-4 w-4" />Sair</Button>
          </div>
          <div className="flex justify-center gap-5 text-xs text-muted-foreground">
            <Link to="/minha-privacidade" className="underline">Minha privacidade</Link>
            <a href="mailto:calculaai.adm@gmail.com" className="underline">Preciso de ajuda</a>
          </div>
        </div>
      </Card>
    </main>
  );
  return <>
    {access.showWarning && access.inGracePeriod && <div className="sticky top-0 z-40 border-b border-amber-500/30 bg-amber-500/15">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2">
        <p className="text-sm"><strong>Pagamento em atraso.</strong> Regularize para continuar usando.
          {access.graceEndsAt && <> Prazo: {new Date(access.graceEndsAt).toLocaleDateString(getBusinessRegion().locale)}.</>}
        </p>
        <Button size="sm" onClick={() => void openPortal()} disabled={portalLoading}>Regularizar pagamento</Button>
      </div>
    </div>}
    {children}
  </>;
}
