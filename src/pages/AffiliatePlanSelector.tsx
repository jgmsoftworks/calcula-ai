import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Check, Star, Crown, Zap, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PlanData {
  name: string;
  price: number;
  billing: 'monthly' | 'yearly';
  popular?: boolean;
  features: string[];
  icon: React.ReactNode;
}

const plans: PlanData[] = [
  {
    name: 'Professional Mensal',
    price: 49.90,
    billing: 'monthly',
    features: ['Matéria-prima ilimitada', 'Máx. 60 receitas', 'Até 3 blocos de markup', 'Movimentação de estoque', 'Sistema de Vitrine', 'Simulador de preços', '80 PDFs por mês'],
    icon: <Star className="h-5 w-5" />
  },
  {
    name: 'Professional Anual',
    price: 478.80,
    billing: 'yearly',
    popular: true,
    features: ['Matéria-prima ilimitada', 'Máx. 60 receitas', 'Até 3 blocos de markup', 'Movimentação de estoque', 'Sistema de Vitrine', 'Simulador de preços', '80 PDFs por mês'],
    icon: <Star className="h-5 w-5" />
  },
  {
    name: 'Enterprise Mensal',
    price: 89.90,
    billing: 'monthly',
    features: ['Tudo ilimitado', 'Sistema de Vitrine', 'Simulador de preços', 'Suporte prioritário', 'Recursos avançados'],
    icon: <Crown className="h-5 w-5" />
  },
  {
    name: 'Enterprise Anual',
    price: 838.80,
    billing: 'yearly',
    features: ['Tudo ilimitado', 'Sistema de Vitrine', 'Simulador de preços', 'Suporte prioritário', 'Recursos avançados'],
    icon: <Crown className="h-5 w-5" />
  }
];

const AffiliatePlanSelector = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState<string | null>(null);
  const [affiliateData, setAffiliateData] = useState<any>(null);
  const [linkData, setLinkData] = useState<any>(null);

  useEffect(() => {
    if (code) {
      loadAffiliateData();
      // Salvar cookie de afiliado
      const expires = new Date();
      expires.setDate(expires.getDate() + 60);
      document.cookie = `aff_code=${code}; expires=${expires.toUTCString()}; path=/; SameSite=Lax; Secure`;
    }
  }, [code]);

  const loadAffiliateData = async () => {
    try {
      const { data: link } = await supabase
        .from('affiliate_links')
        .select(`
          *,
          affiliate:affiliates(name, email)
        `)
        .eq('link_code', code)
        .eq('is_active', true)
        .single();

      if (link) {
        setLinkData(link);
        setAffiliateData(link.affiliate);
        
        // Incrementar click count
        await supabase
          .from('affiliate_links')
          .update({ clicks_count: (link.clicks_count || 0) + 1 })
          .eq('id', link.id);
      }
    } catch (error) {
      console.error('Erro ao carregar dados do afiliado:', error);
    }
  };

  const handleSelectPlan = async (plan: PlanData) => {
    setLoading(`${plan.name}_${plan.billing}`);
    
    try {
      const { data, error } = await supabase.functions.invoke('affiliate-checkout', {
        body: {
          planType: plan.name.toLowerCase(),
          billing: plan.billing,
          affiliateCode: code,
          direct: true
        }
      });

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Erro no checkout:', error);
      toast.error('Erro ao processar pagamento. Tente novamente.');
    } finally {
      setLoading(null);
    }
  };

  const formatPrice = (price: number, billing: 'monthly' | 'yearly') => {
    const monthlyPrice = billing === 'yearly' ? price / 12 : price;
    return {
      main: `R$ ${monthlyPrice.toFixed(2).replace('.', ',')}`,
      period: '/mês',
      total: billing === 'yearly' ? `Cobrado R$ ${price.toFixed(2).replace('.', ',')} anualmente` : ''
    };
  };

  return (
    <div className="min-h-screen bg-gradient-primary">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <Button
            variant="ghost" 
            onClick={() => navigate('/')}
            className="absolute top-4 left-4 text-white hover:bg-white/20"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          
          <div className="flex justify-center mb-6">
            <img 
              src="/assets/logo-calculaai.png" 
              alt="CalculaAI" 
              className="h-16 w-auto"
            />
          </div>
          
          <h1 className="text-4xl font-bold text-white mb-4">
            Escolha seu Plano
          </h1>
          
          {affiliateData && (
            <div className="flex items-center justify-center gap-2 mb-4">
              <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                <Zap className="h-3 w-3 mr-1" />
                Indicado por {affiliateData.name}
              </Badge>
            </div>
          )}
          
          <p className="text-white/80 text-lg max-w-2xl mx-auto">
            Comece hoje mesmo a otimizar seus custos e maximizar seus lucros com o CalculaAI
          </p>
        </div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
          {plans.map((plan, index) => {
            const pricing = formatPrice(plan.price, plan.billing);
            const planKey = `${plan.name}_${plan.billing}`;
            const isLoading = loading === planKey;
            
            return (
              <Card 
                key={index}
                className={`relative overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-glow flex flex-col h-full ${
                  plan.popular 
                    ? 'ring-2 ring-white/50 shadow-glow' 
                    : 'hover:shadow-xl'
                }`}
              >
                {plan.popular && (
                  <div className="absolute top-0 left-0 right-0 bg-gradient-accent text-white text-center py-2 text-sm font-semibold">
                    🔥 Mais Popular
                  </div>
                )}
                
                <CardHeader className={plan.popular ? 'pt-12' : 'pt-6'}>
                  <CardTitle className="flex items-center gap-2">
                    {plan.icon}
                    {plan.name}
                  </CardTitle>
                  
                  <div className="space-y-1">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold text-primary">
                        {pricing.main}
                      </span>
                      <span className="text-muted-foreground">
                        {pricing.period}
                      </span>
                    </div>
                    {pricing.total && (
                      <p className="text-xs text-muted-foreground">
                        {pricing.total}
                      </p>
                    )}
                  </div>
                  
                  <CardDescription className="space-y-1">
                    <span>{plan.billing === 'yearly' ? 'Plano Anual' : 'Plano Mensal'}</span>
                    {plan.billing === 'yearly' && (
                      <div className="text-xs text-primary font-medium">
                        💳 Pagamento único à vista
                      </div>
                    )}
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="flex-1">
                  <ul className="space-y-3">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                
                <CardFooter>
                  <Button 
                    onClick={() => handleSelectPlan(plan)}
                    disabled={isLoading}
                    className={`w-full transition-all duration-300 ${
                      plan.popular
                        ? 'bg-gradient-accent hover:shadow-glow'
                        : 'bg-gradient-primary hover:shadow-brand'
                    }`}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Processando...
                      </>
                    ) : (
                      <>
                        Selecionar Plano
                        <Zap className="h-4 w-4 ml-2" />
                      </>
                    )}
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>

        {/* Footer */}
        <div className="text-center mt-16">
          <p className="text-white/60 text-sm">
            Processamento seguro via Stripe • Cancele quando quiser • Suporte 24/7
          </p>
        </div>
      </div>
    </div>
  );
};

export default AffiliatePlanSelector;