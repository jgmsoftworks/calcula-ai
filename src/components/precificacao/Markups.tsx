import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Calculator, Plus, Trash2, Edit2, Info, Settings, ChevronDown, ChevronUp } from 'lucide-react';
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

export function Markups() {
  const [blocos, setBlocos] = useState<MarkupBlock[]>([]);
  const [modalEdicaoNome, setModalEdicaoNome] = useState(false);
  const [blocoEditandoNome, setBlocoEditandoNome] = useState<MarkupBlock | null>(null);
  const [nomeTemp, setNomeTemp] = useState('');
  const [calculatedMarkups, setCalculatedMarkups] = useState<Map<string, CalculatedMarkup>>(new Map());

  // Submenus / períodos
  const [submenusAbertos, setSubmenusAbertos] = useState<Set<string>>(new Set());
  const [periodosAplicados, setPeriodosAplicados] = useState<Map<string, string>>(new Map());
  const [modalConfiguracaoAberto, setModalConfiguracaoAberto] = useState(false);
  const [blocoConfigurandoId, setBlocoConfigurandoId] = useState<string | null>(null);

  // Controle de carregamento de períodos
  const [isLoadingPeriodos, setIsLoadingPeriodos] = useState(true);

  const { loadConfiguration, saveConfiguration, invalidateCache } = useOptimizedUserConfigurations();
  const { toast } = useToast();
  const { user } = useAuth();
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Evitar loop de realtime quando a própria aba salva
  const selfWriteRef = useRef(false);

  // Bloco fixo informativo
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

  // Mapeamento das categorias
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

  // Carregar e calcular configs salvas
  const carregarConfiguracoesSalvas = useCallback(async () => {
    if (!user?.id || blocos.length === 0 || isLoadingPeriodos) {
      console.log('⏳ Aguardando carregamento dos períodos...');
      return;
    }

    console.log('🔄 Carregando configurações salvas para', blocos.length, 'blocos');

    const novosCalculatedMarkups = new Map<string, CalculatedMarkup>();

    const [{ data: despesasFixas }, { data: folhaPagamento }, { data: encargosVenda }] = await Promise.all([
      supabase.from('despesas_fixas').select('*').eq('user_id', user.id),
      supabase.from('folha_pagamento').select('*').eq('user_id', user.id),
      supabase.from('encargos_venda').select('*').eq('user_id', user.id)
    ]);

    const faturamentosConfig = await loadConfiguration('faturamentos_historicos');
    const todosFaturamentos = Array.isArray(faturamentosConfig)
      ? faturamentosConfig.map((f: any) => ({ ...f, mes: new Date(f.mes) }))
      : [];

    console.log('📊 Dados base:', {
      despesasFixas: despesasFixas?.length,
      folhaPagamento: folhaPagamento?.length,
      encargosVenda: encargosVenda?.length,
      faturamentos: todosFaturamentos.length
    });

    for (const bloco of blocos) {
      const configKey = `checkbox-states-${bloco.id}`;
      const config = await loadConfiguration(configKey);
      console.log(`📋 Processando ${bloco.nome} com configuração:`, config);

      // média por período selecionado do bloco
      const periodoSelecionado = periodosAplicados.get(bloco.id) || 'todos';
      let faturamentosFiltrados = todosFaturamentos;

      if (periodoSelecionado !== 'todos') {
        const mesesAtras = parseInt(String(periodoSelecionado), 10);
        const dataLimite = new Date();
        dataLimite.setMonth(dataLimite.getMonth() - mesesAtras);
        faturamentosFiltrados = todosFaturamentos.filter((f: any) => f.mes >= dataLimite);
      }

      let mediaMensal = 0;
      if (faturamentosFiltrados.length > 0) {
        const total = faturamentosFiltrados.reduce((acc: number, f: any) => acc + f.valor, 0);
        mediaMensal = total / faturamentosFiltrados.length;
      }

      console.log(`📅 "${bloco.nome}" período "${periodoSelecionado}" → média: ${mediaMensal}`);

      if (config && typeof config === 'object' && Object.keys(config).length > 0) {
        let gastosSobreFaturamento = 0;

        const despesasConsideradas = despesasFixas ? despesasFixas.filter((d) => config[d.id] && d.ativo) : [];
        const totalDespesasFixas = despesasConsideradas.reduce((acc, d) => acc + Number(d.valor), 0);

        const folhaConsiderada = folhaPagamento ? folhaPagamento.filter((f) => config[f.id] && f.ativo) : [];
        const totalFolhaPagamento = folhaConsiderada.reduce((acc, func) => {
          const custoMensal =
            func.custo_por_hora > 0 ? func.custo_por_hora * (func.horas_totais_mes || 173.2) : func.salario_base;
          return acc + Number(custoMensal);
        }, 0);

        const totalGastos = totalDespesasFixas + totalFolhaPagamento;

        if (mediaMensal > 0 && totalGastos > 0) {
          gastosSobreFaturamento = (totalGastos / mediaMensal) * 100;
        }

        const encargosConsiderados = encargosVenda ? encargosVenda.filter((e) => config[e.id] && e.ativo) : [];
        const valorEmReal = encargosConsiderados.reduce((acc, enc) => acc + Number(enc.valor_fixo || 0), 0);

        const categorias = encargosConsiderados.reduce(
          (acc, encargo) => {
            const categoria = getCategoriaByNome(encargo.nome);
            const valor = Number(encargo.valor_percentual || 0);
            switch (categoria) {
              case 'impostos':
                acc.impostos += valor;
                break;
              case 'meios_pagamento':
                acc.taxasMeiosPagamento += valor;
                break;
              case 'comissoes':
                acc.comissoesPlataformas += valor;
                break;
              case 'outros':
                acc.outros += valor;
                break;
            }
            return acc;
          },
          {
            gastoSobreFaturamento: Math.round(gastosSobreFaturamento * 100) / 100,
            impostos: 0,
            taxasMeiosPagamento: 0,
            comissoesPlataformas: 0,
            outros: 0,
            valorEmReal
          } as CalculatedMarkup
        );

        novosCalculatedMarkups.set(bloco.id, categorias);
      } else {
        novosCalculatedMarkups.set(bloco.id, {
          gastoSobreFaturamento: 0,
          impostos: 0,
          taxasMeiosPagamento: 0,
          comissoesPlataformas: 0,
          outros: 0,
          valorEmReal: 0
        });
      }
    }

    if (novosCalculatedMarkups.size > 0) {
      setCalculatedMarkups(novosCalculatedMarkups);
      console.log('✅ Markups recalculados');
    }
  }, [user?.id, blocos, loadConfiguration, getCategoriaByNome, periodosAplicados, isLoadingPeriodos]);

  // Submenu
  const toggleSubmenu = useCallback((blocoId: string) => {
    setSubmenusAbertos((prev) => {
      const s = new Set(prev);
      s.has(blocoId) ? s.delete(blocoId) : s.add(blocoId);
      return s;
    });
  }, []);

  // Aplicar configuração padrão (tudo ativo) — salva na MESMA chave lida
  const aplicarConfiguracaoPadrao = useCallback(
    async (blocoId: string) => {
      console.log(`🎯 Aplicando padrão para bloco ${blocoId}`);
      try {
        const { data: despesasFixas } = await supabase
          .from('despesas_fixas')
          .select('*')
          .eq('user_id', user?.id)
          .eq('ativo', true);
        const { data: folhaPagamento } = await supabase
          .from('folha_pagamento')
          .select('*')
          .eq('user_id', user?.id)
          .eq('ativo', true);
        const { data: encargosVenda } = await supabase
          .from('encargos_venda')
          .select('*')
          .eq('user_id', user?.id)
          .eq('ativo', true);

        const configuracaoPadrao = {
          despesasFixas: Object.fromEntries((despesasFixas || []).map((d) => [d.id, true])),
          folhaPagamento: Object.fromEntries((folhaPagamento || []).map((f) => [f.id, true])),
          encargosVenda: Object.fromEntries((encargosVenda || []).map((e) => [e.id, true]))
        };

        selfWriteRef.current = true;
        await saveConfiguration(`checkbox-states-${blocoId}`, configuracaoPadrao);
        setTimeout(() => (selfWriteRef.current = false), 500);

        setSubmenusAbertos((prev) => {
          const s = new Set(prev);
          s.delete(blocoId);
          return s;
        });

        await carregarConfiguracoesSalvas();

        toast({
          title: 'Configuração padrão aplicada!',
          description: 'Todos os itens ativos foram selecionados para o cálculo.',
          duration: 3000
        });
      } catch (error) {
        console.error('❌ Erro ao aplicar configuração padrão:', error);
        toast({
          title: 'Erro ao aplicar configuração',
          description: 'Tente novamente em alguns segundos.',
          variant: 'destructive'
        });
      }
    },
    [user?.id, saveConfiguration, carregarConfiguracoesSalvas, toast]
  );

  const abrirConfiguracaoCompleta = useCallback((blocoId: string) => {
    setBlocoConfigurandoId(blocoId);
    setModalConfiguracaoAberto(true);
    setSubmenusAbertos(new Set());
  }, []);

  const aplicarPeriodo = useCallback(
    async (blocoId: string, periodo: string) => {
      try {
        const periodoNormalizado = String(periodo);

        selfWriteRef.current = true;
        await saveConfiguration(`filtro-periodo-${blocoId}`, periodoNormalizado);
        setTimeout(() => (selfWriteRef.current = false), 500);

        setPeriodosAplicados((prev) => new Map(prev).set(blocoId, periodoNormalizado));

        setSubmenusAbertos((prev) => {
          const s = new Set(prev);
          s.delete(blocoId);
          return s;
        });

        await carregarConfiguracoesSalvas();

        toast({
          title: 'Período aplicado!',
          description: `Cálculos atualizados para ${
            periodo === '1'
              ? 'último mês'
              : periodo === '3'
              ? 'últimos 3 meses'
              : periodo === '6'
              ? 'últimos 6 meses'
              : periodo === '12'
              ? 'últimos 12 meses'
              : 'todos os períodos'
          }`,
          duration: 3000
        });
      } catch (error) {
        console.error('❌ Erro ao aplicar período:', error);
        toast({
          title: 'Erro ao aplicar período',
          description: 'Tente novamente em alguns segundos.',
          variant: 'destructive'
        });
      }
    },
    [saveConfiguration, carregarConfiguracoesSalvas, toast]
  );

  // Carregar períodos salvos
  useEffect(() => {
    const carregarPeriodos = async () => {
      if (!user?.id || blocos.length === 0) return;

      console.log('🔑 Carregando períodos salvos...');
      setIsLoadingPeriodos(true);

      const map = new Map<string, string>();
      const validos = new Set(['1', '3', '6', '12', 'todos']);

      for (const bloco of blocos) {
        try {
          const raw = await loadConfiguration(`filtro-periodo-${bloco.id}`);
          if (raw !== undefined && raw !== null) {
            let str = String(raw);
            if (!validos.has(str)) str = 'todos';
            map.set(bloco.id, str);
          } else {
            map.set(bloco.id, 'todos');
          }
        } catch {
          map.set(bloco.id, 'todos');
        }
      }

      setPeriodosAplicados(map);
      setIsLoadingPeriodos(false);
      console.log('✅ Períodos carregados');
    };

    carregarPeriodos();
  }, [user?.id, blocos, loadConfiguration]);

  // Fechar submenu ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (submenusAbertos.size > 0) {
        const target = event.target as Element;
        if (!target.closest('.relative')) setSubmenusAbertos(new Set());
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [submenusAbertos.size]);

  // Carregar blocos
  useEffect(() => {
    const carregarBlocos = async () => {
      try {
        const config = await loadConfiguration('markups_blocos');
        if (config && Array.isArray(config)) {
          setBlocos(config as unknown as MarkupBlock[]);
          console.log('📦 Blocos carregados:', config.length);
        }
      } catch (error) {
        console.error('Erro ao carregar blocos:', error);
      }
    };
    carregarBlocos();
  }, [loadConfiguration]);

  // Recalcular após períodos prontos
  useEffect(() => {
    if (blocos.length > 0 && user?.id && !isLoadingPeriodos) {
      carregarConfiguracoesSalvas();
    }
  }, [blocos.length, user?.id, isLoadingPeriodos, carregarConfiguracoesSalvas]);

  // Realtime (ignora self-writes e filtra tipos)
  useEffect(() => {
    if (!user?.id) return;

    console.log('🔄 Ativando realtime de configurações');
    const channel = supabase
      .channel('markup-config-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT,UPDATE',
          schema: 'public',
          table: 'user_configurations',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          if (selfWriteRef.current) return; // evita loop
          const rec: any = payload.new ?? payload.old;
          const t = rec?.type as string | undefined;

          if (
            t &&
            (t.startsWith('filtro-periodo-') ||
              t.startsWith('checkbox-states-') ||
              t === 'markups_blocos' ||
              t === 'faturamentos_historicos' ||
              t === 'despesas_fixas' ||
              t === 'folha_pagamento' ||
              t === 'encargos_venda')
          ) {
            invalidateCache();
            setTimeout(() => {
              carregarConfiguracoesSalvas();
            }, 300);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, carregarConfiguracoesSalvas, invalidateCache]);

  // Limpeza de timeouts
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
          selfWriteRef.current = true;
          await saveConfiguration('markups_blocos', novosBlocos);
          setTimeout(() => (selfWriteRef.current = false), 500);
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
    const novoBloco: MarkupBlock = {
      id: Date.now().toString(),
      nome: `Markup ${blocos.length + 1}`,
      gastoSobreFaturamento: 0,
      impostos: 0,
      taxasMeiosPagamento: 0,
      comissoesPlataformas: 0,
      outros: 0,
      valorEmReal: 0,
      lucroDesejado: 20
    };

    const novosBlocos = [...blocos, novoBloco];
    setBlocos(novosBlocos);

    // período padrão
    setPeriodosAplicados((prev) => {
      const m = new Map(prev);
      m.set(novoBloco.id, 'todos');
      return m;
    });

    selfWriteRef.current = true;
    saveConfiguration(`filtro-periodo-${novoBloco.id}`, 'todos')
      .catch((e) => console.warn('⚠️ Erro ao salvar período padrão:', e))
      .finally(() => setTimeout(() => (selfWriteRef.current = false), 500));

    selfWriteRef.current = true;
    saveConfiguration('markups_blocos', novosBlocos)
      .then(() => {
        toast({
          title: 'Bloco criado!',
          description: `O bloco "${novoBloco.nome}" foi criado com período padrão "todos".`
        });
      })
      .catch(() =>
        toast({
          title: 'Erro ao criar bloco',
          description: 'Não foi possível criar o novo bloco de markup',
          variant: 'destructive'
        })
      )
      .finally(() => setTimeout(() => (selfWriteRef.current = false), 500));
  };

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
        lucroDesejado: 0
      };

      const novosBlocos = [...blocos, novoBloco];
      setBlocos(novosBlocos);
      salvarBlocos(novosBlocos);

      setCalculatedMarkups((prev) => {
        const m = new Map(prev);
        m.set(novoBloco.id, markupCalculado);
        return m;
      });

      toast({
        title: 'Bloco criado com sucesso',
        description: `O bloco "${novoBloco.nome}" foi criado e configurado.`
      });
    } catch {
      toast({
        title: 'Erro ao criar bloco',
        description: 'Não foi possível criar o novo bloco de markup',
        variant: 'destructive'
      });
    }
  };

  const removerBloco = (id: string) => {
    const novosBlocos = blocos.filter((b) => b.id !== id);
    setBlocos(novosBlocos);
    salvarBlocos(novosBlocos);

    const m = new Map(calculatedMarkups);
    m.delete(id);
    setCalculatedMarkups(m);
  };

  const atualizarBloco = (id: string, campo: keyof MarkupBlock, valor: number) => {
    const novos = blocos.map((b) => (b.id === id ? { ...b, [campo]: valor } : b));
    setBlocos(novos);
    salvarBlocos(novos);
  };

  const calcularMarkupIdeal = (bloco: MarkupBlock, data?: CalculatedMarkup): number => {
    const v = data || calculatedMarkups.get(bloco.id);
    if (!v) return 1;

    const somaPercentuais =
      v.gastoSobreFaturamento +
      v.impostos +
      v.taxasMeiosPagamento +
      v.comissoesPlataformas +
      v.outros +
      bloco.lucroDesejado;

    const somaDecimais = somaPercentuais / 100;
    if (somaDecimais >= 1) return 1;

    const mk = 1 / (1 - somaDecimais);
    if (!isFinite(mk) || isNaN(mk)) return 1;
    return mk;
  };

  const iniciarEdicaoNome = (bloco: MarkupBlock) => {
    setBlocoEditandoNome(bloco);
    setNomeTemp(bloco.nome);
    setModalEdicaoNome(true);
  };

  const salvarNome = () => {
    if (blocoEditandoNome && nomeTemp.trim()) {
      const novos = blocos.map((b) => (b.id === blocoEditandoNome.id ? { ...b, nome: nomeTemp.trim() } : b));
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

        {/* Subreceita (informativo) */}
        <Card className="border-border shadow-lg">
          <CardHeader className="bg-muted/50">
            <div className="flex items-center justify-between">
              <CardTitle className="text-primary capitalize font-bold text-xl flex items-center gap-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-4 w-4 text-primary/70 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Percentuais máximos recomendados por categoria, com base em melhores práticas.</p>
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
                <div className="text-2xl font-bold text-primary">15%</div>
              </div>
              <div className="space-y-1">
                <Label className="text-sm font-medium text-muted-foreground">Impostos</Label>
                <div className="text-2xl font-bold text-primary">25%</div>
              </div>
              <div className="space-y-1">
                <Label className="text-sm font-medium text-muted-foreground">Taxas de meios de pagamento</Label>
                <div className="text-2xl font-bold text-primary">5%</div>
              </div>
              <div className="space-y-1">
                <Label className="text-sm font-medium text-muted-foreground">Comissões e plataformas</Label>
                <div className="text-2xl font-bold text-primary">10%</div>
              </div>
              <div className="space-y-1">
                <Label className="text-sm font-medium text-muted-foreground">Outros</Label>
                <div className="text-2xl font-bold text-primary">5%</div>
              </div>
              <div className="space-y-1">
                <Label className="text-sm font-medium text-muted-foreground">Valor em real</Label>
                <div className="text-2xl font-bold" style={{ color: 'hsl(var(--orange))' }}>{formatCurrency(200)}</div>
              </div>
              <div className="space-y-1">
                <Label className="text-sm font-medium text-muted-foreground">Lucro desejado sobre venda</Label>
                <div className="text-2xl font-bold" style={{ color: 'hsl(var(--accent))' }}>20%</div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t bg-primary/5 dark:bg-primary/10 -mx-6 px-6 pb-6">
              <div className="flex items-center justify-between">
                <Label className="text-lg font-semibold text-primary">Markup ideal</Label>
                <div className="text-3xl font-bold text-primary">2,50</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Blocos do usuário */}
        {blocos.map((bloco) => {
          const calculated = calculatedMarkups.get(bloco.id);
          const hasCalculated = calculated !== undefined;
          const markupIdeal = hasCalculated ? calcularMarkupIdeal(bloco, calculated) : 1;
          const showExpansion = submenusAbertos.has(bloco.id);

          return (
            <Card key={bloco.id} className="border-border">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-primary capitalize font-bold text-xl">{bloco.nome}</CardTitle>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" onClick={() => iniciarEdicaoNome(bloco)} className="h-8 w-8 p-0">
                      <Edit2 className="h-3 w-3" />
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => toggleSubmenu(bloco.id)}
                      className="h-8 px-3 flex items-center gap-1"
                    >
                      <Settings className="h-3 w-3" />
                      {showExpansion ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
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
                    <div className="text-2xl font-bold text-primary">
                      {hasCalculated ? formatPercentage(calculated!.gastoSobreFaturamento) : '0'} <span className="text-sm">%</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm font-medium text-muted-foreground">Impostos</Label>
                    <div className="text-2xl font-bold text-primary">
                      {hasCalculated ? formatPercentage(calculated!.impostos) : '0'} <span className="text-sm">%</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm font-medium text-muted-foreground">Taxas de meios de pagamento</Label>
                    <div className="text-2xl font-bold text-primary">
                      {hasCalculated ? formatPercentage(calculated!.taxasMeiosPagamento) : '0'} <span className="text-sm">%</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm font-medium text-muted-foreground">Comissões e plataformas</Label>
                    <div className="text-2xl font-bold text-primary">
                      {hasCalculated ? formatPercentage(calculated!.comissoesPlataformas) : '0'} <span className="text-sm">%</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm font-medium text-muted-foreground">Outros</Label>
                    <div className="text-2xl font-bold text-primary">
                      {hasCalculated ? formatPercentage(calculated!.outros) : '0'} <span className="text-sm">%</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm font-medium text-muted-foreground">Valor em real</Label>
                    <div className="text-2xl font-bold" style={{ color: 'hsl(var(--orange))' }}>
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
                        className="font-bold"
                        style={{ color: 'hsl(var(--accent))' }}
                      />
                      <span className="font-bold" style={{ color: 'hsl(var(--accent))' }}>%</span>
                    </div>
                  </div>
                </div>

                {/* Expansão de Configuração */}
                <div
                  className={`overflow-hidden transition-all duration-300 ease-in-out ${
                    showExpansion ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'
                  }`}
                >
                  {showExpansion && (
                    <div className="border-t pt-4 mt-4 space-y-4 animate-fade-in">
                      <div className="text-sm font-medium text-muted-foreground">Configurações de Custos - {bloco.nome}</div>

                      {/* Período */}
                      <div className="bg-muted/20 rounded-lg p-4">
                        <h4 className="font-medium mb-3 text-sm flex items-center gap-2">📅 Período de Análise:</h4>
                        <div className="grid grid-cols-2 gap-2 mb-4">
                          {[
                            { value: '1', label: '1 mês' },
                            { value: '3', label: '3 meses' },
                            { value: '6', label: '6 meses' },
                            { value: '12', label: '12 meses' }
                          ].map((p) => (
                            <Button
                              key={p.value}
                              variant={periodosAplicados.get(bloco.id) === p.value ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => aplicarPeriodo(bloco.id, p.value)}
                              className="text-xs"
                            >
                              {p.label}
                              {periodosAplicados.get(bloco.id) === p.value && <span className="ml-1 text-xs">✓</span>}
                            </Button>
                          ))}
                        </div>

                        <Button
                          variant={periodosAplicados.get(bloco.id) === 'todos' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => aplicarPeriodo(bloco.id, 'todos')}
                          className="w-full text-xs mb-4"
                        >
                          Todos os períodos
                          {periodosAplicados.get(bloco.id) === 'todos' && <span className="ml-1 text-xs">✓</span>}
                        </Button>
                      </div>

                      {/* Ações rápidas */}
                      <div className="bg-muted/20 rounded-lg p-4">
                        <h4 className="font-medium mb-3 text-sm flex items-center gap-2">⚙️ Configurações:</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          <Button onClick={() => abrirConfiguracaoCompleta(bloco.id)} variant="outline" size="sm" className="text-xs">
                            🔧 Configurar Itens
                          </Button>

                          <Button onClick={() => aplicarConfiguracaoPadrao(bloco.id)} variant="outline" size="sm" className="text-xs">
                            ⚡ Aplicar Padrão
                          </Button>
                        </div>
                      </div>

                      {/* Status */}
                      {periodosAplicados.has(bloco.id) && (
                        <div className="bg-card border rounded-lg p-3 text-xs">
                          <div className="flex justify-between items-center">
                            <div className="text-primary font-medium">
                              ✓ Período aplicado:{' '}
                              {periodosAplicados.get(bloco.id) === '1'
                                ? 'Último mês'
                                : periodosAplicados.get(bloco.id) === '3'
                                ? 'Últimos 3 meses'
                                : periodosAplicados.get(bloco.id) === '6'
                                ? 'Últimos 6 meses'
                                : periodosAplicados.get(bloco.id) === '12'
                                ? 'Últimos 12 meses'
                                : 'Todos os períodos'}
                            </div>
                            <div className="text-primary font-bold">
                              Markup: {hasCalculated ? markupIdeal.toFixed(4) : '1.0000'}
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="text-center pt-2">
                        <Button onClick={() => toggleSubmenu(bloco.id)} variant="ghost" size="sm" className="text-xs">
                          Fechar Configurações
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-6 pt-4 border-t bg-primary/5 dark:bg-primary/10 -mx-6 px-6 pb-6">
                  <div className="flex items-center justify-between">
                    <Label className="text-lg font-semibold text-primary">Markup ideal</Label>
                    <div className="text-3xl font-bold text-primary">
                      {isFinite(markupIdeal) && !isNaN(markupIdeal) ? markupIdeal.toFixed(4) : '1.0000'}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Modal de Configuração de Itens */}
      {modalConfiguracaoAberto && blocoConfigurandoId && (
        <CustosModal
          open={modalConfiguracaoAberto}
          onOpenChange={(open) => {
            setModalConfiguracaoAberto(open);
            if (!open) setBlocoConfigurandoId(null);
          }}
          markupBlock={blocos.find((b) => b.id === blocoConfigurandoId)}
          onMarkupUpdate={(markup) => {
            if (!blocoConfigurandoId) return;
            const calculatedMarkup: CalculatedMarkup = {
              gastoSobreFaturamento: markup.gastoSobreFaturamento || 0,
              impostos: markup.impostos || 0,
              taxasMeiosPagamento: markup.taxasMeiosPagamento || 0,
              comissoesPlataformas: markup.comissoesPlataformas || 0,
              outros: markup.outros || 0,
              valorEmReal: markup.valorEmReal || 0
            };
            const m = new Map(calculatedMarkups);
            m.set(blocoConfigurandoId, calculatedMarkup);
            setCalculatedMarkups(m);
            toast({
              title: 'Configuração aplicada!',
              description: 'Os cálculos foram atualizados com os itens selecionados.',
              duration: 3000
            });
          }}
        />
      )}

      <Dialog open={modalEdicaoNome} onOpenChange={setModalEdicaoNome}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Nome do Bloco</DialogTitle>
          </DialogHeader>
        </DialogContent>
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
          <Button onClick={salvarNome}>Salvar</Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
