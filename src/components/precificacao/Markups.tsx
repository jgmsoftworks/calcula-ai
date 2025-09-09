import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Calculator, Plus, Trash2, Edit2, Info, Settings } from 'lucide-react';
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
  // NOVO: período redundante salvo junto do bloco
  periodo?: string; // '1' | '3' | '6' | '12' | 'todos'
}

interface CalculatedMarkup {
  gastoSobreFaturamento: number;
  impostos: number;
  taxasMeiosPagamento: number;
  comissoesPlataformas: number;
  outros: number;
  valorEmReal: number;
}

const PERIODOS_VALIDOS = new Set(['1', '3', '6', '12', 'todos']);

export function Markups() {
  const [blocos, setBlocos] = useState<MarkupBlock[]>([]);
  const [blocoSelecionado, setBlocoSelecionado] = useState<MarkupBlock | undefined>(undefined);
  const [modalAberto, setModalAberto] = useState(false);
  const [modalEdicaoNome, setModalEdicaoNome] = useState(false);
  const [blocoEditandoNome, setBlocoEditandoNome] = useState<MarkupBlock | null>(null);
  const [nomeTemp, setNomeTemp] = useState('');
  const [calculatedMarkups, setCalculatedMarkups] = useState<Map<string, CalculatedMarkup>>(new Map());
  const [criandoNovoBloco, setCriandoNovoBloco] = useState(false);

  const { loadConfiguration, saveConfiguration } = useOptimizedUserConfigurations();
  const { toast } = useToast();
  const { user } = useAuth();
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Bloco fixo para subreceita (informativo)
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

  // Mapa de categorias (mesma lógica usada no modal)
  const categoriasMap = useMemo(() => {
    return {
      impostos: new Set(['ICMS', 'ISS', 'PIS/COFINS', 'IRPJ/CSLL', 'IPI']),
      meios_pagamento: new Set(['Cartão de débito', 'Cartão de crédito', 'Boleto bancário', 'PIX', 'Gateway de pagamento']),
      comissoes: new Set(['Marketing', 'Aplicativo de delivery', 'Plataforma SaaS', 'Colaboradores (comissão)'])
    };
  }, []);

  const getCategoriaByNome = useCallback(
    (nome: string): 'impostos' | 'meios_pagamento' | 'comissoes' | 'outros' => {
      if (categoriasMap.impostos.has(nome)) return 'impostos';
      if (categoriasMap.meios_pagamento.has(nome)) return 'meios_pagamento';
      if (categoriasMap.comissoes.has(nome)) return 'comissoes';
      return 'outros';
    },
    [categoriasMap]
  );

  // ---- Carregar e calcular markups respeitando o PERÍODO por bloco ----
  const carregarConfiguracoesSalvas = useCallback(async () => {
    if (!user?.id || blocos.length === 0) return;

    console.log('🔄 Carregando configurações salvas para', blocos.length, 'blocos');
    const novosCalculatedMarkups = new Map<string, CalculatedMarkup>();

    // Busca única dos datasets base
    const [{ data: despesasFixas }, { data: folhaPagamento }, { data: encargosVenda }] = await Promise.all([
      supabase.from('despesas_fixas').select('*').eq('user_id', user.id),
      supabase.from('folha_pagamento').select('*').eq('user_id', user.id),
      supabase.from('encargos_venda').select('*').eq('user_id', user.id)
    ]);

    // Carrega todos faturamentos (uma vez)
    const faturamentosConfig = await loadConfiguration('faturamentos_historicos');
    const todosFaturamentos: Array<{ mes: Date; valor: number }> =
      faturamentosConfig && Array.isArray(faturamentosConfig)
        ? faturamentosConfig.map((f: any) => ({ mes: new Date(f.mes), valor: Number(f.valor) || 0 }))
        : [];

    // Vamos também atualizar os blocos com o período efetivamente usado (redundância saudável)
    let blocosAtualizados: MarkupBlock[] | null = null;

    for (const bloco of blocos) {
      // 1) período pode vir do próprio bloco
      let periodo = bloco.periodo && PERIODOS_VALIDOS.has(String(bloco.periodo)) ? String(bloco.periodo) : undefined;

      // 2) se não existir no bloco, tenta user_configurations
      if (!periodo) {
        const salvo = await loadConfiguration(`filtro-periodo-${bloco.id}`);
        const normalizado = salvo == null ? 'todos' : String(salvo);
        periodo = PERIODOS_VALIDOS.has(normalizado) ? normalizado : 'todos';

        // grava no bloco em memória e persiste em markups_blocos (redundância)
        if (!blocosAtualizados) blocosAtualizados = [...blocos];
        blocosAtualizados = blocosAtualizados.map(b => (b.id === bloco.id ? { ...b, periodo } : b));
      }

      // 3) filtra faturamentos conforme período
      let faturamentosFiltrados = todosFaturamentos;
      if (periodo !== 'todos') {
        const meses = parseInt(periodo, 10);
        const limite = new Date();
        limite.setMonth(limite.getMonth() - meses);
        faturamentosFiltrados = todosFaturamentos.filter(f => f.mes >= limite);
      }

      let mediaMensal = 0;
      if (faturamentosFiltrados.length > 0) {
        const total = faturamentosFiltrados.reduce((acc, f) => acc + f.valor, 0);
        mediaMensal = total / faturamentosFiltrados.length;
      }

      // 4) aplica mesma lógica do modal para percentuais e valor fixo
      const configCheckbox = await loadConfiguration(`checkbox-states-${bloco.id}`);

      if (configCheckbox && typeof configCheckbox === 'object' && Object.keys(configCheckbox).length > 0) {
        // despesas fixas consideradas (ativas + marcadas)
        const despesasConsideradas = (despesasFixas || []).filter(d => configCheckbox[d.id] && d.ativo);
        const totalDespesasFixas = despesasConsideradas.reduce((acc, d) => acc + Number(d.valor || 0), 0);

        // folha de pagamento considerada (ativa + marcada)
        const folhaConsiderada = (folhaPagamento || []).filter(f => configCheckbox[f.id] && f.ativo);
        const totalFolhaPagamento = folhaConsiderada.reduce((acc, f) => {
          const custoMensal =
            f.custo_por_hora > 0
              ? Number(f.custo_por_hora) * (Number(f.horas_totais_mes) || 173.2)
              : Number(f.salario_base || 0);
          return acc + custoMensal;
        }, 0);

        const totalGastos = totalDespesasFixas + totalFolhaPagamento;
        const gastoSobreFaturamentoPct =
          mediaMensal > 0 && totalGastos > 0 ? Math.round(((totalGastos / mediaMensal) * 100) * 100) / 100 : 0;

        // encargos sobre venda
        const encargosConsiderados = (encargosVenda || []).filter(e => configCheckbox[e.id] && e.ativo);

        const valorEmReal = encargosConsiderados.reduce((acc, e) => acc + Number(e.valor_fixo || 0), 0);

        const categorias = encargosConsiderados.reduce(
          (acc, e) => {
            const cat = getCategoriaByNome(e.nome);
            const v = Number(e.valor_percentual || 0);
            if (cat === 'impostos') acc.impostos += v;
            else if (cat === 'meios_pagamento') acc.taxasMeiosPagamento += v;
            else if (cat === 'comissoes') acc.comissoesPlataformas += v;
            else acc.outros += v;
            return acc;
          },
          {
            gastoSobreFaturamento: gastoSobreFaturamentoPct,
            impostos: 0,
            taxasMeiosPagamento: 0,
            comissoesPlataformas: 0,
            outros: 0,
            valorEmReal
          }
        );

        novosCalculatedMarkups.set(bloco.id, categorias);
        console.log(`✅ [${bloco.nome}] período="${periodo}" médiaMensal=${mediaMensal.toFixed(2)} =>`, categorias);
      } else {
        novosCalculatedMarkups.set(bloco.id, {
          gastoSobreFaturamento: 0,
          impostos: 0,
          taxasMeiosPagamento: 0,
          comissoesPlataformas: 0,
          outros: 0,
          valorEmReal: 0
        });
        console.log(`⚠️ [${bloco.nome}] sem config; período="${periodo}" médiaMensal=${mediaMensal.toFixed(2)} -> zerado`);
      }
    }

    if (novosCalculatedMarkups.size > 0) {
      setCalculatedMarkups(novosCalculatedMarkups);
    }

    // se atualizamos períodos nos blocos em memória, persiste no markups_blocos
    if (blocosAtualizados) {
      setBlocos(blocosAtualizados);
      try {
        await saveConfiguration('markups_blocos', blocosAtualizados);
      } catch (e) {
        console.warn('⚠️ Falha ao persistir markups_blocos com período:', e);
      }
    }
  }, [user?.id, blocos, loadConfiguration, saveConfiguration, getCategoriaByNome]);

  // Carrega lista de blocos
  useEffect(() => {
    const carregarBlocos = async () => {
      try {
        const config = await loadConfiguration('markups_blocos');
        if (config && Array.isArray(config)) {
          // normaliza período salvo
          const normalizados: MarkupBlock[] = (config as MarkupBlock[]).map(b => ({
            ...b,
            periodo: PERIODOS_VALIDOS.has(String(b.periodo)) ? String(b.periodo) : 'todos'
          }));
          setBlocos(normalizados);
          console.log('📦 Blocos carregados:', normalizados.length);
        }
      } catch (error) {
        console.error('Erro ao carregar blocos:', error);
      }
    };
    carregarBlocos();
  }, [loadConfiguration]);

  // Recalcula quando blocos carregarem
  useEffect(() => {
    if (blocos.length > 0 && user?.id) {
      carregarConfiguracoesSalvas();
    }
  }, [blocos.length, user?.id, carregarConfiguracoesSalvas]);

  // Limpa debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const salvarBlocos = useCallback(
    async (novosBlocos: MarkupBlock[]) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(async () => {
        try {
          await saveConfiguration('markups_blocos', novosBlocos);
        } catch (error) {
          console.error('Erro ao salvar blocos:', error);
        }
      }, 800);
    },
    [saveConfiguration]
  );

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const formatPercentage = (value: number) => value.toFixed(2);

  const criarNovoBloco = () => {
    // abre modal para configurar antes de criar
    setCriandoNovoBloco(true);
    setBlocoSelecionado(undefined);
    setModalAberto(true);
  };

  // Finaliza criação do bloco a partir do modal
  const finalizarCriacaoBloco = async (markupCalculado: CalculatedMarkup) => {
    try {
      const novoBloco: MarkupBlock = {
        id: Date.now().toString(),
        nome: `Markup ${blocos.length + 1}`,
        gastoSobreFaturamento: markupCalculado.gastoSobreFaturamento,
        impostos: markupCalculado.impostos,
        taxasMeiosPagamento: markupCalculado.taxasMeiosPagamento,
        comissoesPlataformas: markupCalculado.comissoesPlataformas,
        outros: markupCalculado.outros,
        valorEmReal: markupCalculado.valorEmReal,
        lucroDesejado: 0,
        periodo: 'todos' // padrão
      };

      const novos = [...blocos, novoBloco];
      setBlocos(novos);
      salvarBlocos(novos);

      setCalculatedMarkups(prev => {
        const m = new Map(prev);
        m.set(novoBloco.id, markupCalculado);
        return m;
      });

      toast({ title: 'Bloco criado', description: `O bloco "${novoBloco.nome}" foi criado.` });
      setCriandoNovoBloco(false);
    } catch (error) {
      console.error('❌ Erro ao criar novo bloco:', error);
      toast({ title: 'Erro ao criar bloco', description: 'Tente novamente.', variant: 'destructive' });
    }
  };

  const removerBloco = (id: string) => {
    const novos = blocos.filter(b => b.id !== id);
    setBlocos(novos);
    salvarBlocos(novos);

    const calc = new Map(calculatedMarkups);
    calc.delete(id);
    setCalculatedMarkups(calc);
  };

  const atualizarBloco = (id: string, campo: keyof MarkupBlock, valor: number) => {
    const novos = blocos.map(b => (b.id === id ? { ...b, [campo]: valor } : b));
    setBlocos(novos);
    salvarBlocos(novos);
  };

  const calcularMarkupIdeal = (bloco: MarkupBlock, markupData?: CalculatedMarkup): number => {
    const v = markupData || calculatedMarkups.get(bloco.id);
    if (!v) return 1;
    const soma =
      v.gastoSobreFaturamento +
      v.impostos +
      v.taxasMeiosPagamento +
      v.comissoesPlataformas +
      v.outros +
      bloco.lucroDesejado;
    const frac = soma / 100;
    if (frac >= 1) return 1; // evita divisão por 0 / infinito
    return 1 / (1 - frac);
  };

  // Atualizações vindas do modal
  const handleMarkupUpdate = useCallback(
    async (blocoId: string, markupData: any) => {
      console.log('🔄 handleMarkupUpdate', blocoId, markupData);

      if (criandoNovoBloco) {
        await finalizarCriacaoBloco(markupData);
        return;
      }

      // atualiza cálculo no estado
      setCalculatedMarkups(prev => {
        const m = new Map(prev);
        m.set(blocoId, markupData);
        return m;
      });

      // recarrega cálculos completos (garante período aplicado)
      await carregarConfiguracoesSalvas();
    },
    [criandoNovoBloco, finalizarCriacaoBloco, carregarConfiguracoesSalvas]
  );

  const iniciarEdicaoNome = (bloco: MarkupBlock) => {
    setBlocoEditandoNome(bloco);
    setNomeTemp(bloco.nome);
    setModalEdicaoNome(true);
  };

  const salvarNome = () => {
    if (blocoEditandoNome && nomeTemp.trim()) {
      const novos = blocos.map(b => (b.id === blocoEditandoNome.id ? { ...b, nome: nomeTemp.trim() } : b));
      setBlocos(novos);
      salvarBlocos(novos);
      setModalEdicaoNome(false);
      setBlocoEditandoNome(null);
    }
  };

  const cancelarEdicao = () => {
    setModalEdicaoNome(false);
    setBlocoEditandoNome(null);
    setNomeTemp('');
  };

  const abrirModal = (bloco: MarkupBlock) => {
    setBlocoSelecionado(bloco);
    setModalAberto(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Markups</h1>
          <p className="text-muted-foreground">Calcule preços com base em custos e margem desejada</p>
        </div>
        <Button onClick={criarNovoBloco} className="gap-2">
          <Plus className="h-4 w-4" />
          Novo Bloco de Markup
        </Button>
      </div>

      <div className="grid gap-6">
        {blocos.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Calculator className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Nenhum bloco criado</h3>
              <p className="text-muted-foreground mb-4 text-center">Crie seu primeiro bloco de markup para calcular preços</p>
              <Button onClick={criarNovoBloco} className="gap-2">
                <Plus className="h-4 w-4" />
                Criar Primeiro Bloco
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Bloco fixo subreceita */}
        <Card className="border-border shadow-lg">
          <CardHeader className="bg-muted/50">
            <div className="flex items-center justify-between">
              <CardTitle className="text-blue-600 capitalize font-bold text-xl flex items-center gap-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-4 w-4 text-blue-500 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>
                        Este é um bloco informativo que mostra os percentuais máximos recomendados para cada categoria
                        baseado nas melhores práticas do mercado
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                {blocoSubreceita.nome}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <Label className="text-sm font-medium text-muted-foreground">Gasto sobre faturamento</Label>
                <div className="text-2xl font-bold text-blue-600">15%</div>
              </div>
              <div className="space-y-1">
                <Label className="text-sm font-medium text-muted-foreground">Impostos</Label>
                <div className="text-2xl font-bold text-blue-600">25%</div>
              </div>
              <div className="space-y-1">
                <Label className="text-sm font-medium text-muted-foreground">Taxas de meios de pagamento</Label>
                <div className="text-2xl font-bold text-blue-600">5%</div>
              </div>
              <div className="space-y-1">
                <Label className="text-sm font-medium text-muted-foreground">Comissões e plataformas</Label>
                <div className="text-2xl font-bold text-blue-600">10%</div>
              </div>
              <div className="space-y-1">
                <Label className="text-sm font-medium text-muted-foreground">Outros</Label>
                <div className="text-2xl font-bold text-blue-600">5%</div>
              </div>
              <div className="space-y-1">
                <Label className="text-sm font-medium text-muted-foreground">Valor em real</Label>
                <div className="text-2xl font-bold text-orange-600">{formatCurrency(200)}</div>
              </div>
              <div className="space-y-1">
                <Label className="text-sm font-medium text-muted-foreground">Lucro desejado sobre venda</Label>
                <div className="text-2xl font-bold text-green-600">20%</div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t bg-blue-50/50 -mx-6 px-6 pb-6">
              <div className="flex items-center justify-between">
                <Label className="text-lg font-semibold text-blue-700">Markup ideal</Label>
                <div className="text-3xl font-bold text-blue-700">2,50</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Blocos do usuário */}
        {blocos.map((bloco) => {
          const calculated = calculatedMarkups.get(bloco.id);
          const hasCalculated = calculated !== undefined;
          const markupIdeal = hasCalculated ? calcularMarkupIdeal(bloco, calculated) : 1;

          return (
            <Card key={bloco.id} className="border-border">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-blue-600 capitalize font-bold text-xl">
                    {bloco.nome}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => iniciarEdicaoNome(bloco)}
                      className="h-8 w-8 p-0"
                    >
                      <Edit2 className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => abrirModal(bloco)}
                      className="h-8 w-8 p-0"
                    >
                      <Settings className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => removerBloco(bloco.id)}
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <Label className="text-sm font-medium text-muted-foreground">Gasto sobre faturamento</Label>
                    <div className="text-2xl font-bold text-blue-600">
                      {hasCalculated ? formatPercentage(calculated!.gastoSobreFaturamento) : '0'} <span className="text-sm">%</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm font-medium text-muted-foreground">Impostos</Label>
                    <div className="text-2xl font-bold text-blue-600">
                      {hasCalculated ? formatPercentage(calculated!.impostos) : '0'} <span className="text-sm">%</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm font-medium text-muted-foreground">Taxas de meios de pagamento</Label>
                    <div className="text-2xl font-bold text-blue-600">
                      {hasCalculated ? formatPercentage(calculated!.taxasMeiosPagamento) : '0'} <span className="text-sm">%</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm font-medium text-muted-foreground">Comissões e plataformas</Label>
                    <div className="text-2xl font-bold text-blue-600">
                      {hasCalculated ? formatPercentage(calculated!.comissoesPlataformas) : '0'} <span className="text-sm">%</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm font-medium text-muted-foreground">Outros</Label>
                    <div className="text-2xl font-bold text-blue-600">
                      {hasCalculated ? formatPercentage(calculated!.outros) : '0'} <span className="text-sm">%</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm font-medium text-muted-foreground">Valor em real</Label>
                    <div className="text-2xl font-bold text-orange-600">
                      {hasCalculated ? formatCurrency(calculated!.valorEmReal) : formatCurrency(0)}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm font-medium text-muted-foreground">Lucro desejado sobre venda</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={bloco.lucroDesejado}
                        onChange={(e) => atualizarBloco(bloco.id, 'lucroDesejado', parseFloat(e.target.value) || 0)}
                        className="text-green-600 font-bold"
                      />
                      <span className="text-green-600 font-bold">%</span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t bg-blue-50/50 -mx-6 px-6 pb-6">
                  <div className="flex items-center justify-between">
                    <Label className="text-lg font-semibold text-blue-700">Markup ideal</Label>
                    <div className="text-3xl font-bold text-blue-700">
                      {Number.isFinite(markupIdeal) ? markupIdeal.toFixed(4) : '1.0000'}
                    </div>
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
            if (!open) {
              setBlocoSelecionado(undefined);
              setCriandoNovoBloco(false);
            }
          }}
          markupBlock={criandoNovoBloco ? undefined : blocoSelecionado}
          onMarkupUpdate={(markup) => {
            console.log('🔄 Modal retornou markup:', markup, 'para bloco:', criandoNovoBloco ? 'NOVO' : blocoSelecionado?.id);
            if (criandoNovoBloco) {
              handleMarkupUpdate('novo', markup);
            } else if (blocoSelecionado) {
              handleMarkupUpdate(blocoSelecionado.id, markup);
            }
          }}
        />
      )}

      <Dialog open={modalEdicaoNome} onOpenChange={setModalEdicaoNome}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Nome do Bloco</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={nomeTemp}
              onChange={(e) => setNomeTemp(e.target.value)}
              placeholder="Digite o nome do bloco"
              onKeyDown={(e) => {
                if (e.key === 'Enter') salvarNome();
                if (e.key === 'Escape') cancelarEdicao();
              }}
              autoFocus
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={cancelarEdicao}>
              Cancelar
            </Button>
            <Button onClick={salvarNome}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
