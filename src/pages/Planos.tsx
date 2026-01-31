import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { PLAN_CONFIGS, PlanType, usePlanLimits } from '@/hooks/usePlanLimits';
import { useStripe } from '@/hooks/useStripe';
import { useToast } from '@/hooks/use-toast';
import { Crown, Zap, Gift, Check, X, Sparkles, CreditCard } from 'lucide-react';

const Planos = () => {
  const { currentPlan, planInfo, loading, reloadPlan } = usePlanLimits();
  const { createCheckout, openCustomerPortal, loading: stripeLoading } = useStripe();
  const { toast } = useToast();
  const [processingPlan, setProcessingPlan] = useState<PlanType | null>(null);
  const [isYearly, setIsYearly] = useState(false);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const success = urlParams.get('success');
    const canceled = urlParams.get('canceled');

    if (success === 'true') {
      toast({
        title: 'Pagamento realizado com sucesso!',
        description: 'Seu plano foi atualizado. Pode levar alguns minutos para refletir.',
      });
      reloadPlan();
      window.history.replaceState({}, '', '/planos');
    }

    if (canceled === 'true') {
      toast({
        title: 'Pagamento cancelado',
        description: 'Você pode tentar novamente a qualquer momento.',
        variant: 'destructive'
      });
      window.history.replaceState({}, '', '/planos');
    }
  }, [toast, reloadPlan]);

  const handleSelectPlan = async (planType: PlanType) => {
    if (planType === currentPlan) {
      if (planType !== 'free') {
        await openCustomerPortal();
      }
      return;
    }

    setProcessingPlan(planType);
    
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const affiliateCode = urlParams.get('ref');
      
      if (planType === 'free') {
        await openCustomerPortal();
      } else {
        await createCheckout(planType, isYearly ? 'yearly' : 'monthly', affiliateCode || undefined);
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
        return <Gift className="h-8 w-8" />;
      case 'professional':
        return <Zap className="h-8 w-8" />;
      case 'enterprise':
        return <Crown className="h-8 w-8" />;
    }
  };

  const getPlanGradient = (planType: PlanType) => {
    switch (planType) {
      case 'free':
        return 'from-slate-500 to-slate-600';
      case 'professional':
        return 'from-primary to-primary/80';
      case 'enterprise':
        return 'from-yellow-500 to-amber-600';
    }
  };

  const getPrice = (planType: PlanType) => {
    const config = PLAN_CONFIGS[planType];
    if (planType === 'free') return { main: 'Grátis', sub: 'para sempre' };
    
    const price = isYearly ? config.yearlyPrice : config.price;
    const monthly = isYearly ? (config.yearlyPrice / 12).toFixed(2).replace('.', ',') : null;
    
    return {
      main: `R$ ${price.toFixed(2).replace('.', ',')}`,
      sub: isYearly ? `/ano (R$ ${monthly}/mês)` : '/mês'
    };
  };

  const getSavings = (planType: PlanType) => {
    if (planType === 'free' || !isYearly) return null;
    const config = PLAN_CONFIGS[planType];
    const yearlyTotal = config.price * 12;
    const savings = yearlyTotal - config.yearlyPrice;
    return Math.round((savings / yearlyTotal) * 100);
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
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header com Gradiente */}
      <div className="text-center space-y-4 py-8">
        <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 mb-4">
          <Sparkles className="h-10 w-10 text-primary" />
        </div>
        <h1 className="text-4xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
          Escolha seu Plano
        </h1>
        <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
          Selecione o plano ideal para o seu negócio e comece a precificar com inteligência
        </p>
      </div>

      {/* Toggle Mensal/Anual */}
      <div className="flex items-center justify-center gap-4 p-4 rounded-2xl bg-muted/50 w-fit mx-auto">
        <Label htmlFor="billing-toggle" className={`text-base font-medium transition-colors ${!isYearly ? 'text-foreground' : 'text-muted-foreground'}`}>
          Mensal
        </Label>
        <Switch
          id="billing-toggle"
          checked={isYearly}
          onCheckedChange={setIsYearly}
          className="data-[state=checked]:bg-primary"
        />
        <Label htmlFor="billing-toggle" className={`text-base font-medium transition-colors ${isYearly ? 'text-foreground' : 'text-muted-foreground'}`}>
          Anual
        </Label>
        {isYearly && (
          <Badge className="bg-green-500/10 text-green-600 border-green-500/20 hover:bg-green-500/20">
            Economize 20%
          </Badge>
        )}
      </div>

      {/* Cards dos Planos */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {(Object.keys(PLAN_CONFIGS) as PlanType[]).map((planType) => {
          const config = PLAN_CONFIGS[planType];
          const isCurrentPlan = currentPlan === planType;
          const isProfessional = planType === 'professional';
          const price = getPrice(planType);
          const savings = getSavings(planType);

          return (
            <Card 
              key={planType}
              className={`relative overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${
                isCurrentPlan ? 'ring-2 ring-primary shadow-lg' : ''
              } ${isProfessional ? 'md:scale-105 z-10' : ''}`}
            >
              {/* Badge Popular */}
              {isProfessional && (
                <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground text-center py-1.5 text-sm font-semibold">
                  ⭐ Mais Popular
                </div>
              )}

              {/* Badge Economia */}
              {savings && (
                <Badge className="absolute top-3 right-3 bg-green-500 text-white border-0">
                  -{savings}%
                </Badge>
              )}

              <CardHeader className={`text-center ${isProfessional ? 'pt-12' : 'pt-6'} pb-4`}>
                <div className={`inline-flex items-center justify-center p-4 rounded-2xl bg-gradient-to-br ${getPlanGradient(planType)} text-white mx-auto mb-4 shadow-lg`}>
                  {getPlanIcon(planType)}
                </div>
                <CardTitle className="text-2xl">{config.name}</CardTitle>
                
                <div className="mt-4">
                  <span className="text-4xl font-bold">{price.main}</span>
                  <span className="text-muted-foreground ml-1">{price.sub}</span>
                </div>
              </CardHeader>

              <CardContent className="space-y-6">
                <ul className="space-y-3">
                  {config.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <div className="rounded-full p-1 bg-green-500/10 flex-shrink-0 mt-0.5">
                        <Check className="h-3.5 w-3.5 text-green-600" />
                      </div>
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  className={`w-full h-12 text-base font-semibold transition-all ${
                    isProfessional && !isCurrentPlan
                      ? 'bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg hover:shadow-xl'
                      : ''
                  }`}
                  variant={isCurrentPlan ? 'secondary' : 'default'}
                  onClick={() => handleSelectPlan(planType)}
                  disabled={processingPlan === planType || stripeLoading}
                >
                  {processingPlan === planType ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent" />
                      Processando...
                    </div>
                  ) : isCurrentPlan && planType !== 'free' ? (
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4" />
                      Gerenciar Assinatura
                    </div>
                  ) : isCurrentPlan ? (
                    'Plano Atual'
                  ) : (
                    `Escolher ${config.name}`
                  )}
                </Button>

                {isCurrentPlan && (
                  <div className="flex justify-center">
                    <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                      ✓ Seu plano atual
                    </Badge>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Tabela de Comparação */}
      <Card className="overflow-hidden">
        <CardHeader className="bg-muted/30">
          <CardTitle className="text-xl">Comparação Detalhada</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/20">
                  <th className="text-left p-4 font-semibold">Recursos</th>
                  <th className="text-center p-4 font-semibold">Free</th>
                  <th className="text-center p-4 font-semibold bg-primary/5">Profissional</th>
                  <th className="text-center p-4 font-semibold">Empresarial</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                <tr className="border-b hover:bg-muted/10 transition-colors">
                  <td className="p-4 font-medium">Matéria-prima</td>
                  <td className="text-center p-4">30</td>
                  <td className="text-center p-4 bg-primary/5 font-semibold">Ilimitado</td>
                  <td className="text-center p-4 font-semibold">Ilimitado</td>
                </tr>
                <tr className="border-b hover:bg-muted/10 transition-colors">
                  <td className="p-4 font-medium">Receitas</td>
                  <td className="text-center p-4">5</td>
                  <td className="text-center p-4 bg-primary/5">60</td>
                  <td className="text-center p-4 font-semibold">Ilimitado</td>
                </tr>
                <tr className="border-b hover:bg-muted/10 transition-colors">
                  <td className="p-4 font-medium">Movimentação de Estoque</td>
                  <td className="text-center p-4">
                    <X className="h-5 w-5 text-red-500 mx-auto" />
                  </td>
                  <td className="text-center p-4 bg-primary/5">
                    <Check className="h-5 w-5 text-green-500 mx-auto" />
                  </td>
                  <td className="text-center p-4">
                    <Check className="h-5 w-5 text-green-500 mx-auto" />
                  </td>
                </tr>
                <tr className="border-b hover:bg-muted/10 transition-colors">
                  <td className="p-4 font-medium">Impressão PDF</td>
                  <td className="text-center p-4">
                    <X className="h-5 w-5 text-red-500 mx-auto" />
                  </td>
                  <td className="text-center p-4 bg-primary/5">80/mês</td>
                  <td className="text-center p-4 font-semibold">Ilimitado</td>
                </tr>
                <tr className="hover:bg-muted/10 transition-colors">
                  <td className="p-4 font-medium">Suporte</td>
                  <td className="text-center p-4">Email</td>
                  <td className="text-center p-4 bg-primary/5">Email</td>
                  <td className="text-center p-4 font-semibold text-yellow-600">Prioritário</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Informações de Segurança */}
      <div className="text-center text-sm text-muted-foreground space-y-2 pb-8">
        <p>🔒 Pagamentos processados com segurança via Stripe</p>
        <p>💳 Cancele a qualquer momento • Seus dados são preservados</p>
      </div>
    </div>
  );
};

export default Planos;
