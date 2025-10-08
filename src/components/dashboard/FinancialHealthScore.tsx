import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, 
  Package, 
  DollarSign, 
  BarChart3, 
  CheckCircle2, 
  AlertCircle,
  Info
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
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
  const [overallScore, setOverallScore] = useState(0);
  const [metrics, setMetrics] = useState<HealthMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      calculateHealthScore();
    }
  }, [user]);

  const calculateHealthScore = async () => {
    if (!user) return;

    try {
      // 1. Análise de Margem de Lucro
      const { data: recipes } = await supabase
        .from('receitas')
        .select(`
          id,
          nome,
          preco_venda,
          receita_ingredientes(custo_total),
          receita_embalagens(custo_total),
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
          const custoTotal = 
            (recipe.receita_ingredientes?.reduce((sum: number, i: any) => sum + (i.custo_total || 0), 0) || 0) +
            (recipe.receita_embalagens?.reduce((sum: number, i: any) => sum + (i.custo_total || 0), 0) || 0) +
            (recipe.receita_mao_obra?.reduce((sum: number, i: any) => sum + (i.valor_total || 0), 0) || 0);
          
          return ((recipe.preco_venda - custoTotal) / recipe.preco_venda) * 100;
        });

        const margemMedia = margens.reduce((a, b) => a + b, 0) / margens.length;

        if (margemMedia >= 40) {
          margemScore = 100;
          margemStatus = 'excellent';
          margemDesc = `Excelente! Margem média de ${margemMedia.toFixed(1)}%`;
        } else if (margemMedia >= 30) {
          margemScore = 80;
          margemStatus = 'good';
          margemDesc = `Boa margem média de ${margemMedia.toFixed(1)}%`;
        } else if (margemMedia >= 20) {
          margemScore = 60;
          margemStatus = 'warning';
          margemDesc = `Margem média de ${margemMedia.toFixed(1)}% - pode melhorar`;
        } else {
          margemScore = 40;
          margemStatus = 'critical';
          margemDesc = `Margem baixa de ${margemMedia.toFixed(1)}% - atenção!`;
        }
      }

      // 2. Diversificação de Produtos
      const { data: produtos } = await supabase
        .from('produtos')
        .select('id, categorias')
        .eq('user_id', user.id)
        .eq('ativo', true);

      let diversificacaoScore = 0;
      let diversificacaoStatus: 'excellent' | 'good' | 'warning' | 'critical' = 'critical';
      let diversificacaoDesc = 'Sem produtos cadastrados';

      if (produtos && produtos.length > 0) {
        const categorias = new Set(produtos.flatMap(p => p.categorias || []));
        const numCategorias = categorias.size;

        if (numCategorias >= 5) {
          diversificacaoScore = 100;
          diversificacaoStatus = 'excellent';
          diversificacaoDesc = `${numCategorias} categorias - portfólio diversificado`;
        } else if (numCategorias >= 3) {
          diversificacaoScore = 75;
          diversificacaoStatus = 'good';
          diversificacaoDesc = `${numCategorias} categorias - boa diversificação`;
        } else if (numCategorias >= 2) {
          diversificacaoScore = 50;
          diversificacaoStatus = 'warning';
          diversificacaoDesc = `${numCategorias} categorias - considere diversificar`;
        } else {
          diversificacaoScore = 30;
          diversificacaoStatus = 'critical';
          diversificacaoDesc = 'Portfólio pouco diversificado';
        }
      }

      // 3. Consistência de Custos (variação < 20% = bom)
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data: movimentacoes } = await supabase
        .from('movimentacoes')
        .select('produto_id, custo_unitario, tipo')
        .eq('user_id', user.id)
        .eq('tipo', 'entrada')
        .gte('data', sevenDaysAgo);

      let consistenciaScore = 0;
      let consistenciaStatus: 'excellent' | 'good' | 'warning' | 'critical' = 'critical';
      let consistenciaDesc = 'Sem dados de movimentação';

      if (movimentacoes && movimentacoes.length > 0) {
        const produtosCustos: Record<string, number[]> = {};
        movimentacoes.forEach(mov => {
          if (!produtosCustos[mov.produto_id]) {
            produtosCustos[mov.produto_id] = [];
          }
          produtosCustos[mov.produto_id].push(mov.custo_unitario);
        });

        const variacoes = Object.values(produtosCustos)
          .filter(custos => custos.length >= 2)
          .map(custos => {
            const min = Math.min(...custos);
            const max = Math.max(...custos);
            return ((max - min) / min) * 100;
          });

        if (variacoes.length > 0) {
          const variacaoMedia = variacoes.reduce((a, b) => a + b, 0) / variacoes.length;

          if (variacaoMedia <= 10) {
            consistenciaScore = 100;
            consistenciaStatus = 'excellent';
            consistenciaDesc = `Custos estáveis - variação de ${variacaoMedia.toFixed(1)}%`;
          } else if (variacaoMedia <= 20) {
            consistenciaScore = 75;
            consistenciaStatus = 'good';
            consistenciaDesc = `Custos controlados - variação de ${variacaoMedia.toFixed(1)}%`;
          } else if (variacaoMedia <= 35) {
            consistenciaScore = 50;
            consistenciaStatus = 'warning';
            consistenciaDesc = `Custos variando ${variacaoMedia.toFixed(1)}% - atenção`;
          } else {
            consistenciaScore = 30;
            consistenciaStatus = 'critical';
            consistenciaDesc = `Alta variação de ${variacaoMedia.toFixed(1)}% nos custos`;
          }
        } else {
          consistenciaScore = 70;
          consistenciaStatus = 'good';
          consistenciaDesc = 'Poucos dados para análise';
        }
      }

      // 4. Controle de Estoque
      const { data: estoque } = await supabase
        .from('produtos')
        .select('estoque_atual, estoque_minimo')
        .eq('user_id', user.id)
        .eq('ativo', true);

      let estoqueScore = 0;
      let estoqueStatus: 'excellent' | 'good' | 'warning' | 'critical' = 'critical';
      let estoqueDesc = 'Sem controle de estoque';

      if (estoque && estoque.length > 0) {
        const produtosBaixos = estoque.filter(p => p.estoque_atual <= p.estoque_minimo).length;
        const percentualBaixo = (produtosBaixos / estoque.length) * 100;

        if (percentualBaixo === 0) {
          estoqueScore = 100;
          estoqueStatus = 'excellent';
          estoqueDesc = 'Todos os produtos com estoque adequado';
        } else if (percentualBaixo <= 10) {
          estoqueScore = 80;
          estoqueStatus = 'good';
          estoqueDesc = `${produtosBaixos} produto(s) com estoque baixo`;
        } else if (percentualBaixo <= 25) {
          estoqueScore = 60;
          estoqueStatus = 'warning';
          estoqueDesc = `${produtosBaixos} produto(s) precisam reabastecimento`;
        } else {
          estoqueScore = 40;
          estoqueStatus = 'critical';
          estoqueDesc = `${produtosBaixos} produto(s) críticos - reabasteça urgente`;
        }
      }

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
          precificacaoDesc = `${percentualPrecificado.toFixed(0)}% das receitas precificadas`;
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
  };

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

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; className: string }> = {
      excellent: { variant: 'default', className: 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400' },
      good: { variant: 'secondary', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400' },
      warning: { variant: 'secondary', className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400' },
      critical: { variant: 'destructive', className: 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400' }
    };

    return variants[status] || variants.critical;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="col-span-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Score de Saúde Financeira
          </CardTitle>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Info className="h-4 w-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="text-sm">
                  O Score analisa 5 pilares do seu negócio: margem de lucro, diversificação de produtos,
                  consistência de custos, controle de estoque e precificação. Quanto maior o score, mais
                  saudável está seu negócio financeiramente.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Score Geral */}
        <div className="flex items-center justify-center gap-8 p-6 bg-gradient-to-br from-primary/5 to-primary/10 rounded-lg">
          <div className="text-center">
            <div className={`text-6xl font-bold ${getScoreColor(overallScore)}`}>
              {overallScore}
            </div>
            <div className="text-sm text-muted-foreground mt-2">de 100 pontos</div>
          </div>
          <div className="text-center">
            <Badge className={getStatusBadge(
              overallScore >= 80 ? 'excellent' :
              overallScore >= 60 ? 'good' :
              overallScore >= 40 ? 'warning' : 'critical'
            ).className}>
              {getScoreLabel(overallScore)}
            </Badge>
            <div className="text-sm text-muted-foreground mt-2">Status Geral</div>
          </div>
        </div>

        {/* Métricas Individuais */}
        <div className="space-y-4">
          {metrics.map((metric) => (
            <div key={metric.name} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    {metric.icon}
                  </div>
                  <div>
                    <div className="font-medium">{metric.name}</div>
                    <div className="text-sm text-muted-foreground">{metric.description}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-lg font-bold ${getScoreColor(metric.score)}`}>
                    {metric.score}
                  </span>
                  <Badge className={getStatusBadge(metric.status).className}>
                    {metric.status === 'excellent' ? <CheckCircle2 className="h-3 w-3 mr-1" /> : 
                     metric.status === 'critical' ? <AlertCircle className="h-3 w-3 mr-1" /> : null}
                    {metric.score >= 80 ? 'Ótimo' :
                     metric.score >= 60 ? 'Bom' :
                     metric.score >= 40 ? 'Regular' : 'Crítico'}
                  </Badge>
                </div>
              </div>
              <Progress value={metric.score} className="h-2" />
            </div>
          ))}
        </div>

        {/* Dicas de Melhoria */}
        {overallScore < 80 && (
          <div className="p-4 bg-muted/50 rounded-lg border border-primary/20">
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Como melhorar seu score
            </h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              {metrics.filter(m => m.score < 70).map(m => (
                <li key={m.name}>• {m.name}: {m.description}</li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
