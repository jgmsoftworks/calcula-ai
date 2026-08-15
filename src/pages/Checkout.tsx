import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { usePlanos, formatPreco } from '@/hooks/usePlanos';

export default function Checkout() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const { getPlano, loading: planosLoading } = usePlanos();

  const planType = searchParams.get('plan');
  const affiliateCode = searchParams.get('ref');
  const plano = planType ? getPlano(planType) : undefined;

  useEffect(() => {
    if (planosLoading) return;
    if (!planType || !plano) {
      navigate('/planos');
    }
  }, [planType, plano, planosLoading, navigate]);

  const handleCheckout = async () => {
    if (!plano) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('affiliate-checkout', {
        body: {
          planType: plano.slug,
          billing: 'monthly',
          affiliateCode,
          direct: true
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

  if (planosLoading || !plano) {
    return null;
  }

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
              {formatPreco(plano.preco_centavos)}
              {plano.preco_centavos > 0 && <span className="text-base font-normal">/mês</span>}
            </p>
          </div>

          {affiliateCode && (
            <div className="text-center text-sm text-muted-foreground">
              <p>Link de afiliado: <code className="bg-muted px-2 py-1 rounded">{affiliateCode}</code></p>
            </div>
          )}

          <div className="space-y-3">
            <Button
              onClick={handleCheckout}
              disabled={loading}
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
