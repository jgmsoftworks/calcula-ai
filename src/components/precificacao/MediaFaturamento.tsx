import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarDays, TrendingUp, DollarSign, Plus, Trash2 } from 'lucide-react';
import { format, subMonths, isAfter, isBefore, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useUserConfigurations } from '@/hooks/useUserConfigurations';
import { useToast } from '@/hooks/use-toast';

interface FaturamentoHistorico {
  id: string;
  valor: number;
  mes: Date;
}

export function MediaFaturamento() {
  const [faturamentosHistoricos, setFaturamentosHistoricos] = useState<FaturamentoHistorico[]>([]);
  const [filtroPeriodo, setFiltroPeriodo] = useState<string>('todos');
  const [novoFaturamento, setNovoFaturamento] = useState({
    valor: '',
    mes: new Date().getMonth() + 1,
    ano: new Date().getFullYear()
  });
  const { loadConfiguration, saveConfiguration } = useUserConfigurations();
  const { toast } = useToast();

  useEffect(() => {
    const carregarFaturamentos = async () => {
      const config = await loadConfiguration('faturamentos_historicos');
      if (config && Array.isArray(config)) {
        const faturamentos = config.map((f: any) => ({
          ...f,
          mes: new Date(f.mes)
        })).sort((a, b) => {
          // Primeiro ordena por data (mês/ano)
          const dateCompare = b.mes.getTime() - a.mes.getTime();
          if (dateCompare !== 0) return dateCompare;
          // Se a data for igual, ordena por ID (timestamp de criação) - mais recente primeiro
          return parseInt(b.id) - parseInt(a.id);
        });
        setFaturamentosHistoricos(faturamentos);
      }
    };
    carregarFaturamentos();
  }, [loadConfiguration]);

  const salvarFaturamentos = async (faturamentos: FaturamentoHistorico[]) => {
    await saveConfiguration('faturamentos_historicos', faturamentos);
  };

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

  const handleValueChange = (inputValue: string) => {
    const numericValue = inputValue.replace(/\D/g, '');
    const numberValue = parseInt(numericValue || '0') / 100;
    const formattedValue = formatCurrencyInput(numberValue);
    
    setNovoFaturamento({ ...novoFaturamento, valor: formattedValue });
  };

  const adicionarFaturamento = () => {
    if (!novoFaturamento.valor || !novoFaturamento.mes || !novoFaturamento.ano) {
      toast({
        title: "Dados incompletos",
        description: "Preencha o valor, mês e ano",
        variant: "destructive"
      });
      return;
    }

    const valor = parseInputValue(novoFaturamento.valor);
    if (valor <= 0) {
      toast({
        title: "Valor inválido",
        description: "O valor deve ser maior que zero",
        variant: "destructive"
      });
      return;
    }

    const dataFaturamento = new Date(novoFaturamento.ano, novoFaturamento.mes - 1, 1);

    const novoItem: FaturamentoHistorico = {
      id: Date.now().toString(),
      valor,
      mes: dataFaturamento
    };

    const novosFaturamentos = [...faturamentosHistoricos, novoItem]
      .sort((a, b) => b.mes.getTime() - a.mes.getTime());
    
    setFaturamentosHistoricos(novosFaturamentos);
    salvarFaturamentos(novosFaturamentos);
    setNovoFaturamento({ 
      valor: '', 
      mes: new Date().getMonth() + 1, 
      ano: new Date().getFullYear() 
    });
    
    toast({
      title: "Faturamento adicionado",
      description: "Dados salvos com sucesso"
    });
  };

  const removerFaturamento = (id: string) => {
    const novosFaturamentos = faturamentosHistoricos.filter(f => f.id !== id);
    setFaturamentosHistoricos(novosFaturamentos);
    salvarFaturamentos(novosFaturamentos);
    
    toast({
      title: "Faturamento removido",
      description: "Item removido com sucesso"
    });
  };

  const getFaturamentosFiltrados = () => {
    if (filtroPeriodo === 'todos') return faturamentosHistoricos;

    // Ordena por data mais recente primeiro, e por ID (timestamp) para mesmo mês
    const faturamentosOrdenados = [...faturamentosHistoricos]
      .sort((a, b) => {
        // Primeiro ordena por data (mês/ano)
        const dateCompare = b.mes.getTime() - a.mes.getTime();
        if (dateCompare !== 0) return dateCompare;
        // Se a data for igual, ordena por ID (timestamp de criação) - mais recente primeiro
        return parseInt(b.id) - parseInt(a.id);
      });

    let quantidade: number;

    switch (filtroPeriodo) {
      case '1':
        quantidade = 1;
        break;
      case '3':
        quantidade = 3;
        break;
      case '6':
        quantidade = 6;
        break;
      case '12':
        quantidade = 12;
        break;
      default:
        return faturamentosHistoricos;
    }

    // Retorna apenas a quantidade especificada dos últimos lançamentos
    return faturamentosOrdenados.slice(0, quantidade);
  };

  const calcularEstatisticas = () => {
    const faturamentosFiltrados = getFaturamentosFiltrados();
    
    if (faturamentosFiltrados.length === 0) {
      return {
        mediaFaturamento: 0,
        totalFaturamento: 0,
        maiorFaturamento: 0,
        menorFaturamento: 0,
        quantidadeMeses: 0
      };
    }

    const valores = faturamentosFiltrados.map(f => f.valor);
    const totalFaturamento = valores.reduce((acc, valor) => acc + valor, 0);
    const mediaFaturamento = totalFaturamento / valores.length;
    const maiorFaturamento = Math.max(...valores);
    const menorFaturamento = Math.min(...valores);

    return {
      mediaFaturamento,
      totalFaturamento,
      maiorFaturamento,
      menorFaturamento,
      quantidadeMeses: valores.length
    };
  };

  const { mediaFaturamento, totalFaturamento, maiorFaturamento, menorFaturamento, quantidadeMeses } = calcularEstatisticas();

  return (
    <div className="space-y-6">
      {/* Formulário para adicionar faturamento */}
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-primary mb-1">
            Lançar Faturamento
          </CardTitle>
          <p className="text-muted-foreground text-sm">
            Adicione os faturamentos mensais que já aconteceram
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="valor-faturamento">Valor do Faturamento</Label>
              <Input
                id="valor-faturamento"
                type="text"
                value={novoFaturamento.valor}
                onChange={(e) => handleValueChange(e.target.value)}
                placeholder="0,00"
              />
            </div>

            <div className="space-y-2">
              <Label>Mês/Ano</Label>
              <div className="grid grid-cols-2 gap-2">
                <Select 
                  value={novoFaturamento.mes.toString()} 
                  onValueChange={(value) => setNovoFaturamento({ ...novoFaturamento, mes: parseInt(value) })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Mês" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Janeiro</SelectItem>
                    <SelectItem value="2">Fevereiro</SelectItem>
                    <SelectItem value="3">Março</SelectItem>
                    <SelectItem value="4">Abril</SelectItem>
                    <SelectItem value="5">Maio</SelectItem>
                    <SelectItem value="6">Junho</SelectItem>
                    <SelectItem value="7">Julho</SelectItem>
                    <SelectItem value="8">Agosto</SelectItem>
                    <SelectItem value="9">Setembro</SelectItem>
                    <SelectItem value="10">Outubro</SelectItem>
                    <SelectItem value="11">Novembro</SelectItem>
                    <SelectItem value="12">Dezembro</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  value={novoFaturamento.ano}
                  onChange={(e) => setNovoFaturamento({ ...novoFaturamento, ano: parseInt(e.target.value) || new Date().getFullYear() })}
                  placeholder="Ano"
                  min="2020"
                  max="2030"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>&nbsp;</Label>
              <Button onClick={adicionarFaturamento} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Adicionar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filtros e Estatísticas */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="space-y-2">
              <Label>Período de Análise</Label>
              <Select value={filtroPeriodo} onValueChange={setFiltroPeriodo}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Último mês</SelectItem>
                  <SelectItem value="3">Últimos 3 meses</SelectItem>
                  <SelectItem value="6">Últimos 6 meses</SelectItem>
                  <SelectItem value="12">Últimos 12 meses</SelectItem>
                  <SelectItem value="todos">Todos os lançamentos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/30 rounded-xl p-6 border border-blue-200 dark:border-blue-800/50">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-blue-500 rounded-lg">
              <TrendingUp className="h-5 w-5 text-white" />
            </div>
            <div className="text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/50 px-2 py-1 rounded-full">
              MÉDIA
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-blue-700 dark:text-blue-300">Média Mensal</p>
            <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
              {formatCurrency(mediaFaturamento)}
            </p>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/30 dark:to-green-900/30 rounded-xl p-6 border border-green-200 dark:border-green-800/50">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-green-500 rounded-lg">
              <DollarSign className="h-5 w-5 text-white" />
            </div>
            <div className="text-xs font-medium text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/50 px-2 py-1 rounded-full">
              TOTAL
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-green-700 dark:text-green-300">Total do Período</p>
            <p className="text-2xl font-bold text-green-900 dark:text-green-100">
              {formatCurrency(totalFaturamento)}
            </p>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/30 dark:to-purple-900/30 rounded-xl p-6 border border-purple-200 dark:border-purple-800/50">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-purple-500 rounded-lg">
              <CalendarDays className="h-5 w-5 text-white" />
            </div>
            <div className="text-xs font-medium text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/50 px-2 py-1 rounded-full">
              QTDE
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-purple-700 dark:text-purple-300">Meses Analisados</p>
            <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">
              {quantidadeMeses}
            </p>
          </div>
        </div>
      </div>

      {/* Lista de Faturamentos */}
      {faturamentosHistoricos.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Faturamentos Lançados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {getFaturamentosFiltrados().map((faturamento) => (
                <div key={faturamento.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center space-x-3">
                    <CalendarDays className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">
                        {format(faturamento.mes, "MMMM 'de' yyyy", { locale: ptBR })}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {formatCurrency(faturamento.valor)}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removerFaturamento(faturamento.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {faturamentosHistoricos.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <CalendarDays className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhum faturamento lançado</h3>
            <p className="text-muted-foreground">
              Adicione seus faturamentos mensais para calcular a média histórica
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}