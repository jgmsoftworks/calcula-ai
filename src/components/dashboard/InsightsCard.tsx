import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, TrendingDown, Package, DollarSign } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Badge } from '@/components/ui/badge';

interface Insight {
  type: 'critical' | 'warning' | 'info';
  icon: React.ReactNode;
  message: string;
  count?: number;
}

export const InsightsCard = () => {
  const { user } = useAuth();
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    
    const fetchInsights = async () => {
      try {
        const [
          { data: allProducts },
          { data: unpricedRecipes },
          { data: lowMarginRecipes }
        ] = await Promise.all([
          // Produtos com estoque crítico
          supabase
            .from('produtos')
            .select('id, estoque_atual, estoque_minimo')
            .eq('user_id', user.id)
            .eq('ativo', true)
            .limit(100),
          
          // Receitas sem precificação
          supabase
            .from('receitas')
            .select('id')
            .eq('user_id', user.id)
            .or('preco_venda.is.null,preco_venda.eq.0')
            .limit(10),
          
          // Receitas com margem baixa (<20%)
          supabase
            .from('receitas')
            .select('id, preco_venda')
            .eq('user_id', user.id)
            .gt('preco_venda', 0)
            .limit(100)
        ]);

        const newInsights: Insight[] = [];

        // Estoque crítico - filtrar localmente
        const lowStockProducts = allProducts?.filter(p => 
          p.estoque_atual < (p.estoque_minimo || 0)
        ) || [];
        
        if (lowStockProducts.length > 0) {
          newInsights.push({
            type: 'critical',
            icon: <AlertCircle className="h-4 w-4" />,
            message: 'produtos com estoque crítico',
            count: lowStockProducts.length
          });
        }

        // Sem precificação
        if (unpricedRecipes && unpricedRecipes.length > 0) {
          newInsights.push({
            type: 'warning',
            icon: <DollarSign className="h-4 w-4" />,
            message: 'receitas sem precificação',
            count: unpricedRecipes.length
          });
        }

        // Margem baixa (cálculo simplificado)
        if (lowMarginRecipes && lowMarginRecipes.length > 5) {
          newInsights.push({
            type: 'info',
            icon: <TrendingDown className="h-4 w-4" />,
            message: 'receitas precisam revisar margem',
            count: Math.min(lowMarginRecipes.length, 10)
          });
        }

        // Mensagem positiva se tudo ok
        if (newInsights.length === 0) {
          newInsights.push({
            type: 'info',
            icon: <Package className="h-4 w-4" />,
            message: 'Tudo funcionando bem! Continue assim 🎉'
          });
        }

        setInsights(newInsights);
      } catch (error) {
        console.error('Erro ao buscar insights:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchInsights();
  }, [user]);

  if (loading) {
    return (
      <Card className="soft-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-medium">💡 Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="h-6 bg-muted/50 rounded animate-pulse" />
            <div className="h-6 bg-muted/50 rounded animate-pulse w-3/4" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const getInsightColor = (type: Insight['type']) => {
    switch (type) {
      case 'critical': return 'text-destructive';
      case 'warning': return 'text-orange';
      case 'info': return 'text-muted-foreground';
    }
  };

  const getInsightBadgeVariant = (type: Insight['type']) => {
    switch (type) {
      case 'critical': return 'destructive';
      case 'warning': return 'secondary';
      case 'info': return 'outline';
    }
  };

  return (
    <Card className="soft-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-medium">💡 Insights Automáticos</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2.5">
          {insights.map((insight, idx) => (
            <div 
              key={idx}
              className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
            >
              <div className={getInsightColor(insight.type)}>
                {insight.icon}
              </div>
              <div className="flex-1 text-sm">
                {insight.count !== undefined && (
                  <Badge 
                    variant={getInsightBadgeVariant(insight.type)}
                    className="mr-2 font-semibold"
                  >
                    {insight.count}
                  </Badge>
                )}
                <span className="text-foreground/90">{insight.message}</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};