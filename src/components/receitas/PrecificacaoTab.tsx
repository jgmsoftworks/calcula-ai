import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useReceitas } from '@/hooks/useReceitas';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { ReceitaCompleta } from '@/types/receitas';
import { useAuth } from '@/hooks/useAuth';

interface PrecificacaoTabProps {
  receita: ReceitaCompleta;
  onUpdate: () => void;
}

export function PrecificacaoTab({ receita, onUpdate }: PrecificacaoTabProps) {
  const { user } = useAuth();
  const { calcularCustoTotal, updateReceita } = useReceitas();
  const [custoTotal, setCustoTotal] = useState(0);
  const [markups, setMarkups] = useState<any[]>([]);
  const [markupId, setMarkupId] = useState(receita.markup_id || '');
  const [precoVenda, setPrecoVenda] = useState(receita.preco_venda);
  const [markupAplicado, setMarkupAplicado] = useState(0);

  useEffect(() => {
    loadCustoTotal();
    loadMarkups();
  }, [receita]);

  const loadCustoTotal = async () => {
    const total = await calcularCustoTotal(receita.id);
    setCustoTotal(total);
  };

  const loadMarkups = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('markups')
      .select('*')
      .eq('user_id', user.id)
      .eq('ativo', true);
    
    if (data) setMarkups(data);
  };

  const handleMarkupChange = (value: string) => {
    setMarkupId(value);
    const markup = markups.find(m => m.id === value);
    if (markup) {
      setMarkupAplicado(markup.markup_aplicado);
      const novoPreco = custoTotal * markup.markup_aplicado;
      setPrecoVenda(novoPreco);
    }
  };

  const handleSave = async () => {
    const success = await updateReceita(receita.id, {
      markup_id: markupId || null,
      preco_venda: precoVenda,
    });

    if (success) {
      onUpdate();
    }
  };

  const margem = precoVenda > 0 ? ((precoVenda - custoTotal) / precoVenda) * 100 : 0;
  const lucro = precoVenda - custoTotal;

  const custoIngredientes = receita.ingredientes.reduce((sum, i) => sum + i.custo_total, 0);
  const custoEmbalagens = receita.embalagens.reduce((sum, e) => sum + e.custo_total, 0);
  const custoMaoObra = receita.mao_obra.reduce((sum, m) => sum + m.valor_total, 0);
  const custoSubReceitas = receita.sub_receitas.reduce((sum, s) => sum + s.custo_total, 0);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Resumo de Custos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Ingredientes:</span>
            <span className="font-medium">R$ {custoIngredientes.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Embalagens:</span>
            <span className="font-medium">R$ {custoEmbalagens.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Mão de Obra:</span>
            <span className="font-medium">R$ {custoMaoObra.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Sub-receitas:</span>
            <span className="font-medium">R$ {custoSubReceitas.toFixed(2)}</span>
          </div>
          <div className="border-t pt-2 mt-2 flex justify-between">
            <span className="font-semibold">CUSTO TOTAL:</span>
            <span className="font-semibold text-lg">R$ {custoTotal.toFixed(2)}</span>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="markup">Markup (Opcional)</Label>
          <Select value={markupId} onValueChange={handleMarkupChange}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione um markup" />
            </SelectTrigger>
            <SelectContent>
              {markups.map((markup) => (
                <SelectItem key={markup.id} value={markup.id}>
                  {markup.nome} ({markup.markup_aplicado.toFixed(2)}x)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="preco">Preço de Venda *</Label>
          <Input
            id="preco"
            type="number"
            step="0.01"
            value={precoVenda}
            onChange={(e) => setPrecoVenda(Number(e.target.value))}
            placeholder="0.00"
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Análise de Rentabilidade</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Margem de Lucro:</span>
              <span className={`font-medium ${margem < 0 ? 'text-destructive' : 'text-green-600'}`}>
                {margem.toFixed(2)}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Lucro por Unidade:</span>
              <span className={`font-medium ${lucro < 0 ? 'text-destructive' : 'text-green-600'}`}>
                R$ {lucro.toFixed(2)}
              </span>
            </div>
          </CardContent>
        </Card>

        <Button onClick={handleSave} className="w-full">
          Salvar Precificação
        </Button>
      </div>
    </div>
  );
}
