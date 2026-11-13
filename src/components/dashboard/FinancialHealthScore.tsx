import { useCallback } from 'react';
import { localizeText } from '@/i18n/localizeText';
import { useTranslation as usePortugalTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { 
  TrendingUp, 
  Package, 
  DollarSign, 
  BarChart3, 
  CheckCircle2, 
  AlertCircle,
  Info,
  Activity
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { formatNumber } from '@/lib/formatters';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface HealthMetric {
  name: string;
  score: number;
  status: 'excellent' | 'good' | 'warning' | 'critical';
  description: string;
  icon: React.ReactNode;
}

export const FinancialHealthScore = () => {
  usePortugalTranslation();
  const [overallScore, setOverallScore] = useState(0);
  const [metrics, setMetrics] = useState<HealthMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();



  const calculateHealthScore = useCallback(async () => {
    if (!user) return;

    try {
      // 1. Análise de Margem de Lucro
      const { data: recipes } = await supabase
        .from('receitas')
        .select(`
          id,
          nome,
          preco_venda,
          receita_ingredientes(
            quantidade,
            produto:produtos(custo_unitario, unidade_uso, fator_conversao, unidade_compra)
          ),
          receita_embalagens(
            quantidade,
            produto:produtos(custo_unitario, unidade_uso, fator_conversao, unidade_compra)
          ),
          receita_mao_obra(valor_total)
        `)
        .eq('user_id', user.id)
        .not('preco_venda', 'is', null)
        .gt('preco_venda', 0);

      let margemScore = 0;
      let margemStatus: 'excellent' | 'good' | 'warning' | 'critical' = 'critical';
      let margemDesc = 'Sem receitas precificadas';

      if (recipes && recipes.length > 0) {
        const margens = recipes.map(recipe => {
          // Calcular custo de ingredientes dinamicamente
          const custoIngredientes = recipe.receita_ingredientes?.reduce((sum: number, i) => {
            if (!i.produto) return sum;
            const custoUnitario = i.produto.unidade_uso 
              ? i.produto.custo_unitario / (i.produto.fator_conversao || 1)
              : i.produto.custo_unitario;
            return sum + (custoUnitario * i.quantidade);
          }, 0) || 0;

          // Calcular custo de embalagens dinamicamente
          const custoEmbalagens = recipe.receita_embalagens?.reduce((sum: number, e) => {
            if (!e.produto) return sum;
            const custoUnitario = e.produto.unidade_uso 
              ? e.produto.custo_unitario / (e.produto.fator_conversao || 1)
              : e.produto.custo_unitario;
            return sum + (custoUnitario * e.quantidade);
          }, 0) || 0;

          // Custo de mão de obra
          const custoMaoObra = recipe.receita_mao_obra?.reduce((sum: number, m) => sum + (m.valor_total || 0), 0) || 0;

          const custoTotal = custoIngredientes + custoEmbalagens + custoMaoObra;
          
          return ((recipe.preco_venda - custoTotal) / recipe.preco_venda) * 100;
        });

        const margemMedia = margens.reduce((a, b) => a + b, 0) / margens.length;

        if (margemMedia >= 40) {
          margemScore = 100;
          margemStatus = 'excellent';
          margemDesc = `Excelente! Margem média de ${formatNumber(margemMedia, 1)}%`;
        } else if (margemMedia >= 30) {
          margemScore = 80;
          margemStatus = 'good';
          margemDesc = `Boa margem média de ${formatNumber(margemMedia, 1)}%`;
        } else if (margemMedia >= 20) {
          margemScore = 60;
          margemStatus = 'warning';
          margemDesc = `Margem média de ${formatNumber(margemMedia, 1)}% - pode melhorar`;
        } else {
          margemScore = 40;
          margemStatus = 'critical';
          margemDesc = `Margem baixa de ${formatNumber(margemMedia, 1)}% - atenção!`;
        }
      }

      // 2. Diversificação de Produtos - TEMPORARIAMENTE DESABILITADO
      // (Sistema de estoque foi reconstruído, esta métrica será reimplementada)
      const diversificacaoScore = 70;
      const diversificacaoStatus: 'excellent' | 'good' | 'warning' | 'critical' = 'good';
      const diversificacaoDesc = 'Análise temporariamente indisponível';



      // 3. Consistência de Custos - TEMPORARIAMENTE DESABILITADO
      // (Sistema de estoque foi reconstruído, esta métrica será reimplementada)
      const consistenciaScore = 70;
      const consistenciaStatus: 'excellent' | 'good' | 'warning' | 'critical' = 'good';
      const consistenciaDesc = 'Análise temporariamente indisponível';



      // 4. Controle de Estoque - TEMPORARIAMENTE DESABILITADO
      // (Sistema de estoque foi reconstruído, esta métrica será reimplementada)
      const estoqueScore = 70;
      const estoqueStatus: 'excellent' | 'good' | 'warning' | 'critical' = 'good';
      const estoqueDesc = 'Análise temporariamente indisponível';

      // Código desabilitado - será reimplementado

      // 5. Otimização de Precificação
      const { data: receitasSemPreco } = await supabase
        .from('receitas')
        .select('id')
        .eq('user_id', user.id)
        .or('preco_venda.is.null,preco_venda.eq.0');

      let precificacaoScore = 0;
      let precificacaoStatus: 'excellent' | 'good' | 'warning' | 'critical' = 'critical';
      let precificacaoDesc = 'Sem receitas cadastradas';

      const totalReceitas = (recipes?.length || 0) + (receitasSemPreco?.length || 0);
      
      if (totalReceitas > 0) {
        const percentualPrecificado = ((recipes?.length || 0) / totalReceitas) * 100;

        if (percentualPrecificado === 100) {
          precificacaoScore = 100;
          precificacaoStatus = 'excellent';
          precificacaoDesc = 'Todas as receitas precificadas!';
        } else if (percentualPrecificado >= 80) {
          precificacaoScore = 80;
          precificacaoStatus = 'good';
          precificacaoDesc = `${formatNumber(percentualPrecificado, 0)}% das receitas precificadas`;
        } else if (percentualPrecificado >= 50) {
          precificacaoScore = 60;
          precificacaoStatus = 'warning';
          precificacaoDesc = `${receitasSemPreco?.length} receitas sem preço`;
        } else {
          precificacaoScore = 40;
          precificacaoStatus = 'critical';
          precificacaoDesc = `${receitasSemPreco?.length} receitas precisam de preço`;
        }
      }

      const healthMetrics: HealthMetric[] = [
        {
          name: 'Margem de Lucro',
          score: margemScore,
          status: margemStatus,
          description: margemDesc,
          icon: <DollarSign className="h-4 w-4" />
        },
        {
          name: 'Diversificação',
          score: diversificacaoScore,
          status: diversificacaoStatus,
          description: diversificacaoDesc,
          icon: <BarChart3 className="h-4 w-4" />
        },
        {
          name: 'Consistência de Custos',
          score: consistenciaScore,
          status: consistenciaStatus,
          description: consistenciaDesc,
          icon: <TrendingUp className="h-4 w-4" />
        },
        {
          name: 'Controle de Estoque',
          score: estoqueScore,
          status: estoqueStatus,
          description: estoqueDesc,
          icon: <Package className="h-4 w-4" />
        },
        {
          name: 'Precificação',
          score: precificacaoScore,
          status: precificacaoStatus,
          description: precificacaoDesc,
          icon: <CheckCircle2 className="h-4 w-4" />
        }
      ];

      const scoreGeral = healthMetrics.reduce((sum, m) => sum + m.score, 0) / healthMetrics.length;

      setMetrics(healthMetrics);
      setOverallScore(Math.round(scoreGeral));
    } catch (error) {
      console.error('Erro ao calcular score de saúde:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

useEffect(() => {
    if (user) {
      calculateHealthScore();
    }
  }, [calculateHealthScore, user]);

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 dark:text-green-400';
    if (score >= 60) return 'text-yellow-600 dark:text-yellow-400';
    if (score >= 40) return 'text-orange-600 dark:text-orange-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return 'Excelente';
    if (score >= 60) return 'Bom';
    if (score >= 40) return 'Atenção';
    return 'Crítico';
  };



  if (loading) {
    return (
      <Card className="soft-card">
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="soft-card">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-xl">
            <Activity className="h-5 w-5 text-primary" />
            Score de Saúde
          </CardTitle>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Info className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>{localizeText("Análise baseada em 5 pilares: margem de lucro, diversificação, consistência de custos, controle de estoque e precificação.")}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardHeader>
      <CardContent>
        {/* Score Principal */}
        <div className="text-center mb-6">
          <div className={`text-6xl font-bold ${getScoreColor(overallScore)}`}>
            {overallScore}
          </div>
          <p className="text-muted-foreground text-sm mt-1">de 100 pontos</p>
          <Badge 
            className="mt-3"
            variant={overallScore >= 70 ? "default" : "secondary"}
          >
            {getScoreLabel(overallScore)}
          </Badge>
        </div>

        {/* Métricas Resumidas */}
        <div className="space-y-3">
          {metrics.map((metric) => (
            <div key={metric.name} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <div className="text-muted-foreground">{metric.icon}</div>
                <span className="font-medium">{metric.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`font-semibold ${getScoreColor(metric.score)}`}>
                  {metric.score}
                </span>
                <Progress value={metric.score} className="h-1.5 w-16" />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
