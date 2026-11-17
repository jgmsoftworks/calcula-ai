import type { FaturamentoPersistido } from '@/types/configurations';
import { localizeText } from '@/i18n/localizeText';
import { useTranslation as usePortugalTranslation } from 'react-i18next';
import { getBusinessRegion } from '@/lib/business-region';
import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { CalendarDays, TrendingUp, DollarSign, Plus, Trash2, BarChart3, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { AreaChart, Area, CartesianGrid, XAxis, YAxis } from 'recharts';
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
  usePortugalTranslation();
  const [faturamentosHistoricos, setFaturamentosHistoricos] = useState<FaturamentoHistorico[]>([]);
  const [novoFaturamento, setNovoFaturamento] = useState({
    valor: '',
    mes: new Date().getMonth() + 1,
    ano: new Date().getFullYear()
  });
  const { loadConfiguration, saveConfiguration } = useOptimizedUserConfigurations();
  const { toast } = useToast();
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    let cancelado = false;
    const carregarDados = async () => {
      setCarregando(true);
      setFaturamentosHistoricos([]);
      try {
        const configFaturamentos = await loadConfiguration<FaturamentoPersistido[]>('faturamentos_historicos');
        if (configFaturamentos && Array.isArray(configFaturamentos)) {
          const faturamentos = configFaturamentos.map((f) => ({
            ...f,
            mes: new Date(f.mes)
          })).sort((a, b) => {
            const dateCompare = b.mes.getTime() - a.mes.getTime();
            if (dateCompare !== 0) return dateCompare;
            return parseInt(b.id) - parseInt(a.id);
          });
          if (!cancelado) setFaturamentosHistoricos(faturamentos);
        }
      } catch (error) {
        console.error('Erro ao carregar faturamentos:', error);
      } finally {
        if (!cancelado) setCarregando(false);
      }
    };
    carregarDados();
    return () => { cancelado = true; };
  }, [loadConfiguration]);

  const salvarFaturamentos = useCallback(async (faturamentos: FaturamentoHistorico[]) => {
    setSalvando(true);
    try {
      await saveConfiguration('faturamentos_historicos', faturamentos);
      setFaturamentosHistoricos(faturamentos);
      return true;
    } catch {
      toast({ title: localizeText('Não foi possível salvar'), description: 'Tente novamente. Seus lançamentos foram mantidos.', variant: 'destructive' });
      return false;
    } finally {
      setSalvando(false);
    }
  }, [saveConfiguration, toast]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat(getBusinessRegion().locale, { style: 'currency', currency: getBusinessRegion().currency }).format(value);
  };

  const formatCurrencyInput = (value: number) => {
    return new Intl.NumberFormat(getBusinessRegion().locale, { style: 'decimal', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
  };

  const parseInputValue = (value: string) => {
    if (!value || value === '') return 0;
    const cleanValue = value.replace(/\./g, '').replace(',', '.');
    const parsed = parseFloat(cleanValue);
    return isNaN(parsed) ? 0 : Math.max(0, parsed);
  };

  const adicionarFaturamento = async () => {
    if (carregando || salvando) return;
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
    
    if (!await salvarFaturamentos(novosFaturamentos)) return;
    setNovoFaturamento({ valor: '', mes: new Date().getMonth() + 1, ano: new Date().getFullYear() });
    toast({ title: localizeText("Faturamento adicionado"), description: localizeText("Dados salvos com sucesso") });
  };

  const removerFaturamento = async (id: string) => {
    if (carregando || salvando) return;
    const novosFaturamentos = faturamentosHistoricos.filter(f => f.id !== id);
    if (!await salvarFaturamentos(novosFaturamentos)) return;
    toast({ title: localizeText("Faturamento removido"), description: "Item removido com sucesso" });
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
    valor: { label: localizeText("Faturamento"), color: "hsl(var(--primary))" },
  };

  const ocupado = carregando || salvando;

  return (
    <div className="mx-auto w-full max-w-7xl space-y-5 animate-fade-in">
      <div className="grid gap-3 sm:grid-cols-3" aria-label="Resumo do faturamento">
        {[
          { label: 'Média mensal', value: formatters.valor(mediaFaturamento), icon: TrendingUp },
          { label: 'Total registrado', value: formatters.valor(totalFaturamento), icon: DollarSign },
          { label: 'Lançamentos', value: formatNumber(faturamentosHistoricos.length), icon: CalendarDays },
        ].map(({ label, value, icon: Icon }, index) => (
          <Card key={label} className={`rounded-2xl border shadow-sm ${index === 0 ? 'border-primary/20 bg-primary/5' : 'border-border/60 bg-card'}`}>
            <CardContent className="flex items-center gap-4 p-5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><Icon className="h-5 w-5" /></span>
              <div className="min-w-0">
                <p className="text-xs font-medium text-muted-foreground">{localizeText(label)}</p>
                <p className="mt-1 break-words text-xl font-semibold tracking-tight tabular-nums sm:text-2xl">{carregando ? '—' : value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid items-stretch gap-5 lg:grid-cols-[minmax(280px,0.8fr)_minmax(0,1.6fr)]">
        <Card className="min-w-0 rounded-2xl border-border/60 bg-card shadow-sm">
          <CardHeader className="space-y-1 pb-5">
            <CardTitle className="text-base font-semibold">{localizeText('Novo lançamento')}</CardTitle>
            <p className="text-sm text-muted-foreground">{localizeText('Registre o faturamento de cada mês.')}</p>
          </CardHeader>
          <CardContent>
            <form className="space-y-5" onSubmit={event => { event.preventDefault(); void adicionarFaturamento(); }}>
              <div className="space-y-2">
                <Label htmlFor="faturamento-valor">{localizeText('Valor do faturamento')}</Label>
                <NumericInputPtBr id="faturamento-valor" tipo="valor" value={parseInputValue(novoFaturamento.valor)}
                  onChange={valor => setNovoFaturamento({ ...novoFaturamento, valor: formatCurrencyInput(valor) })}
                  min={0} disabled={ocupado} className="h-12 text-lg font-semibold" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="faturamento-mes">Mês</Label>
                  <Select value={novoFaturamento.mes.toString()} disabled={ocupado}
                    onValueChange={value => setNovoFaturamento({ ...novoFaturamento, mes: parseInt(value) })}>
                    <SelectTrigger id="faturamento-mes" className="h-11"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'].map((mes, i) => (
                        <SelectItem key={mes} value={String(i + 1)}>{mes}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="faturamento-ano">Ano</Label>
                  <Input id="faturamento-ano" type="number" value={novoFaturamento.ano} disabled={ocupado}
                    onChange={event => setNovoFaturamento({ ...novoFaturamento, ano: parseInt(event.target.value) || new Date().getFullYear() })}
                    min="2020" max="2030" className="h-11" />
                </div>
              </div>
              <Button type="submit" disabled={ocupado} className="h-11 w-full gap-2 rounded-xl">
                {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                {salvando ? 'Salvando…' : 'Adicionar lançamento'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="min-w-0 rounded-2xl border-border/60 bg-card shadow-sm">
          <CardHeader className="space-y-1 pb-2">
            <CardTitle className="text-base font-semibold">{localizeText('Evolução do faturamento')}</CardTitle>
            <p className="text-sm text-muted-foreground">Últimos 6 lançamentos</p>
          </CardHeader>
          <CardContent className="px-3 pb-4 sm:px-6">
            {dadosGrafico.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-[250px] w-full" aria-label="Gráfico dos últimos seis lançamentos">
                <AreaChart accessibilityLayer data={dadosGrafico} margin={{ left: 0, right: 12, top: 20, bottom: 0 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 5" />
                  <XAxis dataKey="mes" tickLine={false} axisLine={false} tickMargin={12} minTickGap={20} />
                  <YAxis tickLine={false} axisLine={false} width={64} tickFormatter={value => new Intl.NumberFormat(getBusinessRegion().locale, { notation: 'compact', maximumFractionDigits: 1 }).format(value)} />
                  <ChartTooltip content={<ChartTooltipContent formatter={value => formatCurrency(Number(value))} />} />
                  <Area type="monotone" dataKey="valor" stroke="var(--color-valor)" fill="var(--color-valor)" fillOpacity={0.08} strokeWidth={2.5}
                    dot={{ r: 4, fill: 'var(--color-valor)', strokeWidth: 2, stroke: 'hsl(var(--card))' }} activeDot={{ r: 5 }} />
                </AreaChart>
              </ChartContainer>
            ) : (
              <div className="flex h-[250px] flex-col items-center justify-center gap-3 text-center text-muted-foreground">
                <BarChart3 className="h-8 w-8 text-primary/50" />
                <p className="max-w-64 text-sm">{carregando ? 'Carregando faturamento…' : 'Seus lançamentos aparecerão aqui.'}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="overflow-hidden rounded-2xl border-border/60 bg-card shadow-sm">
        <CardHeader className="flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-base font-semibold">Histórico de lançamentos</CardTitle>
          <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium tabular-nums text-primary">{faturamentosHistoricos.length}</span>
        </CardHeader>
        {faturamentosHistoricos.length > 0 ? (
          <div className="max-h-[420px] overflow-y-auto overscroll-contain">
            <table className="w-full text-sm" aria-label="Lançamentos de faturamento">
              <thead className="sticky top-0 bg-muted/95 text-xs text-muted-foreground">
                <tr><th scope="col" className="px-4 py-3 text-left font-medium sm:px-6">Mês de referência</th>
                  <th scope="col" className="px-2 py-3 text-right font-medium">Faturamento</th>
                  <th scope="col" className="w-14 px-2 py-3"><span className="sr-only">Ações</span></th></tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {faturamentosHistoricos.map(faturamento => {
                  const mes = format(faturamento.mes, 'MMMM/yyyy', { locale: ptBR });
                  return <tr key={faturamento.id} className="transition-colors hover:bg-muted/30">
                    <th scope="row" className="px-4 py-4 text-left font-medium capitalize sm:px-6">{mes}</th>
                    <td className="px-2 py-4 text-right font-semibold tabular-nums">{formatCurrency(faturamento.valor)}</td>
                    <td className="px-2 py-3"><Button variant="ghost" size="icon" type="button" disabled={ocupado}
                      aria-label={`Excluir lançamento de ${mes} de ${formatCurrency(faturamento.valor)}`}
                      onClick={() => void removerFaturamento(faturamento.id)}
                      className="h-9 w-9 rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                      <Trash2 className="h-4 w-4" /></Button></td>
                  </tr>;
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div role="status" className="flex flex-col items-center gap-3 border-t border-border/50 px-6 py-10 text-center">
            <span className="rounded-2xl bg-primary/5 p-3 text-primary"><CalendarDays className="h-6 w-6" /></span>
            <p className="text-sm text-muted-foreground">{carregando ? 'Carregando lançamentos…' : 'Nenhum lançamento registrado. Adicione o primeiro acima.'}</p>
          </div>
        )}
      </Card>
    </div>
  );
}
