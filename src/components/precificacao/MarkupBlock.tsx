import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calculator, Edit2, Trash2, Check, X, Settings, ChevronDown } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { calcMarkup } from '@/utils/calcMarkup';

type MarkupPeriod = 'THREE_MONTHS' | 'SIX_MONTHS' | 'TWELVE_MONTHS' | 'ALL';

interface MarkupCalculation {
  gastoSobreFaturamento: number;
  impostos: number;
  taxasMeiosPagamento: number;
  comissoesPlataformas: number;
  outros: number;
  valorEmReal: number;
}

interface MarkupBlockData {
  id: string;
  nome: string;
  lucroDesejado: number;
  period: MarkupPeriod;
}

interface MarkupBlockProps {
  block: MarkupBlockData;
  calculation: MarkupCalculation;
  onEditName: (id: string, newName: string) => void;
  onDelete: (id: string) => void;
  onUpdateProfit: (id: string, profit: number) => void;
  onOpenConfig: (id: string) => void;
  onChangePeriod: (id: string, period: MarkupPeriod) => void;
  currentPeriod: MarkupPeriod;
}

export function MarkupBlock({
  block,
  calculation,
  onEditName,
  onDelete,
  onUpdateProfit,
  onOpenConfig,
  onChangePeriod,
  currentPeriod
}: MarkupBlockProps) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(block.nome);
  const [tempProfit, setTempProfit] = useState(block.lucroDesejado.toString());

  const handleNameSave = () => {
    if (tempName.trim()) {
      onEditName(block.id, tempName.trim());
    }
    setIsEditingName(false);
  };

  const handleNameCancel = () => {
    setTempName(block.nome);
    setIsEditingName(false);
  };

  const handleProfitChange = (value: string) => {
    const numValue = parseFloat(value) || 0;
    setTempProfit(value);
    onUpdateProfit(block.id, numValue);
  };

  const { totalPercent, effectiveMultiplier } = calcMarkup({
    percentFees: calculation.gastoSobreFaturamento / 100,
    percentTaxes: calculation.impostos / 100,
    percentPayment: calculation.taxasMeiosPagamento / 100,
    percentCommissions: calculation.comissoesPlataformas / 100,
    percentOthers: calculation.outros / 100,
    desiredProfit: block.lucroDesejado / 100,
    fixedValue: calculation.valorEmReal,
  });
  const markupTotal = (totalPercent * 100).toFixed(2);
  const markupIdeal = effectiveMultiplier;

  const getPeriodLabel = (period: MarkupPeriod) => {
    switch (period) {
      case 'THREE_MONTHS': return '3 meses';
      case 'SIX_MONTHS': return '6 meses';
      case 'TWELVE_MONTHS': return '12 meses';
      case 'ALL': return 'Todo período';
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  return (
    <Card className="border-l-4 border-l-primary">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          {isEditingName && block.id !== 'subreceita-fixo' ? (
            <div className="flex items-center gap-2 flex-1">
              <Input
                value={tempName}
                onChange={(e) => setTempName(e.target.value)}
                className="flex-1"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleNameSave();
                  if (e.key === 'Escape') handleNameCancel();
                }}
                autoFocus
              />
              <Button size="sm" onClick={handleNameSave}>
                <Check className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="outline" onClick={handleNameCancel}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              {block.nome}
              {block.id !== 'subreceita-fixo' && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setIsEditingName(true)}
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
              )}
            </CardTitle>
          )}
          
          <div className="flex items-center gap-2">
            {/* Dropdown para seleção de período - apenas para blocos que não são subreceita */}
            {block.id !== 'subreceita-fixo' && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    {getPeriodLabel(currentPeriod)}
                    <ChevronDown className="h-4 w-4 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                <DropdownMenuItem onClick={() => onChangePeriod(block.id, 'THREE_MONTHS')}>
                  3 meses
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onChangePeriod(block.id, 'SIX_MONTHS')}>
                  6 meses
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onChangePeriod(block.id, 'TWELVE_MONTHS')}>
                  12 meses
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onChangePeriod(block.id, 'ALL')}>
                  Todo período
                </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {block.id !== 'subreceita-fixo' && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onOpenConfig(block.id)}
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    Configurar custos
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

            {block.id !== 'subreceita-fixo' && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onDelete(block.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Componentes do Markup */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Gastos s/ Faturamento:</span>
            <Badge variant="outline">{calculation.gastoSobreFaturamento.toFixed(2)}%</Badge>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Impostos:</span>
            <Badge variant="outline">{calculation.impostos.toFixed(2)}%</Badge>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Taxas Pagamento:</span>
            <Badge variant="outline">{calculation.taxasMeiosPagamento.toFixed(2)}%</Badge>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Comissões:</span>
            <Badge variant="outline">{calculation.comissoesPlataformas.toFixed(2)}%</Badge>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Outros:</span>
            <Badge variant="outline">{calculation.outros.toFixed(2)}%</Badge>
          </div>
          {calculation.valorEmReal > 0 && (
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Valor Fixo:</span>
              <Badge variant="outline">{formatCurrency(calculation.valorEmReal)}</Badge>
            </div>
          )}
        </div>

        {/* Lucro Desejado */}
        {block.id !== 'subreceita-fixo' ? (
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <span className="text-sm font-medium">Lucro Desejado:</span>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={tempProfit}
                onChange={(e) => handleProfitChange(e.target.value)}
                className="w-20 text-center"
                min="0"
                step="0.1"
              />
              <span className="text-sm">%</span>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <span className="text-sm font-medium">Lucro Desejado:</span>
            <Badge variant="outline">0.00%</Badge>
          </div>
        )}

        {/* Markup Total e ideal */}
        <div className="border-t pt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Markup Total</span>
            <Badge variant="outline" className="text-base">{markupTotal}%</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-semibold">Markup ideal:</span>
            <Badge className="text-base font-bold">{markupIdeal.toFixed(4)}</Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}