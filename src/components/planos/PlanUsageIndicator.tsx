import { useEffect, useState } from 'react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { usePlanLimits, PlanLimits } from '@/hooks/usePlanLimits';
import { Loader2 } from 'lucide-react';

interface PlanUsageIndicatorProps {
  featureType: keyof PlanLimits;
  label: string;
  className?: string;
}

export const PlanUsageIndicator = ({ featureType, label, className }: PlanUsageIndicatorProps) => {
  const { planInfo, getCurrentUsage, hasAccess } = usePlanLimits();
  const [currentCount, setCurrentCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  const maxAllowed = planInfo.limits[featureType];
  const isUnlimited = maxAllowed === -1;

  useEffect(() => {
    const loadUsage = async () => {
      setLoading(true);
      const count = await getCurrentUsage(featureType);
      setCurrentCount(count);
      setLoading(false);
    };

    loadUsage();
  }, [featureType, getCurrentUsage]);

  if (loading) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm text-muted-foreground">Carregando...</span>
      </div>
    );
  }

  const percentage = isUnlimited ? 0 : Math.min((currentCount / maxAllowed) * 100, 100);
  const isNearLimit = percentage > 80;
  const isAtLimit = currentCount >= maxAllowed && !isUnlimited;

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{label}</span>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {currentCount}/{isUnlimited ? '∞' : maxAllowed}
          </span>
          {isAtLimit && (
            <Badge variant="destructive" className="text-xs">
              Limite atingido
            </Badge>
          )}
          {isNearLimit && !isAtLimit && (
            <Badge variant="outline" className="text-xs border-orange-200 text-orange-700">
              Perto do limite
            </Badge>
          )}
        </div>
      </div>
      
      {!isUnlimited && (
        <Progress 
          value={percentage} 
          className={`h-2 ${isAtLimit ? 'bg-destructive/20' : isNearLimit ? 'bg-orange-100' : ''}`}
        />
      )}
    </div>
  );
};