import { useEffect, useState } from 'react';
import { usePlanLimits } from '@/hooks/usePlanLimits';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Progress } from '@/components/ui/progress';

interface ProductCounterProps {
  className?: string;
}

export const ProductCounter = ({ className }: ProductCounterProps) => {
  const { user } = useAuth();
  const { planInfo, hasAccess } = usePlanLimits();
  const [productCount, setProductCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProductCount = async () => {
      if (!user) return;

      try {
        const { count } = await supabase
          .from('produtos')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);

        setProductCount(count || 0);
      } catch (error) {
        console.error('Erro ao carregar contagem de produtos:', error);
      } finally {
        setLoading(false);
      }
    };

    loadProductCount();
  }, [user]);

  if (loading) {
    return <div className={`text-sm text-muted-foreground ${className}`}>Carregando...</div>;
  }

  const maxAllowed = planInfo.limits.produtos;
  const isUnlimited = maxAllowed === -1;
  const percentage = isUnlimited ? 0 : (productCount / maxAllowed) * 100;
  const isNearLimit = percentage > 80;
  const isAtLimit = productCount >= maxAllowed && !isUnlimited;

  return (
    <div className={`space-y-1 ${className}`}>
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">
          {productCount}/{isUnlimited ? '∞' : maxAllowed} produtos cadastrados
        </span>
        {isAtLimit && (
          <span className="text-xs text-red-600 font-medium">• Limite atingido</span>
        )}
        {isNearLimit && !isAtLimit && (
          <span className="text-xs text-orange-600 font-medium">• Perto do limite</span>
        )}
      </div>
      
      {!isUnlimited && (
        <Progress 
          value={Math.min(percentage, 100)} 
          className={`h-1 ${isAtLimit ? 'bg-red-100' : isNearLimit ? 'bg-orange-100' : ''}`}
        />
      )}
    </div>
  );
};