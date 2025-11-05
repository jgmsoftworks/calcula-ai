import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, Info } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface MarkupCardProps {
  markup: any;
  custoTotal: number;
  isSelected: boolean;
  onSelect: () => void;
}

export function MarkupCard({ markup, custoTotal, isSelected, onSelect }: MarkupCardProps) {
  const [expanded, setExpanded] = useState(isSelected);

  const precoSugerido = custoTotal * markup.markup_aplicado;
  const lucroBruto = precoSugerido - custoTotal;
  const margemBruta = custoTotal > 0 ? (lucroBruto / precoSugerido) * 100 : 0;
  
  const lucroLiquido = lucroBruto * (markup.margem_lucro / 100);
  const margemLiquida = precoSugerido > 0 ? (lucroLiquido / precoSugerido) * 100 : 0;

  return (
    <Card className={isSelected ? 'border-primary' : ''}>
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
            {isSelected && <Badge className="bg-primary">Selecionado</Badge>}
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
                  {markup.markup_aplicado.toFixed(2)}
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
