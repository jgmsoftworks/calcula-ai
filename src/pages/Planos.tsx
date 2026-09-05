import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PlanType, usePlanLimits } from '@/hooks/usePlanLimits';
import { usePlanos, formatPreco, Plano } from '@/hooks/usePlanos';
import { useStripe } from '@/hooks/useStripe';
import { useToast } from '@/hooks/use-toast';
import { Crown, Zap, Gift, Check, X, CreditCard, Shield, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const planGradients: Record<PlanType, string> = {
  lite: 'from-[#0483e4] to-[#2c4dc7]',
  professional: 'from-[#7328b1] to-[#af1188]',
  enterprise: 'from-[#dd0b52] to-[#f96e0c]',
};

const planAccentColors: Record<PlanType, string> = {
  lite: 'text-[#0483e4]',
  professional: 'text-[#7328b1]',
  enterprise: 'text-[#dd0b52]',
};

const planBgAccent: Record<PlanType, string> = {
  lite: 'bg-[#0483e4]/10',
  professional: 'bg-[#7328b1]/10',
  enterprise: 'bg-[#dd0b52]/10',
};

const Planos = () => {
  const { t } = useTranslation();
  const { currentPlan, loading, reloadPlan } = usePlanLimits();
  const { planos, loading: planosLoading } = usePlanos();
  const { createCheckout, openCustomerPortal, loading: stripeLoading } = useStripe();
  const { toast } = useToast();
  const [processingPlan, setProcessingPlan] = useState<string | null>(null);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const success = urlParams.get('success');
    const canceled = urlParams.get('canceled');

    if (success === 'true') {
      toast({
        title: t('plans.paymentSuccess'),
        description: t('plans.paymentSuccessDesc'),
      });
      reloadPlan();
      window.history.replaceState({}, '', '/planos');
    }

    if (canceled === 'true') {
      toast({
        title: t('plans.paymentCanceled'),
        description: t('plans.paymentCanceledDesc'),
        variant: 'destructive'
      });
      window.history.replaceState({}, '', '/planos');
    }
  }, [toast, reloadPlan, t]);

  const handleSelectPlan = async (plano: Plano) => {
    if (plano.slug === currentPlan) {
      await openCustomerPortal();
      return;
    }

    setProcessingPlan(plano.slug);

    try {
      const urlParams = new URLSearchParams(window.location.search);
      const affiliateCode = urlParams.get('ref');

      if (plano.preco_centavos === 0) {
        await openCustomerPortal();
      } else {
        await createCheckout(plano.slug, 'monthly', affiliateCode || undefined);
      }
    } catch (error) {
      console.error('Erro ao processar plano:', error);
      toast({
        title: t('plans.error'),
        description: t('plans.planChangeError'),
        variant: 'destructive',
      });
    } finally {
      setProcessingPlan(null);
    }
  };

  const getPlanIcon = (planType: PlanType) => {
    switch (planType) {
      case 'lite': return <Gift className="h-7 w-7" />;
      case 'professional': return <Zap className="h-7 w-7" />;
      case 'enterprise': return <Crown className="h-7 w-7" />;
      default: return <Sparkles className="h-7 w-7" />;
    }
  };

  const limiteLabel = (valor: number | undefined) => {
    if (valor === undefined || valor === null) return '—';
    if (valor === -1) return t('plans.unlimited');
    if (valor === 0) return false;
    return String(valor);
  };

  const comparisonRows = [
    { label: t('plans.rawMaterials'), key: 'produtos' as const },
    { label: t('plans.recipes'), key: 'receitas' as const },
    { label: t('plans.markupBlocks'), key: 'markups' as const },
    { label: t('plans.stockMovement'), key: 'movimentacoes' as const },
    { label: t('plans.techSheetPrint'), key: 'pdf_exports' as const },
  ];

  if (loading || planosLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">{t('plans.loadingPlan')}</p>
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
        <h1 className="font-display text-2xl font-bold text-foreground sm:text-3xl">
          {t('plans.chooseYourPlan')}
        </h1>
        <p className="text-muted-foreground max-w-xl mx-auto">
          {t('plans.choosePlanDesc')}
        </p>
      </div>

      {/* Plan Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {planos.map((plano, idx) => {
          const planType = plano.slug as PlanType;
          const isCurrentPlan = currentPlan === planType;
          const isProfessional = planType === 'professional';

          return (
            <div
              key={plano.id}
              className={`
                glass-card relative overflow-hidden transition-all duration-300 hover:-translate-y-1
                animate-slide-up
                ${isCurrentPlan ? 'ring-2 ring-primary shadow-brand' : 'hover:shadow-xl'}
                ${isProfessional ? 'md:scale-[1.03] z-10' : ''}
              `}
              style={{ animationDelay: `${idx * 100}ms` }}
            >
              <div className={`h-1.5 bg-gradient-to-r ${planGradients[planType]}`} />

              {isProfessional && (
                <div className="absolute top-4 right-4">
                  <Badge className="bg-gradient-to-r from-[#7328b1] to-[#af1188] text-white border-0 text-[10px] uppercase tracking-wider font-bold">
                    {t('plans.popular')}
                  </Badge>
                </div>
              )}

              <div className="space-y-5 p-5 sm:space-y-6 sm:p-6">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl bg-gradient-to-br ${planGradients[planType]} text-white shadow-lg`}>
                    {getPlanIcon(planType)}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold font-display text-foreground">{plano.nome_publico}</h3>
                    {isCurrentPlan && (
                      <span className="text-[10px] uppercase tracking-wider font-bold text-primary">{t('plans.currentPlan')}</span>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold font-display text-foreground">
                      {formatPreco(plano.preco_centavos)}
                    </span>
                    {plano.preco_centavos > 0 && (
                      <span className="text-sm text-muted-foreground">{t('plans.perMonth')}</span>
                    )}
                  </div>
                  {plano.descricao && (
                    <p className="text-xs text-muted-foreground">{plano.descricao}</p>
                  )}
                </div>

                <ul className="space-y-2.5">
                  {plano.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2.5">
                      <div className={`rounded-full p-0.5 ${planBgAccent[planType]} flex-shrink-0 mt-0.5`}>
                        <Check className={`h-3.5 w-3.5 ${planAccentColors[planType]}`} />
                      </div>
                      <span className="text-sm text-foreground/80">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  className={`w-full h-11 text-sm font-semibold transition-all ${
                    isProfessional && !isCurrentPlan
                      ? 'bg-gradient-to-r from-[#7328b1] to-[#af1188] hover:from-[#7328b1]/90 hover:to-[#af1188]/90 text-white shadow-lg hover:shadow-xl border-0'
                      : ''
                  }`}
                  variant={isCurrentPlan ? 'secondary' : 'default'}
                  onClick={() => handleSelectPlan(plano)}
                  disabled={processingPlan === plano.slug || stripeLoading}
                >
                  {processingPlan === plano.slug ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent" />
                      {t('plans.processing')}
                    </div>
                  ) : isCurrentPlan ? (
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4" />
                      {t('plans.manageSubscription')}
                    </div>
                  ) : (
                    t('plans.choosePlan', { name: plano.nome_publico })
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
          <h2 className="text-lg font-bold font-display text-foreground">{t('plans.detailedComparison')}</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px]">
            <thead>
              <tr className="border-b border-border/30 bg-muted/20">
                <th className="text-left p-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('plans.feature')}</th>
                {planos.map(p => (
                  <th
                    key={p.id}
                    className={`text-center p-4 text-xs font-semibold uppercase tracking-wider ${
                      p.slug === 'professional' ? 'text-[#7328b1] bg-[#7328b1]/5' : 'text-muted-foreground'
                    }`}
                  >
                    {p.nome_publico}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="text-sm">
              {comparisonRows.map((row, i) => (
                <tr key={i} className="border-b border-border/20 hover:bg-muted/10 transition-colors">
                  <td className="p-4 font-medium text-foreground">{row.label}</td>
                  {planos.map(p => {
                    const val = limiteLabel(p.limites?.[row.key]);
                    const isPro = p.slug === 'professional';
                    return (
                      <td key={p.id} className={`text-center p-4 ${isPro ? 'bg-[#7328b1]/5' : ''}`}>
                        {val === false ? (
                          <X className="h-4 w-4 text-muted-foreground/40 mx-auto" />
                        ) : val === t('plans.unlimited') ? (
                          <span className={`font-semibold ${isPro ? 'text-[#7328b1]' : 'text-foreground'}`}>{val}</span>
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
      <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 pb-6 text-center text-xs text-muted-foreground animate-fade-in sm:gap-6">
        <div className="flex items-center gap-1.5">
          <Shield className="h-3.5 w-3.5" />
          {t('plans.securePayment')}
        </div>
        <span className="text-border">•</span>
        <span>{t('plans.cancelAnytime')}</span>
        <span className="text-border">•</span>
        <span>{t('plans.dataPreserved')}</span>
      </div>
    </div>
  );
};

export default Planos;
