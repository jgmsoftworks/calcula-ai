import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { PLAN_CONFIGS, PlanType, usePlanLimits } from '@/hooks/usePlanLimits';
import { useStripe } from '@/hooks/useStripe';
import { useToast } from '@/hooks/use-toast';
import { Crown, Zap, Gift, Check, X, CreditCard, Shield, Sparkles } from 'lucide-react';

const planGradients: Record<PlanType, string> = {
  free: 'from-[#0483e4] to-[#2c4dc7]',
  professional: 'from-[#7328b1] to-[#af1188]',
  enterprise: 'from-[#dd0b52] to-[#f96e0c]',
};

const planAccentColors: Record<PlanType, string> = {
  free: 'text-[#0483e4]',
  professional: 'text-[#7328b1]',
  enterprise: 'text-[#dd0b52]',
};

const planBgAccent: Record<PlanType, string> = {
  free: 'bg-[#0483e4]/10',
  professional: 'bg-[#7328b1]/10',
  enterprise: 'bg-[#dd0b52]/10',
};

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
      case 'free': return <Gift className="h-7 w-7" />;
      case 'professional': return <Zap className="h-7 w-7" />;
      case 'enterprise': return <Crown className="h-7 w-7" />;
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

  const comparisonRows = [
    { label: 'Matéria-prima', free: '30', professional: 'Ilimitado', enterprise: 'Ilimitado' },
    { label: 'Receitas', free: '5', professional: '60', enterprise: 'Ilimitado' },
    { label: 'Blocos de Markup', free: '1', professional: '3', enterprise: 'Ilimitado' },
    { label: 'Movimentação de Estoque', free: true, professional: true, enterprise: true },
    { label: 'Impressão PDF', free: false, professional: '80/mês', enterprise: 'Ilimitado' },
    { label: 'Simulador de Preços', free: false, professional: true, enterprise: true },
    { label: 'Suporte Prioritário', free: false, professional: false, enterprise: true },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando informações do plano...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="text-center space-y-3 animate-fade-in">
        <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5">
          <Sparkles className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-3xl font-bold font-display text-foreground">
          Escolha seu Plano
        </h1>
        <p className="text-muted-foreground max-w-xl mx-auto">
          Selecione o plano ideal para o seu negócio e comece a precificar com inteligência
        </p>
      </div>

      {/* Toggle Mensal/Anual */}
      <div className="flex items-center justify-center gap-4 animate-slide-up">
        <div className="glass-card px-6 py-3 flex items-center gap-4">
          <Label className={`text-sm font-medium transition-colors ${!isYearly ? 'text-foreground' : 'text-muted-foreground'}`}>
            Mensal
          </Label>
          <Switch
            checked={isYearly}
            onCheckedChange={setIsYearly}
            className="data-[state=checked]:bg-primary"
          />
          <Label className={`text-sm font-medium transition-colors ${isYearly ? 'text-foreground' : 'text-muted-foreground'}`}>
            Anual
          </Label>
          {isYearly && (
            <Badge className="bg-green-500/10 text-green-600 border-green-500/20 text-xs">
              -20%
            </Badge>
          )}
        </div>
      </div>

      {/* Plan Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {(Object.keys(PLAN_CONFIGS) as PlanType[]).map((planType, idx) => {
          const config = PLAN_CONFIGS[planType];
          const isCurrentPlan = currentPlan === planType;
          const isProfessional = planType === 'professional';
          const price = getPrice(planType);
          const savings = getSavings(planType);

          return (
            <div
              key={planType}
              className={`
                glass-card relative overflow-hidden transition-all duration-300 hover:-translate-y-1
                animate-slide-up
                ${isCurrentPlan ? 'ring-2 ring-primary shadow-brand' : 'hover:shadow-xl'}
                ${isProfessional ? 'md:scale-[1.03] z-10' : ''}
              `}
              style={{ animationDelay: `${idx * 100}ms` }}
            >
              {/* Gradient top bar */}
              <div className={`h-1.5 bg-gradient-to-r ${planGradients[planType]}`} />

              {/* Popular badge */}
              {isProfessional && (
                <div className="absolute top-4 right-4">
                  <Badge className="bg-gradient-to-r from-[#7328b1] to-[#af1188] text-white border-0 text-[10px] uppercase tracking-wider font-bold">
                    ⭐ Popular
                  </Badge>
                </div>
              )}

              <div className="p-6 space-y-6">
                {/* Icon + Name */}
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl bg-gradient-to-br ${planGradients[planType]} text-white shadow-lg`}>
                    {getPlanIcon(planType)}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold font-display text-foreground">{config.name}</h3>
                    {isCurrentPlan && (
                      <span className="text-[10px] uppercase tracking-wider font-bold text-primary">Plano atual</span>
                    )}
                  </div>
                </div>

                {/* Price */}
                <div className="space-y-1">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold font-display text-foreground">{price.main}</span>
                    <span className="text-sm text-muted-foreground">{price.sub}</span>
                  </div>
                  {savings && (
                    <Badge className="bg-green-500/10 text-green-600 border-green-500/20 text-xs">
                      Economize {savings}%
                    </Badge>
                  )}
                </div>

                {/* Features */}
                <ul className="space-y-2.5">
                  {config.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2.5">
                      <div className={`rounded-full p-0.5 ${planBgAccent[planType]} flex-shrink-0 mt-0.5`}>
                        <Check className={`h-3.5 w-3.5 ${planAccentColors[planType]}`} />
                      </div>
                      <span className="text-sm text-foreground/80">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA Button */}
                <Button
                  className={`w-full h-11 text-sm font-semibold transition-all ${
                    isProfessional && !isCurrentPlan
                      ? 'bg-gradient-to-r from-[#7328b1] to-[#af1188] hover:from-[#7328b1]/90 hover:to-[#af1188]/90 text-white shadow-lg hover:shadow-xl border-0'
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
              </div>
            </div>
          );
        })}
      </div>

      {/* Comparison Table */}
      <div className="glass-card overflow-hidden animate-slide-up" style={{ animationDelay: '300ms' }}>
        <div className="h-1 bg-gradient-to-r from-[#0483e4] via-[#7328b1] to-[#f96e0c]" />
        <div className="p-5 border-b border-border/30">
          <h2 className="text-lg font-bold font-display text-foreground">Comparação Detalhada</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/30 bg-muted/20">
                <th className="text-left p-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Recurso</th>
                <th className="text-center p-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Free</th>
                <th className="text-center p-4 text-xs font-semibold uppercase tracking-wider text-[#7328b1] bg-[#7328b1]/5">Profissional</th>
                <th className="text-center p-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Empresarial</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {comparisonRows.map((row, i) => (
                <tr key={i} className="border-b border-border/20 hover:bg-muted/10 transition-colors">
                  <td className="p-4 font-medium text-foreground">{row.label}</td>
                  {(['free', 'professional', 'enterprise'] as const).map(plan => {
                    const val = row[plan];
                    const isPro = plan === 'professional';
                    return (
                      <td key={plan} className={`text-center p-4 ${isPro ? 'bg-[#7328b1]/5' : ''}`}>
                        {val === true ? (
                          <Check className="h-4.5 w-4.5 text-green-500 mx-auto" />
                        ) : val === false ? (
                          <X className="h-4.5 w-4.5 text-muted-foreground/40 mx-auto" />
                        ) : (
                          <span className={`font-semibold ${isPro ? 'text-[#7328b1]' : 'text-foreground'}`}>{val}</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground pb-6 animate-fade-in">
        <div className="flex items-center gap-1.5">
          <Shield className="h-3.5 w-3.5" />
          Pagamento seguro via Stripe
        </div>
        <span className="text-border">•</span>
        <span>Cancele quando quiser</span>
        <span className="text-border">•</span>
        <span>Dados preservados</span>
      </div>
    </div>
  );
};

export default Planos;
