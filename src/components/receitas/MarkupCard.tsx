import { useState } from 'react';
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

interface MarkupCardProps {
  markup: any;
  custoTotal: number;
  precoVenda: number;
  isSelected: boolean;
  onSelect: () => void;
}

export function MarkupCard({ markup, custoTotal, precoVenda, isSelected, onSelect }: MarkupCardProps) {
  const [expanded, setExpanded] = useState(isSelected);

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
      <CardHeader className="cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base">{markup.nome}</CardTitle>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent className="max-w-sm">
                  <div className="space-y-2 text-sm">
                    <div className="font-semibold">Configurações do Markup</div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>Período:</div>
                      <div>Últimos {markup.periodo} meses</div>
                      
                      <div>Gasto sobre Faturamento:</div>
                      <div>{markup.gasto_sobre_faturamento.toFixed(2)}%</div>
                      
                      <div>Encargos sobre Venda:</div>
                      <div>{markup.encargos_sobre_venda.toFixed(2)}%</div>
                      
                      <div>Lucro Desejado:</div>
                      <div>{markup.margem_lucro.toFixed(2)}%</div>
                      
                      <div className="font-semibold">Markup Ideal:</div>
                      <div className="font-semibold">{markup.markup_ideal.toFixed(2)}</div>
                    </div>
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
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
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
                  {markup.markup_ideal.toFixed(2)}
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
                  {markupAplicado.toFixed(2)}
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
                  R$ {precoSugerido.toFixed(2)}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
              <span className="font-medium">Lucro Bruto (un.)</span>
              <div className="text-right">
                <span className="font-bold text-green-600">R$ {lucroBruto.toFixed(2)}</span>
                <span className="text-muted-foreground ml-2">({margemBruta.toFixed(1)}%)</span>
              </div>
            </div>

            <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
              <span className="font-medium">Lucro Líq. Real (un.)</span>
              <div className="text-right">
                <span className="font-bold text-green-600">R$ {lucroLiquido.toFixed(2)}</span>
                <span className="text-muted-foreground ml-2">({margemLiquida.toFixed(1)}%)</span>
              </div>
            </div>

            <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
              <span className="font-medium">Faturamento Bruto (total)</span>
              <div className="text-right">
                <span className="font-bold">R$ {precoSugerido.toFixed(2)}</span>
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
