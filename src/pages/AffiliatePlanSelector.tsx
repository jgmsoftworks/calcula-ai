import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { PLAN_CONFIGS, PlanType } from '@/hooks/usePlanLimits';
import { Crown, Zap, Gift, Check, X, Loader2, Shield, Sparkles, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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

// Preços promocionais do afiliado (mantidos)
const AFFILIATE_PRICES: Record<Exclude<PlanType, 'free'>, { monthly: number; yearly: number }> = {
  professional: { monthly: 49.90, yearly: 478.80 },
  enterprise: { monthly: 89.90, yearly: 838.80 },
};

const AffiliatePlanSelector = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const [isYearly, setIsYearly] = useState(false);
  const [loading, setLoading] = useState<PlanType | null>(null);
  const [affiliateData, setAffiliateData] = useState<any>(null);

  useEffect(() => {
    if (code) {
      loadAffiliateData();
      const expires = new Date();
      expires.setDate(expires.getDate() + 60);
      document.cookie = `aff_code=${code}; expires=${expires.toUTCString()}; path=/; SameSite=Lax; Secure`;
    }
  }, [code]);

  const loadAffiliateData = async () => {
    try {
      const { data: link } = await supabase
        .from('affiliate_links')
        .select(`*, affiliate:affiliates(name, email)`)
        .eq('link_code', code)
        .eq('is_active', true)
        .single();

      if (link) {
        setAffiliateData(link.affiliate);
        await supabase
          .from('affiliate_links')
          .update({ clicks_count: (link.clicks_count || 0) + 1 })
          .eq('id', link.id);
      }
    } catch (error) {
      console.error('Erro ao carregar dados do afiliado:', error);
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
    if (planType === 'free') return { main: 'Grátis', sub: 'para sempre' };

    const prices = AFFILIATE_PRICES[planType];
    const price = isYearly ? prices.yearly : prices.monthly;
    const monthly = isYearly ? (prices.yearly / 12).toFixed(2).replace('.', ',') : null;

    return {
      main: `R$ ${price.toFixed(2).replace('.', ',')}`,
      sub: isYearly ? `≈ R$ ${monthly}/mês` : '/mês',
    };
  };

  const getSavings = (planType: PlanType) => {
    if (planType === 'free' || !isYearly) return null;
    const prices = AFFILIATE_PRICES[planType];
    const yearlyTotal = prices.monthly * 12;
    const savings = yearlyTotal - prices.yearly;
    return Math.round((savings / yearlyTotal) * 100);
  };

  const handleSelectPlan = async (planType: PlanType) => {
    if (planType === 'free') {
      navigate('/auth');
      return;
    }

    setLoading(planType);
    try {
      const { data, error } = await supabase.functions.invoke('affiliate-checkout', {
        body: {
          planType,
          billing: isYearly ? 'yearly' : 'monthly',
          affiliateCode: code,
          direct: true,
        },
      });

      if (error) throw error;
      if (data?.url) window.open(data.url, '_blank');
    } catch (error) {
      console.error('Erro no checkout:', error);
      toast.error('Erro ao processar pagamento. Tente novamente.');
    } finally {
      setLoading(null);
    }
  };

  const comparisonRows = [
    { label: 'Matéria-prima', free: '30', professional: 'Ilimitado', enterprise: 'Ilimitado' },
    { label: 'Receitas', free: '5', professional: '60', enterprise: 'Ilimitado' },
    { label: 'Blocos de Markup', free: '1', professional: '3', enterprise: 'Ilimitado' },
    { label: 'Movimentação de estoque', free: true, professional: true, enterprise: true },
    { label: 'Impressão de Ficha Técnica', free: false, professional: '80 cópias/mês', enterprise: 'Ilimitado' },
    { label: 'Simulador de preços', free: false, professional: true, enterprise: true },
    { label: 'Suporte', free: false, professional: true, enterprise: true },
    { label: 'Suporte Personalizado', free: false, professional: false, enterprise: true },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Decorative gradient bar */}
      <div className="h-1.5 bg-gradient-to-r from-[#0483e4] via-[#7328b1] to-[#f96e0c]" />

      <div className="container mx-auto px-4 py-8 max-w-6xl space-y-8">
        {/* Back button */}
        <Button
          variant="ghost"
          onClick={() => navigate('/')}
          className="text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>

        {/* Header */}
        <div className="text-center space-y-3 animate-fade-in">
          <div className="flex justify-center mb-4">
            <img
              src="/assets/logo-calculaai.png"
              alt="CalculaAI"
              className="h-14 w-auto"
            />
          </div>
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5">
            <Sparkles className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold font-display text-foreground">
            Escolha seu Plano
          </h1>

          {affiliateData && (
            <div className="flex items-center justify-center gap-2">
              <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                <Zap className="h-3 w-3 mr-1" />
                Indicado por {affiliateData.name}
              </Badge>
            </div>
          )}

          <p className="text-muted-foreground max-w-xl mx-auto">
            Comece hoje mesmo a otimizar seus custos e maximizar seus lucros com o CalculaAI
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
            const isProfessional = planType === 'professional';
            const price = getPrice(planType);
            const savings = getSavings(planType);
            const isProcessing = loading === planType;

            return (
              <div
                key={planType}
                className={`
                  glass-card relative overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl
                  animate-slide-up
                  ${isProfessional ? 'md:scale-[1.03] z-10 ring-2 ring-[#7328b1]/30 shadow-brand' : ''}
                `}
                style={{ animationDelay: `${idx * 100}ms` }}
              >
                {/* Gradient top bar */}
                <div className={`h-1.5 bg-gradient-to-r ${planGradients[planType]}`} />

                {/* Popular badge */}
                {isProfessional && (
                  <div className="absolute top-4 right-4">
                    <Badge className="bg-gradient-to-r from-[#7328b1] to-[#af1188] text-white border-0 text-[10px] uppercase tracking-wider font-bold">
                      Mais Popular
                    </Badge>
                  </div>
                )}

                <div className="p-6 space-y-6">
                  {/* Icon + Name */}
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl bg-gradient-to-br ${planGradients[planType]} text-white shadow-lg`}>
                      {getPlanIcon(planType)}
                    </div>
                    <h3 className="text-lg font-bold font-display text-foreground">{config.name}</h3>
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
                    {isYearly && planType !== 'free' && (
                      <p className="text-xs text-muted-foreground">💳 Pagamento único à vista</p>
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
                      isProfessional
                        ? 'bg-gradient-to-r from-[#7328b1] to-[#af1188] hover:from-[#7328b1]/90 hover:to-[#af1188]/90 text-white shadow-lg hover:shadow-xl border-0'
                        : ''
                    }`}
                    variant={planType === 'free' ? 'outline' : 'default'}
                    onClick={() => handleSelectPlan(planType)}
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Processando...
                      </div>
                    ) : planType === 'free' ? (
                      'Começar Grátis'
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
          <span>Seus dados são preservados</span>
        </div>
      </div>
    </div>
  );
};

export default AffiliatePlanSelector;
