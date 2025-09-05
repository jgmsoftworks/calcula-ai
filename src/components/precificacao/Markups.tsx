import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Calculator, Percent, Target } from 'lucide-react';

export function Markups() {
  const [custosProduto, setCustosProduto] = useState('');
  const [markupDesejado, setMarkupDesejado] = useState('');
  const [margemDesejada, setMargemDesejada] = useState('');

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatCurrencyInput = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'decimal',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  const formatPercentageNumber = (value: number) => {
    if (value === 0) return '';
    if (value % 1 === 0) {
      return new Intl.NumberFormat('pt-BR', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(value);
    }
    return new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(value);
  };

  const parseInputValue = (value: string) => {
    if (!value || value === '') return 0;
    const cleanValue = value.replace(/\./g, '').replace(',', '.');
    const parsed = parseFloat(cleanValue);
    return isNaN(parsed) ? 0 : Math.max(0, parsed);
  };

  const handleValueChange = (field: string, inputValue: string) => {
    const numericValue = inputValue.replace(/\D/g, '');
    const numberValue = parseInt(numericValue || '0') / 100;
    const formattedValue = formatCurrencyInput(numberValue);
    
    if (field === 'custosProduto') {
      setCustosProduto(formattedValue);
    }
  };

  const handlePercentageChange = (field: string, inputValue: string) => {
    const numericValue = inputValue.replace(/\D/g, '');
    const numberValue = parseInt(numericValue || '0') / 100;
    const formattedValue = formatPercentageNumber(numberValue);
    
    if (field === 'markupDesejado') {
      setMarkupDesejado(formattedValue);
    } else if (field === 'margemDesejada') {
      setMargemDesejada(formattedValue);
    }
  };

  const calcularPrecificacao = () => {
    const custos = parseInputValue(custosProduto);
    const markup = parseInputValue(markupDesejado);
    const margem = parseInputValue(margemDesejada);

    // Cálculo com Markup
    const precoVendaMarkup = custos * (1 + markup / 100);
    const margemObtidaMarkup = markup;

    // Cálculo com Margem
    const precoVendaMargem = margem > 0 ? custos / (1 - margem / 100) : 0;
    const markupObtidoMargem = margem > 0 ? ((precoVendaMargem - custos) / custos) * 100 : 0;

    return {
      precoVendaMarkup,
      margemObtidaMarkup,
      precoVendaMargem,
      markupObtidoMargem
    };
  };

  const { precoVendaMarkup, margemObtidaMarkup, precoVendaMargem, markupObtidoMargem } = calcularPrecificacao();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-primary mb-1">
            Cálculo de Markups
          </CardTitle>
          <p className="text-muted-foreground text-sm">
            Configure os custos e margens para calcular os preços de venda
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label htmlFor="custos-produto">Custos do produto</Label>
              <Input
                id="custos-produto"
                type="text"
                value={custosProduto}
                onChange={(e) => handleValueChange('custosProduto', e.target.value)}
                placeholder="0,00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="markup-desejado">Markup desejado (%)</Label>
              <div className="relative">
                <Input
                  id="markup-desejado"
                  type="text"
                  value={markupDesejado}
                  onChange={(e) => handlePercentageChange('markupDesejado', e.target.value)}
                  placeholder="0"
                  className="pr-8"
                />
                <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-muted-foreground">
                  %
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="margem-desejada">Margem desejada (%)</Label>
              <div className="relative">
                <Input
                  id="margem-desejada"
                  type="text"
                  value={margemDesejada}
                  onChange={(e) => handlePercentageChange('margemDesejada', e.target.value)}
                  placeholder="0"
                  className="pr-8"
                />
                <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-muted-foreground">
                  %
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resultados */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cálculo por Markup */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Cálculo por Markup
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-muted/30 rounded">
              <span className="text-sm font-medium">Preço de venda:</span>
              <span className="text-lg font-bold text-primary">
                {formatCurrency(precoVendaMarkup)}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-muted/30 rounded">
              <span className="text-sm font-medium">Margem obtida:</span>
              <span className="text-lg font-bold text-green-600">
                {formatPercentageNumber(margemObtidaMarkup)}%
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Cálculo por Margem */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="h-5 w-5" />
              Cálculo por Margem
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-muted/30 rounded">
              <span className="text-sm font-medium">Preço de venda:</span>
              <span className="text-lg font-bold text-primary">
                {formatCurrency(precoVendaMargem)}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-muted/30 rounded">
              <span className="text-sm font-medium">Markup obtido:</span>
              <span className="text-lg font-bold text-blue-600">
                {formatPercentageNumber(markupObtidoMargem)}%
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Informações */}
      <Card>
        <CardContent className="p-6">
          <div className="space-y-3">
            <h3 className="font-semibold text-sm">Diferenças entre Markup e Margem:</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-muted-foreground">
              <div>
                <p className="font-medium text-foreground mb-1">Markup:</p>
                <p>Percentual aplicado sobre o custo do produto para formar o preço de venda.</p>
              </div>
              <div>
                <p className="font-medium text-foreground mb-1">Margem:</p>
                <p>Percentual de lucro em relação ao preço de venda final.</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}