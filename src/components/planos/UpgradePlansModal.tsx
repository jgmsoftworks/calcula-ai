import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PlanSelector } from './PlanSelector';
import { PlanType, usePlanLimits } from '@/hooks/usePlanLimits';
import { usePlanos, Billing } from '@/hooks/usePlanos';
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
  const [billing, setBilling] = useState<Billing>('monthly');

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

        <div className="flex justify-center mt-4">
          <div className="inline-flex items-center gap-1 rounded-2xl border border-border/40 bg-muted/30 p-1">
            {(['monthly', 'yearly'] as Billing[]).map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setBilling(opt)}
                className={`rounded-xl px-5 py-2 text-sm font-semibold transition-all ${
                  billing === opt
                    ? 'bg-gradient-to-r from-[#0483e4] to-[#7328b1] text-white shadow-lg'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {opt === 'monthly' ? 'Mensal' : 'Anual'}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
          {planos.map((plano) => (
            <PlanSelector
              key={plano.id}
              plano={plano}
              currentPlan={currentPlan}
              billing={billing}
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
