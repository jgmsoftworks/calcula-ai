import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calculator } from 'lucide-react';

interface MarkupCalculation {
  gastoSobreFaturamento: number;
  impostos: number;
  taxasMeiosPagamento: number;
  comissoesPlataformas: number;
  outros: number;
  valorEmReal: number;
}

interface SubreceitaBlockProps {
  calculation: MarkupCalculation;
  lucroDesejado?: number;
}

export function SubreceitaBlock({ calculation, lucroDesejado = 20 }: SubreceitaBlockProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  // Calcular markup ideal
  const totalPercentuais = calculation.gastoSobreFaturamento + calculation.impostos + 
    calculation.taxasMeiosPagamento + calculation.comissoesPlataformas + 
    calculation.outros + lucroDesejado;
  
  const markupIdeal = totalPercentuais > 0 ? (100 / (100 - totalPercentuais)) : 1;

  return (
    <Card className="border-l-4 border-l-primary">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-primary">
          <Calculator className="h-5 w-5" />
          Subreceita
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Calcule preços com base em custos e margem desejada
        </p>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Grid de valores principais */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Gasto sobre faturamento</p>
            <p className="text-2xl font-bold text-primary">{calculation.gastoSobreFaturamento.toFixed(0)}%</p>
          </div>
          
          <div>
            <p className="text-sm text-muted-foreground mb-1">Impostos</p>
            <p className="text-2xl font-bold text-primary">{calculation.impostos.toFixed(0)}%</p>
          </div>
          
          <div>
            <p className="text-sm text-muted-foreground mb-1">Taxas de meios de pagamento</p>
            <p className="text-2xl font-bold text-primary">{calculation.taxasMeiosPagamento.toFixed(0)}%</p>
          </div>
          
          <div>
            <p className="text-sm text-muted-foreground mb-1">Comissões e plataformas</p>
            <p className="text-2xl font-bold text-primary">{calculation.comissoesPlataformas.toFixed(0)}%</p>
          </div>
        </div>

        {/* Segunda linha de valores */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Outros</p>
            <p className="text-2xl font-bold text-primary">{calculation.outros.toFixed(0)}%</p>
          </div>
          
          <div>
            <p className="text-sm text-muted-foreground mb-1">Valor em real</p>
            <p className="text-2xl font-bold text-orange-500">{formatCurrency(calculation.valorEmReal)}</p>
          </div>
          
          <div>
            <p className="text-sm text-muted-foreground mb-1">Lucro desejado sobre venda</p>
            <p className="text-2xl font-bold text-pink-500">{lucroDesejado.toFixed(0)}%</p>
          </div>
        </div>

        {/* Markup ideal destacado */}
        <div className="border-t pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-lg font-medium text-primary mb-1">Markup ideal</p>
              <p className="text-sm text-muted-foreground">
                Multiplicador para aplicar sobre o custo do produto
              </p>
            </div>
            <div className="text-right">
              <p className="text-4xl font-bold text-primary">{markupIdeal.toFixed(2)}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}