import { useState, useEffect, useCallback } from 'react';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { NumericInputPtBr } from '@/components/ui/numeric-input-ptbr';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { MarkupCard } from './MarkupCard';
import { formatBRL } from '@/lib/formatters';
import { toast } from 'sonner';
import type { ReceitaCompleta } from '@/types/receitas';

interface PrecificacaoTabProps {
  receita: ReceitaCompleta;
  formData: any;
  onFormChange: (field: string, value: any) => void;
}

export function PrecificacaoTab({ receita, formData, onFormChange }: PrecificacaoTabProps) {
  const { user } = useAuth();
  const [custoTotal, setCustoTotal] = useState(0);
  const [markups, setMarkups] = useState<any[]>([]);
  const [markupSubReceita, setMarkupSubReceita] = useState<any | null>(null);

  useEffect(() => {
    const calcularCustoTotal = () => {
      const custoIngredientes = receita.ingredientes.reduce((sum, i) => {
        if (!i.produto) return sum;
        const custoUnitario = i.produto.unidade_uso 
          ? i.produto.custo_unitario / (i.produto.fator_conversao || 1)
          : i.produto.custo_unitario;
        return sum + (custoUnitario * i.quantidade);
      }, 0);
      
      const custoEmbalagens = receita.embalagens.reduce((sum, e) => {
        if (!e.produto) return sum;
        const custoUnitario = e.produto.unidade_uso 
          ? e.produto.custo_unitario / (e.produto.fator_conversao || 1)
          : e.produto.custo_unitario;
        return sum + (custoUnitario * e.quantidade);
      }, 0);
      
      const custoMaoObra = receita.mao_obra.reduce((sum, m) => sum + m.valor_total, 0);
      
      const custoSubReceitas = receita.sub_receitas.reduce((sum, s) => {
        if (!s.sub_receita) return sum;
        return sum + (s.sub_receita.preco_venda * s.quantidade);
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

    console.log('🔄 Configurando real-time updates para markups');
    
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
        (payload) => {
          console.log('🔔 Markup atualizado em tempo real:', payload);
          loadMarkups();
          loadMarkupSubReceita();
        }
      )
      .subscribe();

    return () => {
      console.log('🔌 Desconectando real-time updates de markups');
      supabase.removeChannel(channel);
    };
  }, [user, loadMarkups, loadMarkupSubReceita]);

  const handleSelectMarkup = async (markupId: string) => {
    const allMarkups = markupSubReceita ? [markupSubReceita, ...markups] : markups;
    const markup = allMarkups.find(m => m.id === markupId);
    if (!markup || !user) return;

    // Buscar detalhes do markup de user_configurations
    const configKey = `markup_${markup.nome.toLowerCase().replace(/\s+/g, '_')}`;
    
    const { data } = await supabase
      .from('user_configurations')
      .select('configuration')
      .eq('user_id', user.id)
      .eq('type', configKey)
      .maybeSingle();

    const detalhes = data?.configuration as any;
    const valorEmReal = detalhes?.valorEmReal ?? 0;

    let precoVenda: number;

    if (valorEmReal > 0) {
      // CASO 1: COM "Valor em Real" - usar fórmula que garante % exato
      const totalPercentuais = 
        (detalhes?.gastoSobreFaturamento ?? 0) + 
        (detalhes?.impostos ?? 0) + 
        (detalhes?.taxas ?? 0) + 
        (detalhes?.comissoes ?? 0) + 
        (detalhes?.outros ?? 0) + 
        (detalhes?.lucroDesejado ?? markup.margem_lucro);
      
      const baseCalculo = custoTotal + valorEmReal;
      const divisor = 1 - (totalPercentuais / 100);
      precoVenda = divisor > 0 ? baseCalculo / divisor : baseCalculo * 2;
    } else {
      // CASO 2: SEM "Valor em Real" - usar fórmula tradicional
      precoVenda = custoTotal * markup.markup_ideal;
    }

    onFormChange('markup_id', markupId);
    onFormChange('preco_venda', precoVenda);
  };

  const precoKg = formData.peso_unitario > 0 
    ? (custoTotal / formData.peso_unitario) * 1000 
    : 0;

  const custoIngredientes = receita.ingredientes.reduce((sum, i) => {
    if (!i.produto) return sum;
    const custoUnitario = i.produto.unidade_uso 
      ? i.produto.custo_unitario / (i.produto.fator_conversao || 1)
      : i.produto.custo_unitario;
    return sum + (custoUnitario * i.quantidade);
  }, 0);
  
  const custoEmbalagens = receita.embalagens.reduce((sum, e) => {
    if (!e.produto) return sum;
    const custoUnitario = e.produto.unidade_uso 
      ? e.produto.custo_unitario / (e.produto.fator_conversao || 1)
      : e.produto.custo_unitario;
    return sum + (custoUnitario * e.quantidade);
  }, 0);
  
  const custoMaoObra = receita.mao_obra.reduce((sum, m) => sum + m.valor_total, 0);
  
  const custoSubReceitas = receita.sub_receitas.reduce((sum, s) => {
    if (!s.sub_receita) return sum;
    return sum + (s.sub_receita.preco_venda * s.quantidade);
  }, 0);

  return (
    <div className="space-y-6">
      {/* Resumo de Custos no topo */}
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

      {/* Cards no meio */}
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
              className="text-4xl font-bold text-blue-600 dark:text-blue-400 border-0 p-0 h-auto bg-transparent focus:ring-0"
              placeholder="R$ 0,00"
            />
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

      {/* Markups Configurados */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Markups Configurados</h3>
        
        {markups.length === 0 && !markupSubReceita ? (
          <div className="text-center py-8 text-muted-foreground border rounded-lg">
            Nenhum markup configurado. Vá para a aba Precificação para criar markups.
          </div>
        ) : (
          <div className="space-y-3">
            {/* Markup de Sub-receitas primeiro */}
            {markupSubReceita && (
              <MarkupCard
                key="sub-receitas"
                markup={markupSubReceita}
                custoTotal={custoTotal}
                precoVenda={formData.preco_venda || 0}
                isSelected={formData.markup_id === markupSubReceita.id}
                onSelect={() => handleSelectMarkup(markupSubReceita.id)}
                alwaysExpanded={true}
              />
            )}
            
            {/* Markups do usuário */}
            {markups.map((markup) => (
              <MarkupCard
                key={markup.id}
                markup={markup}
                custoTotal={custoTotal}
                precoVenda={formData.preco_venda || 0}
                isSelected={formData.markup_id === markup.id}
                onSelect={() => handleSelectMarkup(markup.id)}
                alwaysExpanded={true}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
