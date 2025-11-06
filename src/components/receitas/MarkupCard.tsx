import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, Info, Check } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { formatBRL, formatNumber } from '@/lib/formatters';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface MarkupDetalhado {
  periodo: string;
  gastoSobreFaturamento: number;
  impostos: number;
  taxas: number;
  comissoes: number;
  outros: number;
  valorEmReal: number;
  lucroDesejado: number;
  markupIdeal: number;
}

interface MarkupCardProps {
  markup: any;
  custoTotal: number;
  precoVenda: number;
  isSelected: boolean;
  onSelect: () => void;
  alwaysExpanded?: boolean;
}

export function MarkupCard({ 
  markup, 
  custoTotal, 
  precoVenda, 
  isSelected, 
  onSelect,
  alwaysExpanded = false 
}: MarkupCardProps) {
  const [expanded, setExpanded] = useState(alwaysExpanded || isSelected);
  const [detalhes, setDetalhes] = useState<MarkupDetalhado | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (alwaysExpanded) {
      setExpanded(true);
    } else if (isSelected) {
      setExpanded(true);
    }
  }, [isSelected, alwaysExpanded]);

  // Carregar detalhes do markup de user_configurations
  useEffect(() => {
    const carregarDetalhes = async () => {
      if (!user) return;
      
      try {
        const configKey = `markup_${markup.nome.toLowerCase().replace(/\s+/g, '_')}`;
        
        const { data, error } = await supabase
          .from('user_configurations')
          .select('configuration')
          .eq('user_id', user.id)
          .eq('type', configKey)
          .maybeSingle();
        
        if (error) {
          console.error('Erro ao carregar detalhes do markup:', error);
          return;
        }
        
        if (data?.configuration) {
          const config = data.configuration as unknown as MarkupDetalhado;
          
          // Verificar se faltam campos e completar com dados do markup base
          if (config.lucroDesejado === undefined || config.markupIdeal === undefined) {
            console.log('⚠️ Dados incompletos no tooltip, usando dados do markup base');
            setDetalhes({
              ...config,
              lucroDesejado: config.lucroDesejado ?? markup.margem_lucro,
              markupIdeal: config.markupIdeal ?? markup.markup_ideal
            });
          } else {
            setDetalhes(config);
          }
        }
      } catch (error) {
        console.error('Erro ao carregar detalhes:', error);
      }
    };
    
    carregarDetalhes();
  }, [user, markup.nome, markup.margem_lucro, markup.markup_ideal]);

  // Real-time updates para detalhes do markup
  useEffect(() => {
    if (!user) return;
    
    const configKey = `markup_${markup.nome.toLowerCase().replace(/\s+/g, '_')}`;
    
    const channel = supabase
      .channel(`markup-details-${markup.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_configurations',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          if (payload.new && (payload.new as any).type === configKey) {
            setDetalhes((payload.new as any).configuration as unknown as MarkupDetalhado);
          }
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, markup.id, markup.nome]);

  // Sugestão de preço = custo × markup ideal (para atingir margem desejada)
  const precoSugerido = custoTotal * markup.markup_ideal;
  
  // Markup aplicado = preço atual / custo (o que está sendo praticado)
  const markupAplicado = custoTotal > 0 ? precoVenda / custoTotal : 0;
  
  // Lucro bruto baseado no PREÇO ATUAL digitado
  const lucroBruto = precoVenda - custoTotal;
  const margemBruta = precoVenda > 0 ? (lucroBruto / precoVenda) * 100 : 0;
  
  // Lucro líquido = lucro bruto × margem de lucro configurada
  const lucroLiquido = lucroBruto * (markup.margem_lucro / 100);
  const margemLiquida = precoVenda > 0 ? (lucroLiquido / precoVenda) * 100 : 0;

  return (
    <Card className={cn(
      "transition-all duration-200",
      isSelected 
        ? 'border-primary border-2 bg-primary/5 shadow-lg shadow-primary/20' 
        : 'hover:border-muted-foreground/20'
    )}>
      <CardHeader 
        className={alwaysExpanded ? "" : "cursor-pointer"} 
        onClick={alwaysExpanded ? undefined : () => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base">{markup.nome}</CardTitle>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent className="max-w-md p-4">
                  <div className="space-y-3 text-sm">
                    <div className="font-semibold text-base border-b pb-2">Configurações do Markup</div>
                    
                    {detalhes ? (
                      <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                        <div className="text-muted-foreground">Período:</div>
                        <div className="font-medium text-right">
                          Últimos {detalhes.periodo === 'todos' ? 'todos' : detalhes.periodo} meses
                        </div>
                        
                        <div className="text-muted-foreground">Gastos sobre faturamento:</div>
                        <div className="font-medium text-right">{formatNumber(detalhes.gastoSobreFaturamento ?? 0, 2)}%</div>
                        
                        <div className="text-muted-foreground">Impostos:</div>
                        <div className="font-medium text-right">{formatNumber(detalhes.impostos ?? 0, 2)}%</div>
                        
                        <div className="text-muted-foreground">Taxas de meios de pagamento:</div>
                        <div className="font-medium text-right">{formatNumber(detalhes.taxas ?? 0, 2)}%</div>
                        
                        <div className="text-muted-foreground">Comissões e plataformas:</div>
                        <div className="font-medium text-right">{formatNumber(detalhes.comissoes ?? 0, 2)}%</div>
                        
                        <div className="text-muted-foreground">Outros:</div>
                        <div className="font-medium text-right">{formatNumber(detalhes.outros ?? 0, 2)}%</div>
                        
                        <div className="text-muted-foreground">Valor em real:</div>
                        <div className="font-medium text-right">R$ {formatBRL(detalhes.valorEmReal ?? 0)}</div>
                        
                        <div className="text-muted-foreground">Lucro desejado sobre vendas:</div>
                        <div className="font-medium text-right">{formatNumber(detalhes.lucroDesejado ?? 0, 2)}%</div>
                        
                        <div className="font-semibold text-primary pt-2 border-t">Markup Ideal:</div>
                        <div className="font-bold text-primary text-right pt-2 border-t">
                          {formatNumber(detalhes.markupIdeal ?? 0, 4)}
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                        <div className="text-muted-foreground">Período:</div>
                        <div className="font-medium text-right">Últimos {markup.periodo} meses</div>
                        
                        <div className="text-muted-foreground">Gasto sobre Faturamento:</div>
                        <div className="font-medium text-right">{formatNumber(markup.gasto_sobre_faturamento, 2)}%</div>
                        
                        <div className="text-muted-foreground">Encargos sobre Venda:</div>
                        <div className="font-medium text-right">{formatNumber(markup.encargos_sobre_venda, 2)}%</div>
                        
                        <div className="text-muted-foreground">Lucro Desejado:</div>
                        <div className="font-medium text-right">{formatNumber(markup.margem_lucro, 2)}%</div>
                        
                        <div className="font-semibold text-primary pt-2 border-t">Markup Ideal:</div>
                        <div className="font-bold text-primary text-right pt-2 border-t">
                          {formatNumber(markup.markup_ideal, 4)}
                        </div>
                      </div>
                    )}
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{markup.tipo}</Badge>
            <Badge variant="secondary">{markup.periodo} meses</Badge>
            {isSelected && (
              <Badge className="bg-primary text-primary-foreground font-semibold flex items-center gap-1">
                <Check className="h-3 w-3" />
                Selecionado
              </Badge>
            )}
            {!alwaysExpanded && (expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />)}
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <Card className="bg-purple-50 dark:bg-purple-950">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  Markup da Categoria
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {formatNumber(markup.markup_ideal, 4)}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-purple-50 dark:bg-purple-950">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  Markup Aplicado
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {formatNumber(markupAplicado, 4)}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-blue-50 dark:bg-blue-950">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  Sugestão de Preço
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  R$ {formatBRL(precoSugerido)}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
              <span className="font-medium">Lucro Bruto (un.)</span>
              <div className="text-right">
                <span className="font-bold text-green-600">R$ {formatBRL(lucroBruto)}</span>
                <span className="text-muted-foreground ml-2">({formatNumber(margemBruta, 1)}%)</span>
              </div>
            </div>

            <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
              <span className="font-medium">Lucro Líq. Real (un.)</span>
              <div className="text-right">
                <span className="font-bold text-green-600">R$ {formatBRL(lucroLiquido)}</span>
                <span className="text-muted-foreground ml-2">({formatNumber(margemLiquida, 1)}%)</span>
              </div>
            </div>

            <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
              <span className="font-medium">Faturamento Bruto (total)</span>
              <div className="text-right">
                <span className="font-bold">R$ {formatBRL(precoSugerido)}</span>
                <span className="text-muted-foreground ml-2">(100%)</span>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant={isSelected ? "default" : "outline"}
              onClick={onSelect}
            >
              {isSelected ? 'Selecionado' : 'Selecionar'}
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
