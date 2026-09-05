import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { CalendarDays, TrendingUp, DollarSign, Plus, Trash2, BarChart3 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import { useOptimizedUserConfigurations } from '@/hooks/useOptimizedUserConfigurations';
import { useToast } from '@/hooks/use-toast';
import { NumericInputPtBr } from '@/components/ui/numeric-input-ptbr';
import { formatters, formatNumber } from '@/lib/formatters';

interface FaturamentoHistorico {
  id: string;
  valor: number;
  mes: Date;
}

export function MediaFaturamento() {
  const [faturamentosHistoricos, setFaturamentosHistoricos] = useState<FaturamentoHistorico[]>([]);
  const [novoFaturamento, setNovoFaturamento] = useState({
    valor: '',
    mes: new Date().getMonth() + 1,
    ano: new Date().getFullYear()
  });
  const { loadConfiguration, saveConfiguration } = useOptimizedUserConfigurations();
  const { toast } = useToast();
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const carregarDados = async () => {
      try {
        const configFaturamentos = await loadConfiguration('faturamentos_historicos');
        if (configFaturamentos && Array.isArray(configFaturamentos)) {
          const faturamentos = configFaturamentos.map((f: any) => ({
            ...f,
            mes: new Date(f.mes)
          })).sort((a, b) => {
            const dateCompare = b.mes.getTime() - a.mes.getTime();
            if (dateCompare !== 0) return dateCompare;
            return parseInt(b.id) - parseInt(a.id);
          });
          setFaturamentosHistoricos(faturamentos);
        }
      } catch (error) {
        console.error('Erro ao carregar faturamentos:', error);
      }
    };
    carregarDados();
  }, [loadConfiguration]);

  const salvarFaturamentos = useCallback(async (faturamentos: FaturamentoHistorico[]) => {
    try {
      await saveConfiguration('faturamentos_historicos', faturamentos);
    } catch (error) {
      console.error('Erro ao salvar faturamentos:', error);
    }
  }, [saveConfiguration]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const formatCurrencyInput = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'decimal', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
  };

  const parseInputValue = (value: string) => {
    if (!value || value === '') return 0;
    const cleanValue = value.replace(/\./g, '').replace(',', '.');
    const parsed = parseFloat(cleanValue);
    return isNaN(parsed) ? 0 : Math.max(0, parsed);
  };

  const adicionarFaturamento = () => {
    if (!novoFaturamento.valor || !novoFaturamento.mes || !novoFaturamento.ano) {
      toast({ title: "Dados incompletos", description: "Preencha o valor, mês e ano", variant: "destructive" });
      return;
    }

    const valor = parseInputValue(novoFaturamento.valor);
    if (valor <= 0) {
      toast({ title: "Valor inválido", description: "O valor deve ser maior que zero", variant: "destructive" });
      return;
    }

    const dataFaturamento = new Date(novoFaturamento.ano, novoFaturamento.mes - 1, 1);
    const novoItem: FaturamentoHistorico = { id: Date.now().toString(), valor, mes: dataFaturamento };

    const novosFaturamentos = [...faturamentosHistoricos, novoItem]
      .sort((a, b) => {
        const dateCompare = b.mes.getTime() - a.mes.getTime();
        if (dateCompare !== 0) return dateCompare;
        return parseInt(b.id) - parseInt(a.id);
      });
    
    setFaturamentosHistoricos(novosFaturamentos);
    salvarFaturamentos(novosFaturamentos);
    setNovoFaturamento({ valor: '', mes: new Date().getMonth() + 1, ano: new Date().getFullYear() });
    toast({ title: "Faturamento adicionado", description: "Dados salvos com sucesso" });
  };

  const removerFaturamento = (id: string) => {
    const novosFaturamentos = faturamentosHistoricos.filter(f => f.id !== id);
    setFaturamentosHistoricos(novosFaturamentos);
    salvarFaturamentos(novosFaturamentos);
    toast({ title: "Faturamento removido", description: "Item removido com sucesso" });
  };

  const calcularEstatisticas = () => {    
    if (faturamentosHistoricos.length === 0) {
      return { mediaFaturamento: 0, totalFaturamento: 0 };
    }
    const valores = faturamentosHistoricos.map(f => f.valor);
    const totalFaturamento = valores.reduce((acc, valor) => acc + valor, 0);
    const mediaFaturamento = totalFaturamento / valores.length;
    return { mediaFaturamento, totalFaturamento };
  };

  const { mediaFaturamento, totalFaturamento } = calcularEstatisticas();

  const dadosGrafico = faturamentosHistoricos
    .slice(0, 6)
    .reverse()
    .map(f => ({
      mes: format(f.mes, "MMM/yy", { locale: ptBR }),
      valor: f.valor,
      valorFormatado: formatCurrency(f.valor)
    }));

  const chartConfig = {
    valor: { label: "Faturamento", color: "hsl(var(--primary))" },
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Formulário */}
      <Card className="glass-card overflow-hidden">
        <div className="h-1 bg-gradient-brand-horizontal" />
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-display">Lançar Faturamento</CardTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            Adicione os faturamentos mensais que já aconteceram
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Valor do Faturamento</Label>
              <NumericInputPtBr
                tipo="valor"
                value={parseInputValue(novoFaturamento.valor)}
                onChange={(valor) => setNovoFaturamento({ ...novoFaturamento, valor: formatCurrencyInput(valor) })}
                min={0}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Mês/Ano</Label>
              <div className="grid grid-cols-2 gap-2">
                <Select 
                  value={novoFaturamento.mes.toString()} 
                  onValueChange={(value) => setNovoFaturamento({ ...novoFaturamento, mes: parseInt(value) })}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Mês" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Jan</SelectItem>
                    <SelectItem value="2">Fev</SelectItem>
                    <SelectItem value="3">Mar</SelectItem>
                    <SelectItem value="4">Abr</SelectItem>
                    <SelectItem value="5">Mai</SelectItem>
                    <SelectItem value="6">Jun</SelectItem>
                    <SelectItem value="7">Jul</SelectItem>
                    <SelectItem value="8">Ago</SelectItem>
                    <SelectItem value="9">Set</SelectItem>
                    <SelectItem value="10">Out</SelectItem>
                    <SelectItem value="11">Nov</SelectItem>
                    <SelectItem value="12">Dez</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  value={novoFaturamento.ano}
                  onChange={(e) => setNovoFaturamento({ ...novoFaturamento, ano: parseInt(e.target.value) || new Date().getFullYear() })}
                  placeholder="Ano"
                  min="2020"
                  max="2030"
                  className="h-9 text-sm"
                />
              </div>
            </div>

            <Button onClick={adicionarFaturamento} className="h-9 gap-1.5 rounded-xl">
              <Plus className="h-3.5 w-3.5" />
              Adicionar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats + Gráfico */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Média Mensal */}
        <Card className="glass-card overflow-hidden group hover:shadow-elevated transition-all duration-300">
          <div className="h-1 bg-gradient-to-r from-[#0483e4] to-[#2c4dc7]" />
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-2 flex-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Média Mensal
                </p>
                <p className="break-words font-display text-2xl font-bold leading-tight text-foreground sm:text-3xl">
                  {formatters.valor(mediaFaturamento)}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-[#0483e4]/10 group-hover:scale-110 transition-transform">
                <TrendingUp className="h-6 w-6 text-[#0483e4]" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Total */}
        <Card className="glass-card overflow-hidden group hover:shadow-elevated transition-all duration-300">
          <div className="h-1 bg-gradient-to-r from-[#16a34a] to-[#15803d]" />
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-2 flex-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Total do Período
                </p>
                <p className="break-words font-display text-2xl font-bold leading-tight text-foreground sm:text-3xl">
                  {formatters.valor(totalFaturamento)}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-[#16a34a]/10 group-hover:scale-110 transition-transform">
                <DollarSign className="h-6 w-6 text-[#16a34a]" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lançamentos */}
        <Card className="glass-card overflow-hidden group hover:shadow-elevated transition-all duration-300">
          <div className="h-1 bg-gradient-to-r from-[#7328b1] to-[#af1188]" />
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-2 flex-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Lançamentos
                </p>
                <p className="font-display text-2xl font-bold leading-tight text-foreground sm:text-3xl">
                  {faturamentosHistoricos.length}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-[#7328b1]/10 group-hover:scale-110 transition-transform">
                <CalendarDays className="h-6 w-6 text-[#7328b1]" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico */}
      <Card className="glass-card overflow-hidden">
        <div className="h-1 bg-gradient-brand-horizontal" />
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-display">Evolução do Faturamento</CardTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            Últimos 6 meses lançados
          </p>
        </CardHeader>
        <CardContent className="px-2 pb-4 pt-0 sm:px-6 sm:pb-6">
          <div className="h-64">
            {dadosGrafico.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-full w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dadosGrafico} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                    <XAxis 
                      dataKey="mes" 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                      interval={0}
                    />
                    <YAxis 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                      tickFormatter={(value) => `${formatNumber(value / 1000, 0)}k`}
                      width={40}
                    />
                    <ChartTooltip 
                      content={<ChartTooltipContent />}
                      formatter={(value: number) => [formatters.valor(value), "Faturamento"]}
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "12px",
                        padding: "8px 12px",
                        fontSize: "12px",
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="valor" 
                      stroke="#7328b1"
                      strokeWidth={3}
                      dot={{ fill: "#7328b1", strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6, stroke: "#7328b1", strokeWidth: 2, fill: "hsl(var(--card))" }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <div className="text-center space-y-2">
                  <BarChart3 className="h-10 w-10 mx-auto opacity-30" />
                  <p className="text-xs">Adicione faturamentos para ver o gráfico</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Lista de Faturamentos */}
      {faturamentosHistoricos.length > 0 && (
        <Card className="glass-card overflow-hidden">
          <div className="h-1 bg-gradient-brand-horizontal" />
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-display">Faturamentos Lançados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {faturamentosHistoricos.map((faturamento, i) => (
                <div 
                  key={faturamento.id} 
                  className="flex items-center justify-between p-3 rounded-xl bg-muted/50 border border-border/30 hover:border-border/60 transition-all animate-slide-up"
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-[#0483e4]/10">
                      <CalendarDays className="h-4 w-4 text-[#0483e4]" />
                    </div>
                    <div>
                      <p className="text-sm font-medium font-display">
                        {format(faturamento.mes, "MMMM 'de' yyyy", { locale: ptBR })}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatters.valor(faturamento.valor)}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removerFaturamento(faturamento.id)}
                    className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10 rounded-xl"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {faturamentosHistoricos.length === 0 && (
        <Card className="glass-card overflow-hidden">
          <div className="h-1 bg-gradient-brand-horizontal" />
          <CardContent className="p-12 text-center">
            <CalendarDays className="h-10 w-10 text-muted-foreground mx-auto mb-4 opacity-30" />
            <h3 className="text-sm font-medium font-display mb-1">Nenhum faturamento lançado</h3>
            <p className="text-xs text-muted-foreground">
              Adicione seus faturamentos mensais para calcular a média histórica
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
