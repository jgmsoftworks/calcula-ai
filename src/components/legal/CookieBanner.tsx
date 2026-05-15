import { useEffect, useState } from 'react';
import { Cookie, Settings2, ShieldCheck, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useCookieConsent } from '@/hooks/useCookieConsent';
import { Link } from 'react-router-dom';

export function CookieBanner() {
  const { needsDecision, showPreferences, openPreferences, closePreferences, acceptAll, rejectAll, saveCustom, consent } =
    useCookieConsent();

  const [analytics, setAnalytics] = useState(consent?.analytics ?? false);
  const [marketing, setMarketing] = useState(consent?.marketing ?? false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const h = () => openPreferences();
    window.addEventListener('open-cookie-preferences', h);
    return () => window.removeEventListener('open-cookie-preferences', h);
  }, [openPreferences]);

  const handle = async (fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {/* Banner inferior — aparece apenas se ainda não há decisão */}
      {needsDecision && !showPreferences && (
        <div
          role="dialog"
          aria-live="polite"
          aria-label="Aviso de cookies"
          className="fixed inset-x-0 bottom-0 z-[100] p-3 sm:p-4 animate-fade-in"
        >
          <div className="mx-auto max-w-4xl rounded-2xl border border-border/40 bg-card/95 backdrop-blur-xl shadow-elevated p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <div className="hidden sm:flex w-10 h-10 rounded-xl bg-primary/10 items-center justify-center flex-shrink-0">
                <Cookie className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0 space-y-3">
                <div>
                  <h2 className="text-sm sm:text-base font-semibold font-display flex items-center gap-2">
                    <Cookie className="h-4 w-4 sm:hidden text-primary" />
                    Sua privacidade importa
                  </h2>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1 leading-relaxed">
                    Usamos cookies necessários para o funcionamento do app e, com seu consentimento, cookies de
                    análise e marketing para melhorar sua experiência. Você pode personalizar ou recusar a qualquer
                    momento. Saiba mais na{' '}
                    <Link to="/politica-de-privacidade" className="text-primary underline underline-offset-2">
                      Política de Privacidade
                    </Link>{' '}
                    e na{' '}
                    <Link to="/cookies" className="text-primary underline underline-offset-2">
                      Política de Cookies
                    </Link>
                    .
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button
                    onClick={() => handle(rejectAll)}
                    disabled={busy}
                    variant="outline"
                    size="sm"
                    className="rounded-xl text-xs sm:text-sm"
                  >
                    Recusar opcionais
                  </Button>
                  <Button
                    onClick={openPreferences}
                    disabled={busy}
                    variant="outline"
                    size="sm"
                    className="rounded-xl text-xs sm:text-sm"
                  >
                    <Settings2 className="h-3.5 w-3.5 mr-1.5" />
                    Personalizar
                  </Button>
                  <Button
                    onClick={() => handle(acceptAll)}
                    disabled={busy}
                    size="sm"
                    className="rounded-xl text-xs sm:text-sm bg-gradient-brand text-white hover:opacity-90"
                  >
                    Aceitar todos
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de preferências granulares */}
      <Dialog open={showPreferences} onOpenChange={(o) => !o && closePreferences()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-display">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Preferências de cookies
            </DialogTitle>
            <DialogDescription>
              Escolha quais categorias de cookies você autoriza. Você pode mudar essas opções a qualquer momento.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            {/* Necessários */}
            <div className="flex items-start justify-between gap-4 p-3 rounded-xl bg-muted/30">
              <div className="space-y-1">
                <p className="text-sm font-semibold">Necessários</p>
                <p className="text-xs text-muted-foreground">
                  Essenciais para login, segurança e funcionamento básico do sistema. Não podem ser desativados.
                </p>
              </div>
              <Switch checked disabled aria-label="Cookies necessários (sempre ativos)" />
            </div>

            {/* Analytics */}
            <div className="flex items-start justify-between gap-4 p-3 rounded-xl bg-muted/30">
              <div className="space-y-1">
                <p className="text-sm font-semibold">Análise de uso</p>
                <p className="text-xs text-muted-foreground">
                  Google Analytics 4 com IP anonimizado. Nos ajuda a entender como o app é usado e melhorar
                  funcionalidades.
                </p>
              </div>
              <Switch checked={analytics} onCheckedChange={setAnalytics} aria-label="Cookies de análise" />
            </div>

            {/* Marketing */}
            <div className="flex items-start justify-between gap-4 p-3 rounded-xl bg-muted/30">
              <div className="space-y-1">
                <p className="text-sm font-semibold">Marketing</p>
                <p className="text-xs text-muted-foreground">
                  Permite mensurar campanhas e personalizar conteúdo promocional. Atualmente não usamos pixel de
                  remarketing, mas reservamos a categoria.
                </p>
              </div>
              <Switch checked={marketing} onCheckedChange={setMarketing} aria-label="Cookies de marketing" />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              variant="outline"
              onClick={() => handle(rejectAll).then(closePreferences)}
              disabled={busy}
              className="rounded-xl"
            >
              Recusar opcionais
            </Button>
            <Button
              onClick={() => handle(() => saveCustom(analytics, marketing)).then(closePreferences)}
              disabled={busy}
              className="rounded-xl bg-gradient-brand text-white hover:opacity-90"
            >
              Salvar preferências
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/** Botão reutilizável para o footer ou página /minha-privacidade */
export function ManageCookiesButton({ className }: { className?: string }) {
  const { openPreferences } = useCookieConsent();
  return (
    <button
      type="button"
      onClick={openPreferences}
      className={className ?? 'text-xs text-muted-foreground hover:text-primary underline underline-offset-2'}
    >
      Gerenciar cookies
    </button>
  );
}
