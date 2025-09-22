import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Crown, Zap, CreditCard } from 'lucide-react';
import { PlanInfo, PlanType } from '@/hooks/usePlanLimits';

interface PlanCardProps {
  planType: PlanType;
  planInfo: PlanInfo;
  currentPlan: PlanType;
  onSelectPlan: (plan: PlanType) => void;
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

export const PlanCard = ({ planType, planInfo, currentPlan, onSelectPlan, loading }: PlanCardProps) => {
  const isCurrentPlan = currentPlan === planType;
  const isUpgrade = currentPlan === 'free' && planType !== 'free';
  const isDowngrade = 
    (currentPlan === 'enterprise' && planType !== 'enterprise') ||
    (currentPlan === 'professional' && planType === 'free');

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
        
        <div className="flex items-baseline justify-center gap-1">
          <span className="text-3xl font-bold">
            {planInfo.price === 0 ? 'Grátis' : `R$ ${planInfo.price.toFixed(2).replace('.', ',')}`}
          </span>
          {planInfo.price > 0 && (
            <span className="text-muted-foreground">/mês</span>
          )}
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
          onClick={() => onSelectPlan(planType)}
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