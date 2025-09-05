import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { CalendarDays, TrendingUp, DollarSign } from 'lucide-react';

export function MediaFaturamento() {
  const [faturamento, setFaturamento] = useState({
    vendas_dia: '',
    ticket_medio: '',
    dias_funcionamento: '22'
  });

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
    
    setFaturamento({ ...faturamento, [field]: formattedValue });
  };

  const calcularMediaMensal = () => {
    const vendasDia = parseInputValue(faturamento.vendas_dia);
    const ticketMedio = parseInputValue(faturamento.ticket_medio);
    const diasFuncionamento = parseFloat(faturamento.dias_funcionamento) || 0;
    
    const faturamentoDiario = vendasDia * ticketMedio;
    const faturamentoMensal = faturamentoDiario * diasFuncionamento;
    
    return {
      faturamentoDiario,
      faturamentoMensal,
      vendasMensais: vendasDia * diasFuncionamento
    };
  };

  const { faturamentoDiario, faturamentoMensal, vendasMensais } = calcularMediaMensal();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-primary mb-1">
            Média de Faturamento
          </CardTitle>
          <p className="text-muted-foreground text-sm">
            Configure os dados do seu negócio para calcular a média de faturamento mensal
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label htmlFor="vendas-dia">Vendas por dia</Label>
              <div className="relative">
                <Input
                  id="vendas-dia"
                  type="number"
                  min="0"
                  step="1"
                  value={faturamento.vendas_dia}
                  onChange={(e) => setFaturamento({ ...faturamento, vendas_dia: e.target.value })}
                  placeholder="0"
                  className="pr-12"
                />
                <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-muted-foreground">
                  vendas
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ticket-medio">Ticket médio</Label>
              <Input
                id="ticket-medio"
                type="text"
                value={faturamento.ticket_medio}
                onChange={(e) => handleValueChange('ticket_medio', e.target.value)}
                placeholder="0,00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dias-funcionamento">Dias de funcionamento/mês</Label>
              <div className="relative">
                <Input
                  id="dias-funcionamento"
                  type="number"
                  min="1"
                  max="31"
                  value={faturamento.dias_funcionamento}
                  onChange={(e) => setFaturamento({ ...faturamento, dias_funcionamento: e.target.value })}
                  placeholder="22"
                  className="pr-12"
                />
                <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-muted-foreground">
                  dias
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resultados */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-5 w-5 text-primary" />
              <div className="space-y-1">
                <p className="text-sm font-medium leading-none">Faturamento Diário</p>
                <p className="text-2xl font-bold text-primary">
                  {formatCurrency(faturamentoDiario)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <div className="space-y-1">
                <p className="text-sm font-medium leading-none">Vendas Mensais</p>
                <p className="text-2xl font-bold text-primary">
                  {vendasMensais.toLocaleString('pt-BR')} vendas
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <CalendarDays className="h-5 w-5 text-primary" />
              <div className="space-y-1">
                <p className="text-sm font-medium leading-none">Faturamento Mensal</p>
                <p className="text-2xl font-bold text-primary">
                  {formatCurrency(faturamentoMensal)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}