import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Crown, Zap, CreditCard, Gift } from 'lucide-react';
import { PlanType } from '@/hooks/usePlanLimits';
import { Plano, formatPreco } from '@/hooks/usePlanos';

interface PlanCardProps {
  plano: Plano;
  currentPlan: PlanType;
  onSelectPlan: (plan: string) => void;
  loading?: boolean;
}

const PlanIcon = ({ planType }: { planType: string }) => {
  switch (planType) {
    case 'lite':
      return <Gift className="h-5 w-5 text-[#0483e4]" />;
    case 'professional':
      return <Zap className="h-5 w-5 text-primary" />;
    case 'enterprise':
      return <Crown className="h-5 w-5 text-yellow-500" />;
    default:
      return null;
  }
};

export const PlanCard = ({ plano, currentPlan, onSelectPlan, loading }: PlanCardProps) => {
  const isCurrentPlan = currentPlan === plano.slug;

  return (
    <Card className={`relative transition-all duration-200 ${
      isCurrentPlan ? 'ring-2 ring-primary shadow-lg' : 'hover:shadow-md'
    } ${plano.slug === 'professional' ? 'border-primary' : ''}`}>
      {plano.slug === 'professional' && (
        <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-primary text-primary-foreground">
          Mais Popular
        </Badge>
      )}

      <CardHeader className="text-center pb-4">
        <div className="flex items-center justify-center gap-2 mb-2">
          <PlanIcon planType={plano.slug} />
          <CardTitle className="text-xl">{plano.nome_publico}</CardTitle>
        </div>

        <div className="flex items-baseline justify-center gap-1">
          <span className="text-3xl font-bold">{formatPreco(plano.preco_centavos)}</span>
          {plano.preco_centavos > 0 && <span className="text-muted-foreground">/mês</span>}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <ul className="space-y-2">
          {plano.features.map((feature, index) => (
            <li key={index} className="flex items-start gap-2">
              <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
              <span className="text-sm">{feature}</span>
            </li>
          ))}
        </ul>

        <Button
          className="w-full"
          variant={isCurrentPlan ? 'secondary' : 'default'}
          onClick={() => onSelectPlan(plano.slug)}
          disabled={loading}
        >
          {loading ? 'Carregando...' :
           isCurrentPlan ? (
             <>
               <CreditCard className="h-4 w-4 mr-2" />
               Gerenciar Assinatura
             </>
           ) : 'Selecionar Plano'}
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
