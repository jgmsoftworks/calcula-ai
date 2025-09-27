import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const PLAN_INFO = {
  professional_monthly: { name: 'Profissional Mensal', price: 'R$ 67/mês' },
  professional_yearly: { name: 'Profissional Anual', price: 'R$ 540/ano' },
  enterprise_monthly: { name: 'Empresarial Mensal', price: 'R$ 117/mês' },
  enterprise_yearly: { name: 'Empresarial Anual', price: 'R$ 948/ano' },
};

export default function Checkout() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  
  const planType = searchParams.get('plan');
  const billing = searchParams.get('billing');
  const affiliateCode = searchParams.get('ref');
  
  const planKey = `${planType}_${billing}` as keyof typeof PLAN_INFO;
  const planInfo = PLAN_INFO[planKey];

  useEffect(() => {
    // Validar parâmetros necessários
    if (!planType || !billing || !planInfo) {
      navigate('/planos');
      return;
    }
  }, [planType, billing, planInfo, navigate]);

  const handleCheckout = async () => {
    if (!planType || !billing) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('affiliate-checkout', {
        body: { 
          planType, 
          billing, 
          affiliateCode,
          direct: true // Flag para indicar checkout direto
        }
      });
      
      if (error) {
        console.error('Erro no checkout:', error);
        throw error;
      }
      
      if (data?.url) {
        // Redirecionar para o Stripe Checkout
        window.location.href = data.url;
      } else {
        throw new Error('URL de checkout não recebida');
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

  if (!planInfo) {
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
            <h3 className="text-lg font-semibold">{planInfo.name}</h3>
            <p className="text-2xl font-bold text-primary">{planInfo.price}</p>
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
            
            <Button 
              variant="outline" 
              onClick={() => navigate('/planos')} 
              className="w-full"
            >
              Ver Todos os Planos
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