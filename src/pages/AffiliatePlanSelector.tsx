import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PlanType } from '@/hooks/usePlanLimits';
import { usePlanos, formatPreco, Plano } from '@/hooks/usePlanos';
import { Crown, Zap, Gift, Check, X, Loader2, Shield, Sparkles, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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

const AffiliatePlanSelector = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { planos } = usePlanos();
  const [loading, setLoading] = useState<string | null>(null);
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

  const getPlanIcon = (planType: string) => {
    switch (planType) {
      case 'lite': return <Gift className="h-7 w-7" />;
      case 'professional': return <Zap className="h-7 w-7" />;
      case 'enterprise': return <Crown className="h-7 w-7" />;
      default: return <Sparkles className="h-7 w-7" />;
    }
  };

  const handleSelectPlan = async (plano: Plano) => {
    if (plano.preco_centavos === 0) {
      navigate('/auth');
      return;
    }

    setLoading(plano.slug);
    try {
      const { data, error } = await supabase.functions.invoke('affiliate-checkout', {
        body: {
          planType: plano.slug,
          billing: 'monthly',
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

  const limiteLabel = (valor?: number) => {
    if (valor === undefined || valor === null) return '—';
    if (valor === -1) return 'Ilimitado';
    if (valor === 0) return false;
    return String(valor);
  };

  const comparisonRows = [
    { label: 'Matéria-prima', key: 'produtos' as const },
    { label: 'Receitas', key: 'receitas' as const },
    { label: 'Blocos de Markup', key: 'markups' as const },
    { label: 'Movimentação de estoque', key: 'movimentacoes' as const },
    { label: 'Impressão de Ficha Técnica', key: 'pdf_exports' as const },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="h-1.5 bg-gradient-to-r from-[#0483e4] via-[#7328b1] to-[#f96e0c]" />

      <div className="container mx-auto px-4 py-8 max-w-6xl space-y-8">
        <Button
          variant="ghost"
          onClick={() => navigate('/')}
          className="text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>

        <div className="text-center space-y-3 animate-fade-in">
          <div className="flex justify-center mb-4">
            <img src="/assets/logo-calculaai.png" alt="CalculaAI" className="h-14 w-auto" />
          </div>
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5">
            <Sparkles className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold font-display text-foreground">Escolha seu Plano</h1>

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

        {/* Plan Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {planos.map((plano, idx) => {
            const planType = plano.slug as PlanType;
            const isProfessional = planType === 'professional';
            const isProcessing = loading === plano.slug;

            return (
              <div
                key={plano.id}
                className={`
                  glass-card relative overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl
                  animate-slide-up
                  ${isProfessional ? 'md:scale-[1.03] z-10 ring-2 ring-[#7328b1]/30 shadow-brand' : ''}
                `}
                style={{ animationDelay: `${idx * 100}ms` }}
              >
                <div className={`h-1.5 bg-gradient-to-r ${planGradients[planType]}`} />

                {isProfessional && (
                  <div className="absolute top-4 right-4">
                    <Badge className="bg-gradient-to-r from-[#7328b1] to-[#af1188] text-white border-0 text-[10px] uppercase tracking-wider font-bold">
                      Mais Popular
                    </Badge>
                  </div>
                )}

                <div className="p-6 space-y-6">
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl bg-gradient-to-br ${planGradients[planType]} text-white shadow-lg`}>
                      {getPlanIcon(plano.slug)}
                    </div>
                    <h3 className="text-lg font-bold font-display text-foreground">{plano.nome_publico}</h3>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold font-display text-foreground">
                        {formatPreco(plano.preco_centavos)}
                      </span>
                      {plano.preco_centavos > 0 && (
                        <span className="text-sm text-muted-foreground">/mês</span>
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
                      isProfessional
                        ? 'bg-gradient-to-r from-[#7328b1] to-[#af1188] hover:from-[#7328b1]/90 hover:to-[#af1188]/90 text-white shadow-lg hover:shadow-xl border-0'
                        : ''
                    }`}
                    onClick={() => handleSelectPlan(plano)}
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Processando...
                      </div>
                    ) : (
                      `Escolher ${plano.nome_publico}`
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
