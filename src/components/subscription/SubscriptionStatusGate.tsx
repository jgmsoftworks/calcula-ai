import { useState } from 'react';
import { AlertTriangle, Lock, MessageCircle, RefreshCw, LogOut, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useSubscriptionStatus } from '@/hooks/useSubscriptionStatus';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

const SUPPORT_PHONE = '556292622545';

function openCustomerPortal(setLoading: (b: boolean) => void) {
  setLoading(true);
  supabase.functions
    .invoke('customer-portal')
    .then(({ data, error }) => {
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, '_blank', 'noopener,noreferrer');
      } else {
        throw new Error('URL do portal não retornada');
      }
    })
    .catch((err) => {
      toast({
        title: 'Erro ao abrir portal de pagamento',
        description: err?.message || 'Tente novamente em instantes.',
        variant: 'destructive',
      });
    })
    .finally(() => setLoading(false));
}

export function SubscriptionStatusGate({ children }: { children: React.ReactNode }) {
  const { isBlocked, showWarning, openIssue, inGracePeriod, refresh, loading } = useSubscriptionStatus();
  const { signOut, user } = useAuth();
  const [portalLoading, setPortalLoading] = useState(false);

  if (loading) return <>{children}</>;

  if (isBlocked) {
    const whatsappMsg = encodeURIComponent(
      `Olá, sou ${user?.email} e meu acesso ao CalculaAi está bloqueado por questão de pagamento. Preciso de ajuda para regularizar.`
    );
    return (
      <div className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
        <Card className="max-w-2xl w-full p-8 border-2 border-destructive/40 shadow-2xl">
          <div className="flex flex-col items-center text-center space-y-6">
            <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center">
              <Lock className="w-10 h-10 text-destructive" />
            </div>

            <div className="space-y-2">
              <h1 className="text-3xl font-bold text-foreground">
                Seu acesso está bloqueado
              </h1>
              <p className="text-lg text-muted-foreground">
                {openIssue?.issue_type === 'subscription_canceled'
                  ? 'Sua assinatura foi cancelada.'
                  : 'Identificamos um problema com o pagamento da sua assinatura.'}
              </p>
            </div>

            <div className="w-full p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-left">
              <div className="flex gap-3">
                <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold text-emerald-700 dark:text-emerald-400">
                    Seus dados estão 100% seguros
                  </p>
                  <p className="text-sm text-foreground/80">
                    Nada foi apagado. Todas as suas receitas, produtos, markups,
                    movimentações, folha de pagamento e histórico continuam salvos.
                    Assim que você regularizar o pagamento, seu acesso é liberado
                    imediatamente e tudo volta como estava.
                  </p>
                </div>
              </div>
            </div>

            <div className="w-full text-left space-y-2">
              <p className="text-sm font-medium text-foreground">Enquanto não regularizar, você não consegue:</p>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-5">
                <li>Lançar movimentações, ingredientes ou receitas novas</li>
                <li>Editar markups, despesas ou folha de pagamento</li>
                <li>Exportar fichas técnicas, PDFs e relatórios</li>
                <li>Acessar o dashboard e indicadores</li>
              </ul>
            </div>

            {openIssue?.failure_reason && (
              <div className="w-full p-3 rounded-lg bg-muted text-sm text-muted-foreground">
                <strong>Motivo informado pelo Stripe:</strong> {openIssue.failure_reason}
              </div>
            )}

            <div className="w-full flex flex-col sm:flex-row gap-3">
              <Button
                size="lg"
                className="flex-1"
                onClick={() => openCustomerPortal(setPortalLoading)}
                disabled={portalLoading}
              >
                {portalLoading ? 'Abrindo...' : 'Regularizar pagamento'}
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="flex-1"
                asChild
              >
                <a
                  href={`https://wa.me/${SUPPORT_PHONE}?text=${whatsappMsg}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Falar com suporte
                </a>
              </Button>
            </div>

            <div className="flex gap-2 text-sm">
              <Button variant="ghost" size="sm" onClick={refresh}>
                <RefreshCw className="w-3 h-3 mr-2" />
                Já paguei, atualizar
              </Button>
              <Button variant="ghost" size="sm" onClick={() => signOut()}>
                <LogOut className="w-3 h-3 mr-2" />
                Sair
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <>
      {showWarning && inGracePeriod && (
        <div className="sticky top-0 z-40 bg-amber-500/15 border-b border-amber-500/30 backdrop-blur-sm">
          <div className="container mx-auto px-4 py-2 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 text-sm">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span className="text-foreground">
                <strong>Pagamento em atraso.</strong> Regularize para evitar o bloqueio do acesso. Seus dados não serão perdidos.
                {openIssue?.grace_period_ends_at && (
                  <> Bloqueio em <strong>{new Date(openIssue.grace_period_ends_at).toLocaleDateString('pt-BR')}</strong>.</>
                )}
              </span>
            </div>
            <Button size="sm" onClick={() => openCustomerPortal(setPortalLoading)} disabled={portalLoading}>
              {portalLoading ? 'Abrindo...' : 'Regularizar agora'}
            </Button>
          </div>
        </div>
      )}
      {children}
    </>
  );
}
