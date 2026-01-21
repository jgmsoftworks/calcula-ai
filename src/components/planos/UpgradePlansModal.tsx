import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PlanSelector } from './PlanSelector';
import { PLAN_CONFIGS, PlanType, usePlanLimits } from '@/hooks/usePlanLimits';
import { useStripe } from '@/hooks/useStripe';

interface UpgradePlansModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultPlan?: PlanType;
}

export const UpgradePlansModal = ({ open, onOpenChange, defaultPlan }: UpgradePlansModalProps) => {
  const { currentPlan } = usePlanLimits();
  const { createCheckout, openCustomerPortal, loading } = useStripe();

  const handleSelectPlan = async (planType: PlanType, billing?: 'monthly' | 'yearly') => {
    if (planType === currentPlan) {
      // Se é o plano atual e não é free, abrir portal de gerenciamento
      if (planType !== 'free') {
        await openCustomerPortal();
      }
      return;
    }

    if (planType === 'free') {
      // Para downgrade, abrir portal do Stripe
      await openCustomerPortal();
    } else {
      // Para upgrade, criar checkout
      await createCheckout(planType, billing || 'monthly');
      onOpenChange(false); // Fechar modal após iniciar checkout
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-[95vw] lg:max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Escolha seu Plano</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
          {Object.entries(PLAN_CONFIGS).map(([planType, planInfo]) => (
            <PlanSelector
              key={planType}
              planType={planType as PlanType}
              planInfo={planInfo}
              currentPlan={currentPlan}
              onSelectPlan={handleSelectPlan}
              loading={loading}
            />
          ))}
        </div>

        <div className="mt-6 p-4 bg-muted rounded-lg">
          <h4 className="font-semibold mb-2">Informações importantes:</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Os limites se aplicam imediatamente após a mudança de plano</li>
            <li>• Pagamentos processados via Stripe com máxima segurança</li>
            <li>• Cancele ou altere seu plano a qualquer momento</li>
            <li>• Suporte via email para dúvidas sobre planos</li>
          </ul>
        </div>
      </DialogContent>
    </Dialog>
  );
};