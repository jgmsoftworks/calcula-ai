import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PlanCard } from './PlanCard';
import { PLAN_CONFIGS, PlanType, usePlanLimits } from '@/hooks/usePlanLimits';
import { useToast } from '@/hooks/use-toast';

interface UpgradePlansModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultPlan?: PlanType;
}

export const UpgradePlansModal = ({ open, onOpenChange, defaultPlan }: UpgradePlansModalProps) => {
  const { currentPlan } = usePlanLimits();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleSelectPlan = async (planType: PlanType) => {
    if (planType === currentPlan) return;

    setLoading(true);
    
    try {
      if (planType === 'free') {
        // Para downgrade para free, apenas atualizamos diretamente
        toast({
          title: 'Funcionalidade em desenvolvimento',
          description: 'A alteração de planos será implementada em breve.',
        });
      } else {
        // Para planos pagos, integração com Mercado Pago será implementada
        toast({
          title: 'Integração com Mercado Pago',
          description: 'A integração com pagamentos será implementada em breve. Entre em contato conosco.',
        });
      }
    } catch (error) {
      console.error('Erro ao processar plano:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao processar alteração de plano. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Escolha seu Plano</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
          {Object.entries(PLAN_CONFIGS).map(([planType, planInfo]) => (
            <PlanCard
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
            <li>• Pagamentos processados via Mercado Pago (integração em desenvolvimento)</li>
            <li>• Suporte via email para dúvidas sobre planos</li>
          </ul>
        </div>
      </DialogContent>
    </Dialog>
  );
};