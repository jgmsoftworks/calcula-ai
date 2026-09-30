import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Clock3, Mail, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { trackVerifiedPurchase } from '@/lib/funnel-analytics';
interface PaymentStatus {
  status: 'pending' | 'approved' | 'trial' | 'failed';
  access_ready: boolean; email_sent: boolean; email_hint: string; needs_password_setup: boolean;
}
export default function AuthSuccess() {
  const [params] = useSearchParams();
  const sessionId = params.get('session_id');
  const [result, setResult] = useState<PaymentStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const check = useCallback(async () => {
    if (!sessionId) { setError('Este link não contém a confirmação da compra. Confira o e-mail usado no pagamento.'); return; }
    setLoading(true); setError('');
    try {
      const { data, error: requestError } = await supabase.functions.invoke('process-stripe-payment', { body: { session_id: sessionId } });
      if (requestError || data?.error || !data?.status) throw new Error('Não foi possível verificar o pagamento agora. Tente novamente em instantes.');
      setResult(data);
      if (data.status === 'approved') trackVerifiedPurchase(sessionId);
    } catch (err) { setError(err instanceof Error ? err.message : 'Não foi possível verificar agora.'); }
    finally { setLoading(false); }
  }, [sessionId]);
  useEffect(() => { void check(); }, [check]);
  const approved = result?.status === 'approved' || result?.status === 'trial';
  const title = result?.status === 'trial' ? 'Seu período de teste começou!' : approved ? 'Pagamento aprovado!' : result?.status === 'failed' ? 'Pagamento não confirmado' : 'Aguardando aprovação do pagamento';
  return <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/30 to-background p-4">
    <Card className="w-full max-w-lg shadow-xl"><CardContent className="p-8 space-y-6 text-center" aria-live="polite">
      <p className="font-bold text-xl text-primary">Calcula Aí</p>
      {loading && !result ? <><LoadingSpinner className="h-9 w-9 mx-auto" /><h1 className="text-xl font-semibold">Conferindo sua compra…</h1></> : <>
        {error ? <AlertCircle className="h-12 w-12 mx-auto text-amber-500" /> : approved ? <CheckCircle2 className="h-12 w-12 mx-auto text-green-600" /> : <Clock3 className="h-12 w-12 mx-auto text-primary" />}
        <h1 className="text-2xl font-bold">{error ? 'Vamos conferir sua compra' : title}</h1>
        {error ? <p>{error}</p> : <>
          {approved ? <p className="text-muted-foreground">{result.access_ready ? 'Seu plano está vinculado à conta do e-mail usado na compra.' : 'Estamos preparando sua conta. Isso pode levar alguns instantes.'}</p> : <p className="text-muted-foreground">{result?.status === 'failed' ? 'Confira a forma de pagamento. Se você já foi cobrado, fale com nosso suporte.' : 'Assim que a aprovação chegar, vamos preparar seu acesso e avisar por e-mail. Você pode fechar esta página.'}</p>}
          {result?.email_sent && <div className="rounded-xl bg-muted p-4 space-y-2"><Mail className="h-6 w-6 mx-auto" /><p>Enviamos as orientações para <strong>{result.email_hint}</strong>.</p><p className="text-sm text-muted-foreground">Confira também o spam e a aba de promoções.</p></div>}
          {approved && result?.needs_password_setup && <p>Abra o link recebido por e-mail para definir sua senha pessoal.</p>}
          {approved && !result?.email_sent && <p className="text-sm text-muted-foreground">O e-mail de acesso ainda está sendo preparado. Se demorar, fale com o suporte.</p>}
        </>}
        <div className="space-y-3">
          {approved && result?.access_ready && <Button className="w-full" asChild><Link to="/auth?mode=login">Entrar no Calcula Aí</Link></Button>}
          {sessionId && <Button variant="outline" className="w-full" disabled={loading} onClick={() => void check()}>{loading ? 'Verificando…' : 'Verificar novamente'}</Button>}
        </div>
      </>}
      <p className="text-sm text-muted-foreground">Se você já pagou, não é necessário comprar novamente.</p>
      <a href="mailto:calculaai.adm@gmail.com" className="inline-block text-sm underline">Preciso de ajuda com meu acesso</a>
    </CardContent></Card>
  </main>;
}
