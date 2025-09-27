import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PlanSelector } from '@/components/planos/PlanSelector';
import { PLAN_CONFIGS, PlanType, usePlanLimits } from '@/hooks/usePlanLimits';
import { useStripe } from '@/hooks/useStripe';
import { useToast } from '@/hooks/use-toast';
import { Crown, Zap, Gift, CheckCircle, AlertCircle, CreditCard, Check, X } from 'lucide-react';

const Planos = () => {
  const { currentPlan, planInfo, loading, reloadPlan } = usePlanLimits();
  const { createCheckout, openCustomerPortal, loading: stripeLoading } = useStripe();
  const { toast } = useToast();
  const [processingPlan, setProcessingPlan] = useState<PlanType | null>(null);

  // Verificar parâmetros da URL para mensagens de sucesso/cancelamento
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const success = urlParams.get('success');
    const canceled = urlParams.get('canceled');

    if (success === 'true') {
      toast({
        title: 'Pagamento realizado com sucesso!',
        description: 'Seu plano foi atualizado. Pode levar alguns minutos para refletir.',
      });
      // Recarregar dados do plano
      reloadPlan();
      // Limpar parâmetros da URL
      window.history.replaceState({}, '', '/planos');
    }

    if (canceled === 'true') {
      toast({
        title: 'Pagamento cancelado',
        description: 'Você pode tentar novamente a qualquer momento.',
        variant: 'destructive'
      });
      // Limpar parâmetros da URL
      window.history.replaceState({}, '', '/planos');
    }
  }, [toast, reloadPlan]);

  const handleSelectPlan = async (planType: PlanType, billing?: 'monthly' | 'yearly') => {
    if (planType === currentPlan) {
      // Se é o plano atual e não é free, abrir portal de gerenciamento
      if (planType !== 'free') {
        await openCustomerPortal();
      }
      return;
    }

    setProcessingPlan(planType);
    
    try {
      if (planType === 'free') {
        // Para downgrade, abrir portal do Stripe
        await openCustomerPortal();
      } else {
        // Para upgrade, criar checkout
        await createCheckout(planType, billing || 'monthly');
      }
    } catch (error) {
      console.error('Erro ao processar plano:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao processar alteração de plano. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setProcessingPlan(null);
    }
  };

  const getPlanIcon = (planType: PlanType) => {
    switch (planType) {
      case 'free':
        return <Gift className="h-6 w-6 text-muted-foreground" />;
      case 'professional':
        return <Zap className="h-6 w-6 text-primary" />;
      case 'enterprise':
        return <Crown className="h-6 w-6 text-yellow-500" />;
    }
  };

  const formatPrice = (price: number) => {
    return price === 0 ? 'Grátis' : `R$ ${price.toFixed(2).replace('.', ',')}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando informações do plano...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold">Escolha seu Plano</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Selecione o plano que melhor atende às suas necessidades. 
          Você pode alterar seu plano a qualquer momento.
        </p>
      </div>

      {/* Plano Atual */}
      <Card className="border-primary">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {getPlanIcon(currentPlan)}
              <div>
                <CardTitle className="text-xl">Plano Atual</CardTitle>
                <p className="text-muted-foreground">
                  Você está no plano {planInfo.name}
                </p>
              </div>
            </div>
            <Badge variant="secondary" className="px-3 py-1">
              <CheckCircle className="h-4 w-4 mr-1" />
              Ativo
            </Badge>
          </div>
        </CardHeader>
        <div className="grid gap-6 md:grid-cols-[auto_1fr] md:items-start px-6 pb-6">
          <div className="rounded-lg border bg-muted/40 p-4 text-center space-y-2">
            <span className="text-2xl font-bold block">
              {formatPrice(planInfo.price)}
              {planInfo.price > 0 && (
                <span className="text-sm font-normal text-muted-foreground ml-1">/mês</span>
              )}
            </span>
          </div>
          <div className="rounded-lg border p-4 bg-background space-y-2">
            <h4 className="font-semibold">Recursos inclusos:</h4>
            <ul className="space-y-1">
              {planInfo.features.map((feature, index) => (
                <li key={index} className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Card>

      {/* Todos os Planos */}
      <div>
        <h2 className="text-2xl font-semibold mb-6">Todos os Planos</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Object.entries(PLAN_CONFIGS).map(([planType, planInfo]) => (
            <PlanSelector
              key={planType}
              planType={planType as PlanType}
              planInfo={planInfo}
              currentPlan={currentPlan}
              onSelectPlan={handleSelectPlan}
              loading={processingPlan === planType || stripeLoading}
            />
          ))}
        </div>
      </div>

      {/* Informações Importantes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-primary" />
            Informações Importantes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>• <strong>Após o pagamento:</strong> Você será redirecionado para finalizar seu cadastro e acessar imediatamente o sistema</p>
            <p>• <strong>Usuários existentes:</strong> Serão conectados automaticamente à sua conta atual</p>
            <p>• Os limites se aplicam imediatamente após a mudança de plano</p>
            <p>• Pagamentos processados com segurança via Stripe</p>
            <p>• Suporte via email para dúvidas sobre planos</p>
            <p>• Cancelamento pode ser feito a qualquer momento</p>
            <p>• Dados são preservados ao fazer downgrade (funcionalidades podem ficar limitadas)</p>
          </div>
        </CardContent>
      </Card>

      {/* Comparação de Recursos */}
      <Card>
        <CardHeader>
          <CardTitle>Comparação Detalhada</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3">Recursos</th>
                  <th className="text-center p-3">Free</th>
                  <th className="text-center p-3">Profissional</th>
                  <th className="text-center p-3">Empresarial</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                <tr className="border-b">
                  <td className="p-3">Preço Mensal</td>
                  <td className="text-center p-3">Grátis</td>
                  <td className="text-center p-3">R$ 49,00</td>
                  <td className="text-center p-3">R$ 89,90</td>
                </tr>
                <tr className="border-b">
                  <td className="p-3">Preço Anual</td>
                  <td className="text-center p-3">-</td>
                  <td className="text-center p-3">R$ 478,80 <br/><small>(20% desconto)</small></td>
                  <td className="text-center p-3">R$ 838,80 <br/><small>(20% desconto)</small></td>
                </tr>
                <tr className="border-b">
                  <td className="p-3">Matéria-prima</td>
                  <td className="text-center p-3">30</td>
                  <td className="text-center p-3">Ilimitado</td>
                  <td className="text-center p-3">Ilimitado</td>
                </tr>
                <tr className="border-b">
                  <td className="p-3">Receitas</td>
                  <td className="text-center p-3">5</td>
                  <td className="text-center p-3">60</td>
                  <td className="text-center p-3">Ilimitado</td>
                </tr>
                <tr className="border-b">
                  <td className="p-3">Movimentação de Estoque</td>
                  <td className="text-center p-3">❌</td>
                  <td className="text-center p-3">✅</td>
                  <td className="text-center p-3">✅</td>
                </tr>
                <tr className="border-b">
                  <td className="p-3">Sistema de Vitrine</td>
                  <td className="text-center p-3">❌</td>
                  <td className="text-center p-3">✅</td>
                  <td className="text-center p-3">✅</td>
                </tr>
                <tr className="border-b">
                  <td className="p-3">Simulador de Preços</td>
                  <td className="text-center p-3">❌</td>
                  <td className="text-center p-3">✅</td>
                  <td className="text-center p-3">✅</td>
                </tr>
                <tr className="border-b">
                  <td className="p-3">Impressão PDF</td>
                  <td className="text-center p-3">❌</td>
                  <td className="text-center p-3">80/mês</td>
                  <td className="text-center p-3">Ilimitado</td>
                </tr>
                <tr>
                  <td className="p-3">Suporte</td>
                  <td className="text-center p-3">Email</td>
                  <td className="text-center p-3">Email</td>
                  <td className="text-center p-3">Prioritário</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Planos;