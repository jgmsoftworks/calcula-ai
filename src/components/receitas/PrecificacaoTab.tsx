import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { MarkupCard } from './MarkupCard';
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

  useEffect(() => {
    const calcularCustoTotal = () => {
      const custoIngredientes = receita.ingredientes.reduce((sum, i) => sum + i.custo_total, 0);
      const custoEmbalagens = receita.embalagens.reduce((sum, e) => sum + e.custo_total, 0);
      const custoMaoObra = receita.mao_obra.reduce((sum, m) => sum + m.valor_total, 0);
      const custoSubReceitas = receita.sub_receitas.reduce((sum, s) => sum + s.custo_total, 0);
      return custoIngredientes + custoEmbalagens + custoMaoObra + custoSubReceitas;
    };

    setCustoTotal(calcularCustoTotal());
  }, [receita]);

  useEffect(() => {
    loadMarkups();
  }, [user]);

  const loadMarkups = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('markups')
        .select('*')
        .eq('user_id', user.id)
        .eq('ativo', true);

      if (error) throw error;
      setMarkups(data || []);
    } catch (error: any) {
      console.error('Erro ao carregar markups:', error);
      toast.error('Erro ao carregar markups');
    }
  };

  const handleSelectMarkup = (markupId: string) => {
    const markup = markups.find(m => m.id === markupId);
    if (!markup) return;

    const precoVenda = custoTotal * markup.markup_aplicado;
    onFormChange('markup_id', markupId);
    onFormChange('preco_venda', precoVenda);
  };

  const precoKg = formData.peso_unitario > 0 
    ? (custoTotal / formData.peso_unitario) * 1000 
    : 0;

  return (
    <div className="space-y-6">
      {/* Cards no topo */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-blue-50 dark:bg-blue-950">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Preço de Venda (R$/un.)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Input
              type="number"
              value={formData.preco_venda || ''}
              onChange={(e) => onFormChange('preco_venda', Number(e.target.value))}
              className="text-2xl font-bold text-blue-600 dark:text-blue-400 border-0 p-0 h-auto bg-transparent"
              placeholder="0.00"
              step="0.01"
              min="0"
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
            <p className="text-2xl font-bold">
              {formData.peso_unitario || 0}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-blue-50 dark:bg-blue-950">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Preço por KG
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              R$ {precoKg.toFixed(2)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Markups Configurados */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Markups Configurados</h3>
        
        {markups.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground border rounded-lg">
            Nenhum markup configurado. Vá para a aba Precificação para criar markups.
          </div>
        ) : (
          <div className="space-y-3">
            {markups.map((markup) => (
              <MarkupCard
                key={markup.id}
                markup={markup}
                custoTotal={custoTotal}
                isSelected={formData.markup_id === markup.id}
                onSelect={() => handleSelectMarkup(markup.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Resumo de custos */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Resumo de Custos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Ingredientes:</span>
            <span className="font-medium">
              R$ {receita.ingredientes.reduce((sum, i) => sum + i.custo_total, 0).toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Embalagens:</span>
            <span className="font-medium">
              R$ {receita.embalagens.reduce((sum, e) => sum + e.custo_total, 0).toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Mão de Obra:</span>
            <span className="font-medium">
              R$ {receita.mao_obra.reduce((sum, m) => sum + m.valor_total, 0).toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Sub-receitas:</span>
            <span className="font-medium">
              R$ {receita.sub_receitas.reduce((sum, s) => sum + s.custo_total, 0).toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between pt-2 border-t font-bold">
            <span>Total:</span>
            <span className="text-primary">R$ {custoTotal.toFixed(2)}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
