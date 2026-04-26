import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { NumericInputPtBr } from '@/components/ui/numeric-input-ptbr';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { MarkupCard } from './MarkupCard';
import { formatBRL } from '@/lib/formatters';
import { toast } from 'sonner';
import { Info, AlertTriangle, ChevronDown, Check, TrendingUp, Package, DollarSign, Weight, Scale, Calculator, PieChart } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ReceitaCompleta } from '@/types/receitas';

interface PrecificacaoTabProps {
  mode?: 'create' | 'edit';
  receita: ReceitaCompleta | any;
  formData: any;
  onFormChange: (field: string, value: any) => void;
  onUpdate?: () => Promise<void>;
}

export function PrecificacaoTab({ mode = 'edit', receita, formData, onFormChange, onUpdate }: PrecificacaoTabProps) {
  const { user } = useAuth();
  const [custoTotal, setCustoTotal] = useState(0);
  const [markups, setMarkups] = useState<any[]>([]);
  const [markupSubReceita, setMarkupSubReceita] = useState<any | null>(null);
  const [isApplying, setIsApplying] = useState(false);
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [markupConfigsMap, setMarkupConfigsMap] = useState<Record<string, any>>({});
  const [isLoadingConfigs, setIsLoadingConfigs] = useState(true);

  useEffect(() => {
    const calcularCustoTotal = () => {
      const ingredientes = receita?.ingredientes ?? [];
      const embalagens = receita?.embalagens ?? [];
      const maoObra = receita?.mao_obra ?? [];
      const subReceitas = receita?.sub_receitas ?? [];

      const custoIngredientes = ingredientes.reduce((sum: number, i: any) => {
        if (!i.produto) return sum;
        const custoUnitario = i.produto.unidade_uso 
          ? i.produto.custo_unitario / (i.produto.fator_conversao || 1)
          : i.produto.custo_unitario;
        return sum + (custoUnitario * i.quantidade);
      }, 0);
      
      const custoEmbalagens = embalagens.reduce((sum: number, e: any) => {
        if (!e.produto) return sum;
        const custoUnitario = e.produto.unidade_uso 
          ? e.produto.custo_unitario / (e.produto.fator_conversao || 1)
          : e.produto.custo_unitario;
        return sum + (custoUnitario * e.quantidade);
      }, 0);
      
      const custoMaoObra = maoObra.reduce((sum: number, m: any) => sum + m.valor_total, 0);
      
      const custoSubReceitas = subReceitas.reduce((sum: number, s: any) => {
        if (!s.sub_receita) return sum;
        const custoUnitario = s.sub_receita.rendimento_valor && s.sub_receita.rendimento_valor > 0
          ? s.sub_receita.preco_venda / s.sub_receita.rendimento_valor
          : s.sub_receita.preco_venda;
        return sum + (custoUnitario * s.quantidade);
      }, 0);
      
      return custoIngredientes + custoEmbalagens + custoMaoObra + custoSubReceitas;
    };

    setCustoTotal(calcularCustoTotal());
  }, [receita]);

  const loadMarkups = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('markups')
        .select('*')
        .eq('user_id', user.id)
        .eq('tipo', 'normal')
        .eq('ativo', true);
      if (error) throw error;
      setMarkups(data || []);
    } catch (error: any) {
      console.error('Erro ao carregar markups:', error);
      toast.error('Erro ao carregar markups');
    }
  }, [user]);

  const loadMarkupSubReceita = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('markups')
        .select('*')
        .eq('user_id', user.id)
        .eq('tipo', 'sub_receita')
        .eq('ativo', true)
        .maybeSingle();
      if (error && error.code !== 'PGRST116') throw error;
      setMarkupSubReceita(data);
    } catch (error: any) {
      console.error('Erro ao carregar markup de sub-receitas:', error);
    }
  }, [user]);

  // Prefetch all markup configs in a single query
  const loadMarkupConfigs = useCallback(async () => {
    if (!user) {
      setIsLoadingConfigs(false);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('user_configurations')
        .select('type, configuration')
        .eq('user_id', user.id)
        .ilike('type', 'markup_%');
      
      if (error) throw error;
      
      const map: Record<string, any> = {};
      (data || []).forEach((item: any) => {
        map[item.type] = item.configuration;
      });
      setMarkupConfigsMap(map);
    } catch (error) {
      console.error('Erro ao carregar configs de markup:', error);
    } finally {
      setIsLoadingConfigs(false);
    }
  }, [user]);

  useEffect(() => {
    loadMarkups();
    loadMarkupSubReceita();
    loadMarkupConfigs();
  }, [loadMarkups, loadMarkupSubReceita, loadMarkupConfigs]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('receita-markups-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'markups', filter: `user_id=eq.${user.id}` }, () => {
        loadMarkups();
        loadMarkupSubReceita();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, loadMarkups, loadMarkupSubReceita]);

  useEffect(() => {
    if (!formData.markup_id || !user || !markupSubReceita) return;
    if (formData.markup_id !== markupSubReceita.id) return;
    onFormChange('preco_venda', custoTotal);
  }, [custoTotal, formData.markup_id, markupSubReceita, user, mode, receita?.id, onFormChange]);

  useEffect(() => {
    if (!markupSubReceita || !formData.markup_id || !user) return;
    if (formData.markup_id !== markupSubReceita.id) return;
    if (Math.abs(formData.preco_venda - custoTotal) > 0.001 && custoTotal > 0) {
      onFormChange('preco_venda', custoTotal);
    }
  }, [markupSubReceita, formData.markup_id, formData.preco_venda, custoTotal, user, onFormChange]);

  const handleSelectMarkup = async (markupId: string) => {
    const allMarkups = markupSubReceita ? [markupSubReceita, ...markups] : markups;
    const markup = allMarkups.find(m => m.id === markupId);
    if (!markup || !user) {
      toast.error('Erro: Markup ou usuário não encontrado');
      return;
    }

    setIsApplying(true);
    setSelectorOpen(false);

    try {
      onFormChange('markup_id', markupId);
      onFormChange('markup_tipo', markup.tipo);
      
      const configKey = `markup_${markup.nome.toLowerCase().replace(/\s+/g, '_')}`;
      const { data } = await supabase
        .from('user_configurations')
        .select('configuration')
        .eq('user_id', user.id)
        .eq('type', configKey)
        .maybeSingle();

      const detalhes = data?.configuration as any;
      const valorEmReal = detalhes?.valorEmReal ?? 0;

      let custoBase: number;
      if (markup.tipo !== 'sub_receita' && receita.rendimento_valor && receita.rendimento_valor > 0) {
        custoBase = custoTotal / receita.rendimento_valor;
      } else {
        custoBase = custoTotal;
      }

      let precoVenda: number;
      if (valorEmReal > 0) {
        const totalPercentuais = 
          (detalhes?.gastoSobreFaturamento ?? 0) + (detalhes?.impostos ?? 0) + 
          (detalhes?.taxas ?? 0) + (detalhes?.comissoes ?? 0) + 
          (detalhes?.outros ?? 0) + (detalhes?.lucroDesejado ?? markup.margem_lucro);
        const baseCalculo = custoBase + valorEmReal;
        const divisor = 1 - (totalPercentuais / 100);
        precoVenda = divisor > 0 ? baseCalculo / divisor : baseCalculo * 2;
      } else {
        precoVenda = custoBase * markup.markup_ideal;
      }

      if (markup.tipo === 'sub_receita') {
        onFormChange('preco_venda', precoVenda);
        toast.success('Markup de sub-receitas selecionado!', { duration: 3000 });
      } else {
        toast.success('Markup selecionado!');
      }
    } catch (error: any) {
      console.error('Erro ao salvar markup:', error);
      toast.error('Erro ao salvar o markup: ' + error.message);
    } finally {
      setIsApplying(false);
    }
  };

  const isMarkupSubReceitaAtual = formData.markup_id && markupSubReceita && formData.markup_id === markupSubReceita.id;

  const precoKg = formData.peso_unitario > 0
    ? (formData.preco_venda / formData.peso_unitario) * 1000 
    : 0;

  const ingredientesResumo = receita?.ingredientes ?? [];
  const embalagensResumo = receita?.embalagens ?? [];
  const maoObraResumo = receita?.mao_obra ?? [];
  const subReceitasResumo = receita?.sub_receitas ?? [];

  const custoIngredientes = ingredientesResumo.reduce((sum: number, i: any) => {
    if (!i.produto) return sum;
    const cu = i.produto.unidade_uso 
      ? i.produto.custo_unitario / (i.produto.fator_conversao || 1)
      : i.produto.custo_unitario;
    return sum + (cu * i.quantidade);
  }, 0);
  const custoEmbalagens = embalagensResumo.reduce((sum: number, e: any) => {
    if (!e.produto) return sum;
    const cu = e.produto.unidade_uso 
      ? e.produto.custo_unitario / (e.produto.fator_conversao || 1)
      : e.produto.custo_unitario;
    return sum + (cu * e.quantidade);
  }, 0);
  const custoMaoObra = maoObraResumo.reduce((sum: number, m: any) => sum + m.valor_total, 0);
  const custoSubReceitas = subReceitasResumo.reduce((sum: number, s: any) => {
    if (!s.sub_receita) return sum;
    const cu = s.sub_receita.rendimento_valor && s.sub_receita.rendimento_valor > 0
      ? s.sub_receita.preco_venda / s.sub_receita.rendimento_valor
      : s.sub_receita.preco_venda;
    return sum + (cu * s.quantidade);
  }, 0);

  const allMarkups = markupSubReceita ? [markupSubReceita, ...markups] : markups;
  const selectedMarkup = allMarkups.find(m => m.id === formData.markup_id);
  const hasNoMarkups = allMarkups.length === 0;

  return (
    <div className="space-y-6">
      {/* Cost Summary */}
      <Card className="overflow-hidden">
        <div className="h-1 w-full bg-gradient-to-r from-[hsl(205,96%,46%)] via-[hsl(273,63%,42%)] to-[hsl(25,95%,51%)]" />
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-display">Resumo de Custos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-5 gap-3">
            <CostItem label="Ingredientes" value={custoIngredientes} />
            <CostItem label="Embalagens" value={custoEmbalagens} />
            <CostItem label="Mão de Obra" value={custoMaoObra} />
            <CostItem label="Sub-receitas" value={custoSubReceitas} />
            <CostItem label="Total" value={custoTotal} highlight />
          </div>
        </CardContent>
      </Card>

      {/* Price / Weight inputs */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="overflow-hidden">
          <div className="h-0.5 bg-primary/40" />
          <CardHeader className="pb-2 pt-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-primary" />
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Preço de Venda (un.)
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pb-4">
            <NumericInputPtBr
              tipo="valor"
              value={formData.preco_venda || 0}
              onChange={(value) => onFormChange('preco_venda', value)}
              disabled={isMarkupSubReceitaAtual}
              className={cn(
                "!text-3xl font-bold font-display border-0 p-0 !h-auto bg-transparent focus:ring-0 focus-visible:ring-0",
                isMarkupSubReceitaAtual 
                  ? 'text-muted-foreground cursor-not-allowed' 
                  : 'text-primary'
              )}
              placeholder="R$ 0,00"
            />
            {isMarkupSubReceitaAtual && (
              <p className="text-[11px] text-muted-foreground mt-2">
                Calculado automaticamente pelo markup
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <div className="h-0.5 bg-accent/40" />
          <CardHeader className="pb-2 pt-4">
            <div className="flex items-center gap-2">
              <Weight className="h-4 w-4 text-accent" />
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Peso Unitário (g)
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pb-4">
            <NumericInputPtBr
              tipo="quantidade_continua"
              value={formData.peso_unitario || 0}
              onChange={(value) => onFormChange('peso_unitario', value)}
              className="!text-3xl font-bold font-display text-foreground border-0 p-0 !h-auto bg-transparent focus-visible:ring-0"
              placeholder="0"
            />
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <div className="h-0.5 bg-secondary/40" />
          <CardHeader className="pb-2 pt-4">
            <div className="flex items-center gap-2">
              <Scale className="h-4 w-4 text-secondary" />
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Preço por KG
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pb-4">
            <p className="text-3xl font-bold font-display text-secondary">
              R$ {formatBRL(precoKg)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Custo Unitário & CMV */}
      {(() => {
        const rendimento = formData.rendimento_valor || receita?.rendimento_valor || 0;
        const isSubReceita = selectedMarkup?.tipo === 'sub_receita';
        const custoUnitario = isSubReceita || rendimento <= 0
          ? custoTotal
          : custoTotal / rendimento;
        const precoVenda = formData.preco_venda || 0;
        const cmv = precoVenda > 0 ? (custoUnitario / precoVenda) * 100 : null;
        const cmvColor = cmv === null
          ? 'text-muted-foreground'
          : cmv <= 30
            ? 'text-emerald-600 dark:text-emerald-400'
            : cmv <= 45
              ? 'text-amber-600 dark:text-amber-400'
              : 'text-destructive';

        return (
          <div className="grid grid-cols-2 gap-4">
            <Card className="overflow-hidden">
              <div className="h-0.5 bg-secondary/40" />
              <CardHeader className="pb-2 pt-4">
                <div className="flex items-center gap-2">
                  <Calculator className="h-4 w-4 text-secondary" />
                  <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Custo Unitário
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pb-4">
                <p className="text-3xl font-bold font-display text-foreground">
                  R$ {formatBRL(custoUnitario)}
                </p>
                {!isSubReceita && rendimento > 0 && (
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Rendimento: {rendimento} {formData.rendimento_unidade || receita?.rendimento_unidade || 'un'}
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className="overflow-hidden">
              <div className="h-0.5 bg-primary/40" />
              <CardHeader className="pb-2 pt-4">
                <div className="flex items-center gap-2">
                  <PieChart className="h-4 w-4 text-primary" />
                  <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    CMV
                  </CardTitle>
                  <TooltipProvider delayDuration={200}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="cursor-help text-muted-foreground/70 text-xs">ⓘ</span>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-[260px]">
                        <p className="text-xs">Custo de Mercadoria Vendida: % do preço consumido pelo custo da receita. Verde ≤30%, Amarelo ≤45%, Vermelho &gt;45%.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </CardHeader>
              <CardContent className="pb-4">
                <p className={cn("text-3xl font-bold font-display", cmvColor)}>
                  {cmv === null ? '—' : `${cmv.toFixed(1).replace('.', ',')}%`}
                </p>
                {cmv !== null && (
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {cmv <= 30 ? 'Excelente margem' : cmv <= 45 ? 'Margem saudável' : 'Margem comprimida'}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        );
      })()}

      {/* Markup Selector */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <TrendingUp className="h-4 w-4 text-primary-foreground" />
            </div>
            <div>
              <CardTitle className="text-base font-display">Markup da Receita</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Selecione o markup para calcular a precificação
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {hasNoMarkups ? (
            <div className="text-center py-8 text-muted-foreground border border-dashed border-border/60 rounded-2xl">
              <AlertTriangle className="h-10 w-10 mx-auto mb-3 text-amber-500/70" />
              <p className="font-semibold text-sm">Nenhum markup configurado</p>
              <p className="text-xs mt-1 text-muted-foreground">Vá para a aba Precificação para criar seus markups.</p>
            </div>
          ) : (
            <>
              {/* Custom markup selector */}
              <Popover open={selectorOpen} onOpenChange={setSelectorOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className={cn(
                      "w-full justify-between h-auto py-3 px-4 rounded-xl border-border/60",
                      "hover:bg-muted/50 transition-all",
                      selectedMarkup && "border-primary/30 bg-primary/[0.03]"
                    )}
                  >
                    {selectedMarkup ? (
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0",
                          selectedMarkup.tipo === 'sub_receita'
                            ? "bg-emerald-500/10 text-emerald-600"
                            : "bg-primary/10 text-primary"
                        )}>
                          {selectedMarkup.tipo === 'sub_receita' 
                            ? <Package className="h-4 w-4" /> 
                            : <TrendingUp className="h-4 w-4" />
                          }
                        </div>
                        <div className="text-left">
                          <div className="font-semibold text-sm">{selectedMarkup.nome}</div>
                          <div className="text-xs text-muted-foreground">
                            {selectedMarkup.tipo === 'sub_receita' 
                              ? 'Sub-receita • Preço = Custo' 
                              : `Markup ${selectedMarkup.markup_ideal.toFixed(4)} • ${selectedMarkup.periodo} meses`
                            }
                          </div>
                        </div>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">Selecione um markup...</span>
                    )}
                    <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0 ml-2" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-2 rounded-xl" align="start">
                  <div className="space-y-1">
                    {markupSubReceita && (
                      <MarkupOption
                        markup={markupSubReceita}
                        isSelected={formData.markup_id === markupSubReceita.id}
                        onSelect={() => handleSelectMarkup(markupSubReceita.id)}
                        type="sub_receita"
                      />
                    )}
                    {markupSubReceita && markups.length > 0 && (
                      <div className="border-t border-border/40 my-1.5" />
                    )}
                    {markups.map((m) => (
                      <MarkupOption
                        key={m.id}
                        markup={m}
                        isSelected={formData.markup_id === m.id}
                        onSelect={() => handleSelectMarkup(m.id)}
                        type="normal"
                      />
                    ))}
                  </div>
                </PopoverContent>
              </Popover>

              {/* Warning if no markup selected */}
              {!formData.markup_id && (
                <div className="flex items-center gap-3 p-3.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/40 rounded-xl">
                  <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0" />
                  <p className="text-sm text-amber-700 dark:text-amber-300">
                    Selecione um markup para ativar os cálculos de precificação.
                  </p>
                </div>
              )}

              {/* Sub-recipe info */}
              {isMarkupSubReceitaAtual && (
                <div className="flex items-start gap-3 p-4 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-800/30 rounded-xl">
                  <Info className="h-4 w-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-sm text-emerald-900 dark:text-emerald-100">Sub-receita</h4>
                    <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-0.5">
                      O preço de venda é igual ao custo total. Esta receita ficará disponível para uso dentro de outras receitas.
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {selectedMarkup && (
        <MarkupCard
          key={selectedMarkup.id}
          markup={selectedMarkup}
          custoTotal={custoTotal}
          precoVenda={formData.preco_venda || 0}
          isSelected={true}
          onSelect={() => {}}
          alwaysExpanded={true}
          isApplying={isApplying}
          rendimentoValor={formData.rendimento_valor}
          preloadedDetalhes={
            markupConfigsMap[`markup_${selectedMarkup.nome.toLowerCase().replace(/\s+/g, '_')}`] ?? null
          }
          isLoadingPreloaded={isLoadingConfigs}
        />
      )}
    </div>
  );
}

function CostItem({ label, value, highlight = false }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className={cn(
      "rounded-xl p-3 text-center",
      highlight 
        ? "bg-gradient-to-br from-primary to-secondary text-primary-foreground shadow-md shadow-primary/15" 
        : "bg-muted/50"
    )}>
      <div className={cn(
        "text-[11px] font-medium uppercase tracking-wider mb-1",
        highlight ? "text-primary-foreground/80" : "text-muted-foreground"
      )}>
        {label}
      </div>
      <div className={cn("text-sm font-bold font-display", highlight && "text-primary-foreground")}>
        R$ {formatBRL(value)}
      </div>
    </div>
  );
}

function MarkupOption({ markup, isSelected, onSelect, type }: { 
  markup: any; isSelected: boolean; onSelect: () => void; type: string 
}) {
  return (
    <button
      onClick={onSelect}
      className={cn(
        "w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all",
        "hover:bg-muted/80",
        isSelected && "bg-primary/5 ring-1 ring-primary/20"
      )}
    >
      <div className={cn(
        "h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0",
        type === 'sub_receita'
          ? "bg-emerald-500/10 text-emerald-600"
          : "bg-primary/10 text-primary"
      )}>
        {type === 'sub_receita' ? <Package className="h-4 w-4" /> : <TrendingUp className="h-4 w-4" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm truncate">{markup.nome}</div>
        <div className="text-xs text-muted-foreground">
          {type === 'sub_receita' 
            ? 'Preço = Custo Total' 
            : `Markup ${markup.markup_ideal.toFixed(4)} • ${markup.periodo} meses`
          }
        </div>
      </div>
      {isSelected && (
        <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
          <Check className="h-3 w-3 text-primary-foreground" />
        </div>
      )}
    </button>
  );
}
