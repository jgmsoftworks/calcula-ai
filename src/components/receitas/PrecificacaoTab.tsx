import { useState, useEffect, useCallback } from 'react';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { NumericInputPtBr } from '@/components/ui/numeric-input-ptbr';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { MarkupCard } from './MarkupCard';
import { formatBRL } from '@/lib/formatters';
import { toast } from 'sonner';
import { Info, ChevronDown, AlertTriangle } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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

  useEffect(() => {
    const calcularCustoTotal = () => {
      const ingredientes = receita?.ingredientes ?? [];
      const embalagens = receita?.embalagens ?? [];
      const maoObra = receita?.mao_obra ?? [];
      const subReceitas = receita?.sub_receitas ?? [];

      const custoIngredientes = ingredientes.reduce((sum, i) => {
        if (!i.produto) return sum;
        const custoUnitario = i.produto.unidade_uso 
          ? i.produto.custo_unitario / (i.produto.fator_conversao || 1)
          : i.produto.custo_unitario;
        return sum + (custoUnitario * i.quantidade);
      }, 0);
      
      const custoEmbalagens = embalagens.reduce((sum, e) => {
        if (!e.produto) return sum;
        const custoUnitario = e.produto.unidade_uso 
          ? e.produto.custo_unitario / (e.produto.fator_conversao || 1)
          : e.produto.custo_unitario;
        return sum + (custoUnitario * e.quantidade);
      }, 0);
      
      const custoMaoObra = maoObra.reduce((sum, m) => sum + m.valor_total, 0);
      
      const custoSubReceitas = subReceitas.reduce((sum, s) => {
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

  useEffect(() => {
    loadMarkups();
    loadMarkupSubReceita();
  }, [loadMarkups, loadMarkupSubReceita]);

  // Real-time updates para markups
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('receita-markups-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'markups',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          loadMarkups();
          loadMarkupSubReceita();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, loadMarkups, loadMarkupSubReceita]);

  // Recálculo automático APENAS para sub-receitas quando custos mudam
  useEffect(() => {
    if (!formData.markup_id || !user || !markupSubReceita) return;
    const isSubReceitaMarkup = formData.markup_id === markupSubReceita.id;
    if (!isSubReceitaMarkup) return;
    
    const precoVenda = custoTotal;
    onFormChange('preco_venda', precoVenda);
  }, [custoTotal, formData.markup_id, markupSubReceita, user, mode, receita?.id, onFormChange]);

  // Verificação de consistência ao abrir receita
  useEffect(() => {
    if (!markupSubReceita || !formData.markup_id || !user) return;
    const isSubReceita = formData.markup_id === markupSubReceita.id;
    if (!isSubReceita) return;
    
    const diferencaSignificativa = Math.abs(formData.preco_venda - custoTotal) > 0.001;
    if (diferencaSignificativa && custoTotal > 0) {
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
          (detalhes?.gastoSobreFaturamento ?? 0) + 
          (detalhes?.impostos ?? 0) + 
          (detalhes?.taxas ?? 0) + 
          (detalhes?.comissoes ?? 0) + 
          (detalhes?.outros ?? 0) + 
          (detalhes?.lucroDesejado ?? markup.margem_lucro);
        
        const baseCalculo = custoBase + valorEmReal;
        const divisor = 1 - (totalPercentuais / 100);
        precoVenda = divisor > 0 ? baseCalculo / divisor : baseCalculo * 2;
      } else {
        precoVenda = custoBase * markup.markup_ideal;
      }

      if (markup.tipo === 'sub_receita') {
        onFormChange('preco_venda', precoVenda);
      }

      if (markup.tipo === 'sub_receita') {
        toast.success('✅ Markup de sub-receitas selecionado!', { duration: 3000 });
      } else {
        toast.success('✅ Markup selecionado!');
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

  // Resumo de custos
  const ingredientesResumo = receita?.ingredientes ?? [];
  const embalagensResumo = receita?.embalagens ?? [];
  const maoObraResumo = receita?.mao_obra ?? [];
  const subReceitasResumo = receita?.sub_receitas ?? [];

  const custoIngredientes = ingredientesResumo.reduce((sum, i) => {
    if (!i.produto) return sum;
    const cu = i.produto.unidade_uso 
      ? i.produto.custo_unitario / (i.produto.fator_conversao || 1)
      : i.produto.custo_unitario;
    return sum + (cu * i.quantidade);
  }, 0);
  
  const custoEmbalagens = embalagensResumo.reduce((sum, e) => {
    if (!e.produto) return sum;
    const cu = e.produto.unidade_uso 
      ? e.produto.custo_unitario / (e.produto.fator_conversao || 1)
      : e.produto.custo_unitario;
    return sum + (cu * e.quantidade);
  }, 0);
  
  const custoMaoObra = maoObraResumo.reduce((sum, m) => sum + m.valor_total, 0);
  
  const custoSubReceitas = subReceitasResumo.reduce((sum, s) => {
    if (!s.sub_receita) return sum;
    const cu = s.sub_receita.rendimento_valor && s.sub_receita.rendimento_valor > 0
      ? s.sub_receita.preco_venda / s.sub_receita.rendimento_valor
      : s.sub_receita.preco_venda;
    return sum + (cu * s.quantidade);
  }, 0);

  // All markups combined for the select
  const allMarkups = markupSubReceita ? [markupSubReceita, ...markups] : markups;
  const selectedMarkup = allMarkups.find(m => m.id === formData.markup_id);
  const hasNoMarkups = allMarkups.length === 0;

  return (
    <div className="space-y-6">
      {/* Resumo de Custos */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Resumo de Custos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Ingredientes:</span>
            <span className="font-medium">R$ {formatBRL(custoIngredientes)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Embalagens:</span>
            <span className="font-medium">R$ {formatBRL(custoEmbalagens)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Mão de Obra:</span>
            <span className="font-medium">R$ {formatBRL(custoMaoObra)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Sub-receitas:</span>
            <span className="font-medium">R$ {formatBRL(custoSubReceitas)}</span>
          </div>
          <div className="flex justify-between pt-2 border-t font-bold">
            <span>Total:</span>
            <span className="text-primary">R$ {formatBRL(custoTotal)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Seleção de Markup */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Markup da Receita</CardTitle>
          <p className="text-sm text-muted-foreground">
            Selecione o markup que será usado para calcular o preço de venda desta receita.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {hasNoMarkups ? (
            <div className="text-center py-6 text-muted-foreground border border-dashed rounded-lg">
              <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-amber-500" />
              <p className="font-medium">Nenhum markup configurado</p>
              <p className="text-sm mt-1">Vá para a aba Precificação para criar seus markups.</p>
            </div>
          ) : (
            <>
              <Select
                value={formData.markup_id || ''}
                onValueChange={(value) => handleSelectMarkup(value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione um markup..." />
                </SelectTrigger>
                <SelectContent>
                  {markupSubReceita && (
                    <SelectItem value={markupSubReceita.id}>
                      🔗 {markupSubReceita.nome} (Sub-receita)
                    </SelectItem>
                  )}
                  {markups.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      📊 {m.nome} — Markup {m.markup_ideal.toFixed(4)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {!formData.markup_id && (
                <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg">
                  <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-amber-800 dark:text-amber-200">
                    Selecione um markup para que os cálculos de precificação sejam aplicados à receita.
                  </p>
                </div>
              )}

              {/* Info box para sub-receita */}
              {isMarkupSubReceitaAtual && (
                <div className="flex items-start gap-3 p-4 border-2 border-green-500 bg-green-50 dark:bg-green-950 rounded-lg">
                  <Info className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-green-900 dark:text-green-100 mb-1">
                      Markup de Sub-receitas
                    </h4>
                    <p className="text-sm text-green-800 dark:text-green-200">
                      Esta receita está marcada como <strong>sub-receita</strong>. O preço de venda é igual ao custo total 
                      e ela ficará disponível para ser usada dentro de outras receitas na aba "Sub-receitas".
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Cards de preço/peso */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-blue-50 dark:bg-blue-950">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Preço de Venda (R$/un.)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <NumericInputPtBr
              tipo="valor"
              value={formData.preco_venda || 0}
              onChange={(value) => onFormChange('preco_venda', value)}
              disabled={isMarkupSubReceitaAtual}
              className={`text-4xl font-bold border-0 p-0 h-auto bg-transparent focus:ring-0 ${
                isMarkupSubReceitaAtual 
                  ? 'text-muted-foreground cursor-not-allowed' 
                  : 'text-blue-600 dark:text-blue-400'
              }`}
              placeholder="R$ 0,00"
            />
            {isMarkupSubReceitaAtual && (
              <p className="text-xs text-muted-foreground mt-2">
                ⚠️ Preço calculado automaticamente pelo markup de sub-receita
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Peso Unitário (g)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <NumericInputPtBr
              tipo="quantidade_continua"
              value={formData.peso_unitario || 0}
              onChange={(value) => onFormChange('peso_unitario', value)}
              className="text-4xl font-bold text-primary border-0 p-0 h-auto bg-transparent focus-visible:ring-0"
              placeholder="0"
            />
          </CardContent>
        </Card>

        <Card className="bg-blue-50 dark:bg-blue-950">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Preço por KG
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold text-blue-600 dark:text-blue-400">
              R$ {formatBRL(precoKg)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detalhes do markup selecionado */}
      {selectedMarkup && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold">Detalhes do Markup Selecionado</h3>
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
          />
        </div>
      )}
    </div>
  );
}
