import React from 'react';
import { Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { UpgradePlansModal } from './UpgradePlansModal';
import { usePlanLimits, PlanType } from '@/hooks/usePlanLimits';
import { useState } from 'react';

interface PlanRestrictedAreaProps {
  requiredPlan: PlanType;
  feature: string;
  children: React.ReactNode;
  variant?: 'overlay' | 'button' | 'tab';
  size?: 'sm' | 'md' | 'lg';
}

export const PlanRestrictedArea = ({ 
  requiredPlan, 
  feature, 
  children, 
  variant = 'overlay',
  size = 'md' 
}: PlanRestrictedAreaProps) => {
  const { currentPlan, hasAccess } = usePlanLimits();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const hasFeatureAccess = hasAccess(requiredPlan);

  const handleUpgradeClick = () => {
    setShowUpgradeModal(true);
  };

  const getSuggestedPlanName = (plan: PlanType) => {
    switch (plan) {
      case 'professional': return 'Profissional';
      case 'enterprise': return 'Empresarial';
      default: return 'Profissional';
    }
  };

  if (hasFeatureAccess) {
    return <>{children}</>;
  }

  // Variante Button - para botões bloqueados
  if (variant === 'button') {
    return (
      <>
        <Button
          variant="outline"
          disabled
          className="relative opacity-60"
          onClick={handleUpgradeClick}
        >
          <Lock className="w-4 h-4 mr-2" />
          {typeof children === 'string' ? children : 'Recurso Premium'}
        </Button>
        <UpgradePlansModal
          open={showUpgradeModal}
          onOpenChange={setShowUpgradeModal}
          defaultPlan={requiredPlan}
        />
      </>
    );
  }

  // Variante Tab - para tabs bloqueadas
  if (variant === 'tab') {
    return (
      <div className="relative">
        {children}
        <Badge 
          variant="secondary" 
          className="absolute -top-2 -right-2 bg-orange-100 text-orange-700 border-orange-200"
        >
          <Lock className="w-3 h-3 mr-1" />
          Premium
        </Badge>
      </div>
    );
  }

  // Variante Overlay - padrão para seções bloqueadas
  return (
    <>
      <div className="relative">
        <div className="opacity-30 pointer-events-none">
          {children}
        </div>
        
        <Card className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm border-dashed border-2 border-muted-foreground/20">
          <div className="text-center space-y-4 p-6">
            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto">
              <Lock className="w-8 h-8 text-orange-600" />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-foreground">
                Recurso Premium
              </h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                {feature} está disponível apenas no plano {getSuggestedPlanName(requiredPlan)}
              </p>
            </div>
            
            <Button onClick={handleUpgradeClick} className="mt-4">
              <Lock className="w-4 h-4 mr-2" />
              Fazer Upgrade
            </Button>
          </div>
        </Card>
      </div>

      <UpgradePlansModal
        open={showUpgradeModal}
        onOpenChange={setShowUpgradeModal}
        defaultPlan={requiredPlan}
      />
    </>
  );
};