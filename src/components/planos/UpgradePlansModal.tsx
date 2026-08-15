import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PlanSelector } from './PlanSelector';
import { PlanType, usePlanLimits } from '@/hooks/usePlanLimits';
import { usePlanos } from '@/hooks/usePlanos';
import { useStripe } from '@/hooks/useStripe';

interface UpgradePlansModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultPlan?: PlanType;
}

export const UpgradePlansModal = ({ open, onOpenChange }: UpgradePlansModalProps) => {
  const { currentPlan } = usePlanLimits();
  const { planos } = usePlanos();
  const { openCustomerPortal, loading } = useStripe();

  const handleSelectPlan = async (planType: string) => {
    if (planType === currentPlan) {
      await openCustomerPortal();
      return;
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-[95vw] lg:max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Escolha seu Plano</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
          {planos.map((plano) => (
            <PlanSelector
              key={plano.id}
              plano={plano}
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
