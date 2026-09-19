import { useAuth } from '@/hooks/useAuth';
import { trackFunnel } from '@/lib/funnel-analytics';
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { usePlanos, formatPreco, precoDoPlano, Billing } from '@/hooks/usePlanos';

export default function Checkout() {
  const { user, loading: authLoading } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const { getPlano, loading: planosLoading, error: planosError } = usePlanos();

  const planType = searchParams.get('plan');
  const affiliateCode = searchParams.get('ref');
  const billing: Billing = searchParams.get('billing') === 'yearly' ? 'yearly' : 'monthly';
  const plano = planType ? getPlano(planType) : undefined;


  useEffect(() => {
    if (planosLoading || planosError) return;
    if (!planType || !plano) {
      navigate('/planos');
    }
  }, [planType, plano, planosLoading, planosError, navigate]);

  const handleCheckout = async () => {
    if (!plano) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke(user && !affiliateCode ? 'create-checkout' : 'affiliate-checkout', {
        body: {
          planType: plano.slug,
          billing,
          affiliateCode,
          direct: !user
        }

      });

      if (error) {
        console.error('Erro no checkout:', error);
        toast({
          title: 'Erro no Checkout',
          description: error.message || 'Erro ao processar pagamento. Tente novamente.',
          variant: 'destructive'
        });
        return;
      }

      if (data?.url) {
        trackFunnel('checkout_started', { plan: plano.slug, billing });
        window.location.href = data.url;
      } else {
        toast({
          title: 'Erro no Checkout',
          description: 'URL de checkout não recebida',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Erro ao processar checkout:', error);
      toast({
        title: 'Erro no Checkout',
        description: 'Erro ao processar pagamento. Tente novamente.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  if (planosError) return <div className="p-8 text-center" role="alert">Não foi possível carregar os planos. Atualize a página para tentar novamente.</div>;
  if (planosLoading || authLoading || !plano) {
    return null;
  }

  const available = Boolean(affiliateCode) || (precoDoPlano(plano, billing) > 0 && Boolean(billing === 'yearly' ? plano.stripe_price_id_anual : plano.stripe_price_id));
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>Finalizar Assinatura</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center space-y-2">
            <h3 className="text-lg font-semibold">{plano.nome_publico}</h3>
            <p className="text-2xl font-bold text-primary">
              {available ? formatPreco(precoDoPlano(plano, billing)) : 'Contratação indisponível'}
              {available && precoDoPlano(plano, billing) > 0 && (
                <span className="text-base font-normal">{billing === 'yearly' ? '/ano' : '/mês'}</span>
              )}
            </p>

          </div>

          {billing === 'yearly' && <p className="text-sm text-muted-foreground">12 meses de acesso + 1 Análise do Negócio durante a vigência anual, mediante agendamento e disponibilidade da equipe.</p>}
          {affiliateCode && (
            <div className="text-center text-sm text-muted-foreground">
              <p>Link de afiliado: <code className="bg-muted px-2 py-1 rounded">{affiliateCode}</code></p>
            </div>
          )}

          <div className="space-y-3">
            <Button
              onClick={handleCheckout}
              disabled={loading || !available}
              className="w-full"
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processando...
                </>
              ) : (
                'Assinar Agora'
              )}
            </Button>
          </div>

          <div className="text-center text-xs text-muted-foreground">
            <p>Pagamento seguro processado pelo Stripe</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

