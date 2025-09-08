import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Calculator, Plus, Trash2, Edit2, Check, X, Info, Settings } from 'lucide-react';
import { useOptimizedUserConfigurations } from '@/hooks/useOptimizedUserConfigurations';
import { useToast } from '@/hooks/use-toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { CustosModal } from './CustosModal';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface MarkupBlock {
  id: string;
  nome: string;
  gastoSobreFaturamento: number;
  impostos: number;
  taxasMeiosPagamento: number;
  comissoesPlataformas: number;
  outros: number;
  valorEmReal: number;
  lucroDesejado: number;
}

interface CalculatedMarkup {
  gastoSobreFaturamento: number;
  impostos: number;
  taxasMeiosPagamento: number;
  comissoesPlataformas: number;
  outros: number;
  valorEmReal: number;
}

interface FaturamentoHistorico {
  id: string;
  valor: number;
  mes: Date;
}

export function Markups() {
  const [blocos, setBlocos] = useState<MarkupBlock[]>([]);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [nomeTemp, setNomeTemp] = useState('');
  const [blocoSelecionado, setBlocoSelecionado] = useState<MarkupBlock | undefined>(undefined);
  const [modalAberto, setModalAberto] = useState(false);
  const [calculatedMarkups, setCalculatedMarkups] = useState<Map<string, CalculatedMarkup>>(new Map());
  const { loadConfiguration, saveConfiguration } = useOptimizedUserConfigurations();
  const { toast } = useToast();
  const { user } = useAuth();
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const calculationRef = useRef<NodeJS.Timeout | null>(null);

  // Bloco fixo para subreceita
  const blocoSubreceita: MarkupBlock = {
    id: 'subreceita-fixo',
    nome: 'subreceita',
    gastoSobreFaturamento: 0,
    impostos: 0,
    taxasMeiosPagamento: 0,
    comissoesPlataformas: 0,
    outros: 0,
    valorEmReal: 0,
    lucroDesejado: 0
  };

  // Função para categorizar encargos
  const getCategoriaByNome = useCallback((nome: string): string => {
    const nomeUpper = nome.toUpperCase();
    
    const impostos = ['ICMS', 'IPI', 'PIS', 'COFINS', 'IR', 'CSLL', 'ISS', 'ISSQN', 'IRPJ', 'SIMPLES'];
    const taxasPagamento = ['TAXA', 'CARTÃO', 'DÉBITO', 'CRÉDITO', 'PIX', 'BOLETO', 'TRANSFERÊNCIA'];
    const comissoes = ['COMISSÃO', 'VENDEDOR', 'REPRESENTANTE', 'AFILIADO', 'MARKETPLACE', 'PLATAFORMA'];
    
    if (impostos.some(termo => nomeUpper.includes(termo))) return 'Impostos';
    if (taxasPagamento.some(termo => nomeUpper.includes(termo))) return 'Taxas de Meios de Pagamento';
    if (comissoes.some(termo => nomeUpper.includes(termo))) return 'Comissões';
    
    return 'Outros';
  }, []);

  // Função para calcular markups em tempo real
  const calcularMarkupsEmTempoReal = useCallback(async () => {
    if (!user?.id) return;

    try {
      // Buscar configurações salvas
      const filtroConfig = await loadConfiguration('media_faturamento_filtro');
      const checkboxConfig = await loadConfiguration('custos_checkboxes');
      const faturamentosConfig = await loadConfiguration('faturamentos_historicos');
      
      if (!checkboxConfig) return;

      const periodo = filtroConfig || 'ultimo_mes';
      
      // Calcular média mensal baseada no período
      let mediaMensal = 0;
      if (faturamentosConfig && Array.isArray(faturamentosConfig)) {
        const faturamentos = faturamentosConfig.map((f: any) => ({
          ...f,
          mes: new Date(f.mes)
        }));

        const hoje = new Date();
        let dataLimite = new Date();
        
        switch (periodo) {
          case 'ultimo_mes':
            dataLimite.setMonth(hoje.getMonth() - 1);
            break;
          case 'ultimos_3_meses':
            dataLimite.setMonth(hoje.getMonth() - 3);
            break;
          case 'ultimos_6_meses':
            dataLimite.setMonth(hoje.getMonth() - 6);
            break;
          case 'ultimo_ano':
            dataLimite.setFullYear(hoje.getFullYear() - 1);
            break;
        }

        const faturamentoFiltrado = faturamentos.filter((f: FaturamentoHistorico) => f.mes >= dataLimite);
        const total = faturamentoFiltrado.reduce((acc: number, f: FaturamentoHistorico) => acc + f.valor, 0);
        const meses = Math.max(1, Math.ceil((hoje.getTime() - dataLimite.getTime()) / (1000 * 60 * 60 * 24 * 30)));
        mediaMensal = total / meses;
      }

      // Buscar dados de custos
      const [{ data: despesasFixas }, { data: folhaPagamento }, { data: encargosVenda }] = await Promise.all([
        supabase.from('despesas_fixas').select('*').eq('user_id', user.id),
        supabase.from('folha_pagamento').select('*').eq('user_id', user.id),
        supabase.from('encargos_venda').select('*').eq('user_id', user.id)
      ]);

      // Calcular markups para cada bloco
      const novosCalculatedMarkups = new Map<string, CalculatedMarkup>();

      for (const bloco of blocos) {
        const blocoCfg = checkboxConfig[bloco.id];
        if (!blocoCfg) continue;

        // Calcular gasto sobre faturamento
        let totalGastos = 0;
        
        // Despesas fixas
        if (despesasFixas && blocoCfg.despesasFixas) {
          const gastosDespesas = despesasFixas
            .filter(d => blocoCfg.despesasFixas[d.id])
            .reduce((acc, d) => acc + d.valor, 0);
          totalGastos += gastosDespesas;
        }

        // Folha de pagamento
        if (folhaPagamento && blocoCfg.folhaPagamento) {
          const gastosFolha = folhaPagamento
            .filter(f => blocoCfg.folhaPagamento[f.id])
            .reduce((acc, f) => acc + (f.custo_por_hora || f.salario_base || 0), 0);
          totalGastos += gastosFolha;
        }

        const gastoSobreFaturamento = mediaMensal > 0 ? (totalGastos / mediaMensal) * 100 : 0;

        // Calcular outros percentuais
        let impostos = 0;
        let taxasMeiosPagamento = 0;
        let comissoesPlataformas = 0;
        let outros = 0;
        let valorEmReal = 0;

        if (encargosVenda && blocoCfg.encargosVenda) {
          encargosVenda
            .filter(e => blocoCfg.encargosVenda[e.id])
            .forEach(encargo => {
              const categoria = getCategoriaByNome(encargo.nome);
              const valor = encargo.valor || 0;
              
              if (encargo.tipo === 'fixo') {
                valorEmReal += valor;
              } else {
                switch (categoria) {
                  case 'Impostos':
                    impostos += valor;
                    break;
                  case 'Taxas de Meios de Pagamento':
                    taxasMeiosPagamento += valor;
                    break;
                  case 'Comissões':
                    comissoesPlataformas += valor;
                    break;
                  default:
                    outros += valor;
                    break;
                }
              }
            });
        }

        novosCalculatedMarkups.set(bloco.id, {
          gastoSobreFaturamento,
          impostos,
          taxasMeiosPagamento,
          comissoesPlataformas,
          outros,
          valorEmReal
        });
      }

      setCalculatedMarkups(novosCalculatedMarkups);
    } catch (error) {
      console.error('Erro ao calcular markups em tempo real:', error);
    }
  }, [user?.id, blocos, loadConfiguration, getCategoriaByNome]);

  useEffect(() => {
    const carregarBlocos = async () => {
      try {
        const config = await loadConfiguration('markups_blocos');
        if (config && Array.isArray(config)) {
          setBlocos(config as unknown as MarkupBlock[]);
        }
      } catch (error) {
        console.error('Erro ao carregar blocos:', error);
      }
    };
    carregarBlocos();
  }, [loadConfiguration]);

  // Recalcular markups quando blocos mudarem
  useEffect(() => {
    if (blocos.length > 0) {
      if (calculationRef.current) {
        clearTimeout(calculationRef.current);
      }
      
      calculationRef.current = setTimeout(() => {
        calcularMarkupsEmTempoReal();
      }, 500);
    }
  }, [blocos, calcularMarkupsEmTempoReal]);

  // Limpar timeouts ao desmontar
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (calculationRef.current) clearTimeout(calculationRef.current);
    };
  }, []);

  const salvarBlocos = useCallback(async (novosBlocos: MarkupBlock[]) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    
    debounceRef.current = setTimeout(async () => {
      try {
        await saveConfiguration('markups_blocos', novosBlocos);
      } catch (error) {
        console.error('Erro ao salvar blocos:', error);
      }
    }, 800);
  }, [saveConfiguration]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    // Se for número inteiro, não mostrar casas decimais
    if (value === Math.floor(value)) {
      return value.toString();
    }
    // Se tiver decimais, mostrar até 2 casas decimais e remover zeros desnecessários
    return parseFloat(value.toFixed(2)).toString();
  };

  const criarNovoBloco = () => {
    const novoBloco: MarkupBlock = {
      id: Date.now().toString(),
      nome: `Markup ${blocos.length + 1}`,
      gastoSobreFaturamento: 0,
      impostos: 0,
      taxasMeiosPagamento: 0,
      comissoesPlataformas: 0,
      outros: 0,
      valorEmReal: 0,
      lucroDesejado: 0
    };

    const novosBlocos = [...blocos, novoBloco];
    setBlocos(novosBlocos);
    salvarBlocos(novosBlocos);
    
    toast({
      title: "Bloco criado",
      description: "Novo bloco de markup adicionado"
    });
  };

  const removerBloco = (id: string) => {
    const novosBlocos = blocos.filter(b => b.id !== id);
    setBlocos(novosBlocos);
    salvarBlocos(novosBlocos);
    
    toast({
      title: "Bloco removido",
      description: "Bloco de markup removido com sucesso"
    });
  };

  const atualizarBloco = (id: string, campo: keyof MarkupBlock, valor: any) => {
    const novosBlocos = blocos.map(bloco => 
      bloco.id === id ? { ...bloco, [campo]: valor } : bloco
    );
    setBlocos(novosBlocos);
    salvarBlocos(novosBlocos);
  };

  const calcularMarkupIdeal = (bloco: MarkupBlock, calculated?: CalculatedMarkup) => {
    const markupData = calculated || calculatedMarkups.get(bloco.id) || {
      gastoSobreFaturamento: bloco.gastoSobreFaturamento,
      impostos: bloco.impostos,
      taxasMeiosPagamento: bloco.taxasMeiosPagamento,
      comissoesPlataformas: bloco.comissoesPlataformas,
      outros: bloco.outros,
      valorEmReal: bloco.valorEmReal || 0
    };
    
    // Soma todos os percentuais (incluindo lucro desejado)
    const somaPercentuais = markupData.gastoSobreFaturamento + markupData.impostos + 
                           markupData.taxasMeiosPagamento + markupData.comissoesPlataformas + 
                           markupData.outros + bloco.lucroDesejado;
    
    // Converte percentuais para decimais e aplica a fórmula: Markup = 1 / (1 - somaPercentuais)
    const somaDecimais = somaPercentuais / 100;
    const markup = 1 / (1 - somaDecimais);
    return markup;
  };

  // Callback para receber atualizações do modal
  const handleMarkupUpdate = useCallback((blocoId: string, markupData: any) => {
    const novosCalculatedMarkups = new Map(calculatedMarkups);
    novosCalculatedMarkups.set(blocoId, markupData);
    setCalculatedMarkups(novosCalculatedMarkups);
  }, [calculatedMarkups]);

  const iniciarEdicaoNome = (bloco: MarkupBlock) => {
    setEditandoId(bloco.id);
    setNomeTemp(bloco.nome);
  };

  const salvarNome = (id: string) => {
    if (nomeTemp.trim()) {
      atualizarBloco(id, 'nome', nomeTemp.trim());
    }
    setEditandoId(null);
    setNomeTemp('');
  };

  const cancelarEdicao = () => {
    setEditandoId(null);
    setNomeTemp('');
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-primary mb-1 flex items-center justify-between">
            Blocos de Markup
            <Button onClick={criarNovoBloco}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Bloco
            </Button>
          </CardTitle>
          <p className="text-muted-foreground text-sm">
            Crie e gerencie seus diferentes cenários de markup
          </p>
        </CardHeader>
      </Card>

      {blocos.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Calculator className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhum bloco criado</h3>
            <p className="text-muted-foreground mb-4">
              Crie seu primeiro bloco de markup para começar
            </p>
            <Button onClick={criarNovoBloco}>
              <Plus className="h-4 w-4 mr-2" />
              Criar Primeiro Bloco
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {/* Bloco fixo subreceita */}
        <TooltipProvider>
          <Card className="relative border-blue-200 bg-blue-50/50">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold text-primary">SubReceita</h3>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-500 text-white cursor-help">
                        <Info className="h-3 w-3" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs p-3 bg-blue-50 border border-blue-200">
                      <p className="text-sm text-blue-800">
                        <strong>Atenção:</strong> Este bloco é exclusivo para subprodutos que não são vendidos 
                        separadamente, como massas, recheios e coberturas. Ele serve apenas para 
                        organizar ingredientes usados em receitas.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setBlocoSelecionado(undefined);
                    setModalAberto(true);
                  }}
                  className="text-primary hover:text-primary"
                >
                  <Settings className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
          
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <Label className="text-sm">Gasto sobre faturamento</Label>
                  <div className="flex items-center gap-1">
                    <Input
                      type="text"
                      value={formatPercentage(0)}
                      disabled
                      className="w-20 h-7 text-center text-sm text-blue-600 bg-gray-50"
                    />
                    <span className="text-sm text-blue-600">%</span>
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <Label className="text-sm">Impostos</Label>
                  <div className="flex items-center gap-1">
                    <Input
                      type="text"
                      value={formatPercentage(0)}
                      disabled
                      className="w-20 h-7 text-center text-sm text-blue-600 bg-gray-50"
                    />
                    <span className="text-sm text-blue-600">%</span>
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <Label className="text-sm">Taxas de meios de pagamento</Label>
                  <div className="flex items-center gap-1">
                    <Input
                      type="text"
                      value={formatPercentage(0)}
                      disabled
                      className="w-20 h-7 text-center text-sm text-blue-600 bg-gray-50"
                    />
                    <span className="text-sm text-blue-600">%</span>
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <Label className="text-sm">Comissões e plataformas</Label>
                  <div className="flex items-center gap-1">
                    <Input
                      type="text"
                      value={formatPercentage(0)}
                      disabled
                      className="w-20 h-7 text-center text-sm text-blue-600 bg-gray-50"
                    />
                    <span className="text-sm text-blue-600">%</span>
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <Label className="text-sm">Outros</Label>
                  <div className="flex items-center gap-1">
                    <Input
                      type="text"
                      value={formatPercentage(0)}
                      disabled
                      className="w-20 h-7 text-center text-sm text-blue-600 bg-gray-50"
                    />
                    <span className="text-sm text-blue-600">%</span>
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <Label className="text-sm">Valor em real</Label>
                  <div className="flex items-center gap-1">
                    <Input
                      type="text"
                      value={formatCurrency(0)}
                      disabled
                      className="w-24 h-7 text-center text-sm text-orange-600 bg-gray-50"
                    />
                  </div>
                </div>

                <div className="flex justify-between items-center border-t pt-3">
                  <Label className="text-sm font-medium">Lucro desejado sobre venda</Label>
                  <div className="flex items-center gap-1">
                    <Input
                      type="text"
                      value={formatPercentage(0)}
                      disabled
                      className="w-20 h-7 text-center text-sm text-green-600 bg-gray-50"
                    />
                    <span className="text-sm text-green-600">%</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3 pt-2 border-t">
                <div className="flex justify-between items-center p-3 bg-blue-100 rounded-lg">
                  <span className="font-semibold text-blue-700">Markup ideal</span>
                  <span className="text-xl font-bold text-blue-700">1,000</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TooltipProvider>

        {/* Blocos editáveis */}
        {blocos.map((bloco) => {
          const calculated = calculatedMarkups.get(bloco.id);
          const markupIdeal = calcularMarkupIdeal(bloco, calculated);
          
          return (
            <Card key={bloco.id} className="relative">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  {editandoId === bloco.id ? (
                    <div className="flex items-center gap-2 flex-1">
                      <Input
                        value={nomeTemp}
                        onChange={(e) => setNomeTemp(e.target.value)}
                        className="text-lg font-semibold"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') salvarNome(bloco.id);
                          if (e.key === 'Escape') cancelarEdicao();
                        }}
                        autoFocus
                      />
                      <Button size="sm" variant="ghost" onClick={() => salvarNome(bloco.id)}>
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={cancelarEdicao}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div 
                      className="flex items-center gap-2 cursor-pointer flex-1"
                      onClick={() => iniciarEdicaoNome(bloco)}
                    >
                      <h3 className="text-lg font-semibold text-primary">{bloco.nome}</h3>
                      <Edit2 className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setBlocoSelecionado(bloco);
                      setModalAberto(true);
                    }}
                    className="text-primary hover:text-primary"
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removerBloco(bloco.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <Label className="text-sm">Gasto sobre faturamento</Label>
                    <div className="flex items-center gap-1">
                      <Input
                        type="text"
                        value={formatPercentage(calculated?.gastoSobreFaturamento || 0)}
                        disabled
                        className="w-20 h-7 text-center text-sm text-blue-600 bg-gray-50"
                      />
                      <span className="text-sm text-blue-600">%</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center">
                    <Label className="text-sm">Impostos</Label>
                    <div className="flex items-center gap-1">
                      <Input
                        type="text"
                        value={formatPercentage(calculated?.impostos || 0)}
                        disabled
                        className="w-20 h-7 text-center text-sm text-blue-600 bg-gray-50"
                      />
                      <span className="text-sm text-blue-600">%</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center">
                    <Label className="text-sm">Taxas de meios de pagamento</Label>
                    <div className="flex items-center gap-1">
                      <Input
                        type="text"
                        value={formatPercentage(calculated?.taxasMeiosPagamento || 0)}
                        disabled
                        className="w-20 h-7 text-center text-sm text-blue-600 bg-gray-50"
                      />
                      <span className="text-sm text-blue-600">%</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center">
                    <Label className="text-sm">Comissões e plataformas</Label>
                    <div className="flex items-center gap-1">
                      <Input
                        type="text"
                        value={formatPercentage(calculated?.comissoesPlataformas || 0)}
                        disabled
                        className="w-20 h-7 text-center text-sm text-blue-600 bg-gray-50"
                      />
                      <span className="text-sm text-blue-600">%</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center">
                    <Label className="text-sm">Outros</Label>
                    <div className="flex items-center gap-1">
                      <Input
                        type="text"
                        value={formatPercentage(calculated?.outros || 0)}
                        disabled
                        className="w-20 h-7 text-center text-sm text-blue-600 bg-gray-50"
                      />
                      <span className="text-sm text-blue-600">%</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center">
                    <Label className="text-sm">Valor em real</Label>
                    <div className="flex items-center gap-1">
                      <Input
                        type="text"
                        value={formatCurrency(calculated?.valorEmReal || 0)}
                        disabled
                        className="w-24 h-7 text-center text-sm text-orange-600 bg-gray-50"
                      />
                    </div>
                  </div>

                  <div className="flex justify-between items-center border-t pt-3">
                    <Label className="text-sm font-medium">Lucro desejado sobre venda</Label>
                    <div className="flex items-center gap-1">
                      <Input
                        type="number"
                        value={bloco.lucroDesejado}
                        onChange={(e) => atualizarBloco(bloco.id, 'lucroDesejado', parseFloat(e.target.value) || 0)}
                        className="w-20 h-7 text-center text-sm text-green-600"
                        step="0.01"
                        min="0"
                        max="100"
                      />
                      <span className="text-sm text-green-600">%</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 pt-2 border-t">
                  <div className="flex justify-between items-center p-3 bg-gradient-to-r from-primary/10 to-secondary/10 rounded-lg">
                    <span className="font-semibold text-primary">Markup ideal</span>
                    <span className="text-xl font-bold text-primary">
                      {isNaN(markupIdeal) || !isFinite(markupIdeal) ? '∞' : markupIdeal.toFixed(4)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {modalAberto && (
        <CustosModal
          open={modalAberto}
          onOpenChange={(open) => {
            setModalAberto(open);
            if (!open) setBlocoSelecionado(undefined);
          }}
          markupBlock={blocoSelecionado}
          onMarkupUpdate={(markup) => {
            if (blocoSelecionado) {
              handleMarkupUpdate(blocoSelecionado.id, markup);
            }
          }}
        />
      )}
    </div>
  );
}