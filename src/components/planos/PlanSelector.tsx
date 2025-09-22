import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Check, Crown, Zap, CreditCard } from 'lucide-react';
import { PlanInfo, PlanType } from '@/hooks/usePlanLimits';
import { useStripe } from '@/hooks/useStripe';

interface PlanSelectorProps {
  planType: PlanType;
  planInfo: PlanInfo;
  currentPlan: PlanType;
  onSelectPlan?: (plan: PlanType, billing?: 'monthly' | 'yearly') => void;
  loading?: boolean;
}

const PlanIcon = ({ planType }: { planType: PlanType }) => {
  switch (planType) {
    case 'free':
      return null;
    case 'professional':
      return <Zap className="h-5 w-5 text-primary" />;
    case 'enterprise':
      return <Crown className="h-5 w-5 text-yellow-500" />;
  }
};

export const PlanSelector = ({ planType, planInfo, currentPlan, onSelectPlan, loading }: PlanSelectorProps) => {
  const [isYearly, setIsYearly] = useState(false);
  const { createCheckout } = useStripe();
  const isCurrentPlan = currentPlan === planType;
  const isUpgrade = currentPlan === 'free' && planType !== 'free';
  const isDowngrade = 
    (currentPlan === 'enterprise' && planType !== 'enterprise') ||
    (currentPlan === 'professional' && planType === 'free');

  const handlePlanSelect = async () => {
    if (planType === 'free') {
      onSelectPlan?.(planType);
      return;
    }
    
    const billing = isYearly ? 'yearly' : 'monthly';
    await createCheckout(planType, billing);
    onSelectPlan?.(planType, billing);
  };

  const getPrice = () => {
    if (planType === 'free') return 'Grátis';
    
    const price = isYearly ? planInfo.yearlyPrice : planInfo.price;
    const formattedPrice = `R$ ${price.toFixed(2).replace('.', ',')}`;
    
    if (isYearly) {
      const monthlyEquivalent = (planInfo.yearlyPrice / 12).toFixed(2);
      return (
        <div className="text-center">
          <div className="text-3xl font-bold">{formattedPrice}</div>
          <div className="text-sm text-muted-foreground">
            R$ {monthlyEquivalent.replace('.', ',')}/mês
          </div>
        </div>
      );
    }
    
    return <div className="text-3xl font-bold">{formattedPrice}/mês</div>;
  };

  const getSavings = () => {
    if (planType === 'free' || !isYearly) return null;
    
    const yearlyTotal = planInfo.price * 12;
    const savings = yearlyTotal - planInfo.yearlyPrice;
    const savingsPercentage = Math.round((savings / yearlyTotal) * 100);
    
    return (
      <Badge variant="secondary" className="bg-green-100 text-green-800">
        Economize {savingsPercentage}% (R$ {savings.toFixed(0)}/ano)
      </Badge>
    );
  };

  return (
    <Card className={`relative transition-all duration-200 ${
      isCurrentPlan ? 'ring-2 ring-primary shadow-lg' : 'hover:shadow-md'
    } ${planType === 'professional' ? 'border-primary' : ''}`}>
      {planType === 'professional' && (
        <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-primary text-primary-foreground">
          Mais Popular
        </Badge>
      )}
      
      <CardHeader className="text-center pb-4">
        <div className="flex items-center justify-center gap-2 mb-2">
          <PlanIcon planType={planType} />
          <CardTitle className="text-xl">{planInfo.name}</CardTitle>
        </div>
        
        {planType !== 'free' && (
          <div className="flex items-center justify-center gap-3 mb-4">
            <Label htmlFor={`billing-${planType}`} className="text-sm">
              Mensal
            </Label>
            <Switch
              id={`billing-${planType}`}
              checked={isYearly}
              onCheckedChange={setIsYearly}
            />
            <Label htmlFor={`billing-${planType}`} className="text-sm">
              Anual
            </Label>
          </div>
        )}
        
        <div className="flex flex-col items-center gap-2">
          {getPrice()}
          {getSavings()}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <ul className="space-y-2">
          {planInfo.features.map((feature, index) => (
            <li key={index} className="flex items-start gap-2">
              <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
              <span className="text-sm">{feature}</span>
            </li>
          ))}
        </ul>

        <Button
          className="w-full"
          variant={isCurrentPlan ? 'secondary' : 'default'}
          onClick={handlePlanSelect}
          disabled={loading}
        >
          {loading ? 'Carregando...' : 
           isCurrentPlan && planType !== 'free' ? (
             <>
               <CreditCard className="h-4 w-4 mr-2" />
               Gerenciar Assinatura
             </>
           ) :
           isCurrentPlan ? 'Plano Atual' :
           isUpgrade ? 'Fazer Upgrade' :
           isDowngrade ? 'Alterar Plano' :
           'Selecionar Plano'}
        </Button>

        {isCurrentPlan && (
          <Badge className="w-full justify-center" variant="secondary">
            Ativo
          </Badge>
        )}
      </CardContent>
    </Card>
  );
};