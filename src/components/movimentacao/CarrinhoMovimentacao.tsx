import type { ItemCarrinhoVisual } from '@/types/movimentacao';
import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useMovimentacoes } from '@/hooks/useMovimentacoes';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { ItemCarrinho } from './ItemCarrinho';
import { formatters } from '@/lib/formatters';
import { FileText, ShoppingCart } from 'lucide-react';
export function CarrinhoMovimentacao({
  carrinho,
  onCarrinhoChange,
  onSuccess
}: { carrinho: ItemCarrinhoVisual[]; onCarrinhoChange: (items: ItemCarrinhoVisual[]) => void; onSuccess?: () => void }) {
  const {
    finalizarMovimentacao
  } = useMovimentacoes();
  const {
    user
  } = useAuth();
  const [responsavel, setResponsavel] = useState('');
  const [observacao, setObservacao] = useState('');
  const [finalizing, setFinalizing] = useState(false);
  const [funcionarios, setFuncionarios] = useState<{ id: string; nome: string }[]>([]);
  useEffect(() => {
    if (!user) return;
    const loadFuncionarios = async () => {
      const {
        data
      } = await supabase.from('folha_pagamento').select('id, nome').eq('user_id', user.id).eq('ativo', true).order('nome');
      setFuncionarios(data || []);
    };
    loadFuncionarios();

    // Realtime - sincronizar mudanças na folha de pagamento
    const channel = supabase.channel('folha-realtime').on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'folha_pagamento',
      filter: `user_id=eq.${user.id}`
    }, () => loadFuncionarios()).subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);
  const handleFinalizar = async () => {
    if (carrinho.length === 0 || !responsavel) return;
    setFinalizing(true);
    const items = carrinho.map((item) => ({
      produto_id: item.produto_id,
      produto_nome: item.produto_nome,
      origem_estoque: item.origem_estoque || 'produto',
      tipo: item.tipo,
      motivo: item.motivo,
      quantidade: item.quantidade,
      custo_aplicado: item.custo_aplicado,
      subtotal: item.subtotal
    }));
    const result = await finalizarMovimentacao(items, responsavel, observacao);
    setFinalizing(false);
    if (result) {
      onCarrinhoChange([]);
      onSuccess?.();
      setResponsavel('');
      setObservacao('');
    }
  };
  const handleRemoveItem = (index: number) => {
    const newCarrinho = carrinho.filter((_, i) => i !== index);
    onCarrinhoChange(newCarrinho);
  };
  const totalItens = carrinho.length;
  const valorTotal = carrinho.reduce((sum, item) => sum + item.subtotal, 0);
  return <Card className="flex h-full min-h-0 max-w-full flex-col overflow-hidden rounded-2xl border-border/70 shadow-sm">
      <div className="flex shrink-0 items-center gap-2 border-b border-border/60 px-4 py-3">
        <span className="rounded-xl bg-primary/10 p-2 text-primary"><ShoppingCart className="h-5 w-5" /></span>
        <h3 className="text-base font-semibold">Carrinho</h3>
        {totalItens > 0 && <span className="ml-auto rounded-lg bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
          {totalItens} {totalItens === 1 ? 'item' : 'itens'}
        </span>}
      </div>

      {/* Only the cart contents scroll on shorter screens; the action stays visible. */}
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain p-3">
        <div role="region" aria-label="Itens no carrinho" tabIndex={0} className="min-h-24 flex-1 overflow-y-auto overscroll-contain outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary">
          {carrinho.length === 0 ? <div className="flex h-full min-h-24 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border/80 bg-muted/20 px-4 py-4 text-center text-sm text-muted-foreground">
            <ShoppingCart className="h-6 w-6 text-primary/40" />
            <p className="font-medium text-foreground">Nenhum item adicionado</p>
            <p className="max-w-48 text-xs leading-relaxed">Selecione um produto para começar a movimentação.</p>
          </div> : <div className="space-y-2 pr-1">
            {carrinho.map((item, index) => <ItemCarrinho key={`${item.produto_id}-${index}`} item={item} onRemove={() => handleRemoveItem(index)} />)}
          </div>}
        </div>

        <div className="shrink-0 space-y-3">
          {carrinho.length > 0 && <div className="flex items-center justify-between rounded-xl bg-primary/5 px-3 py-2 font-semibold">
            <span className="text-sm">Total</span>
            <span className="text-lg text-primary">{formatters.valor(valorTotal)}</span>
          </div>}
          <Separator />
          <div className="space-y-1.5">
            <Label htmlFor="mov-responsavel">Responsável *</Label>
            <Select value={responsavel} onValueChange={setResponsavel}>
              <SelectTrigger id="mov-responsavel"><SelectValue placeholder="Selecione o responsável" /></SelectTrigger>
              <SelectContent>
                {funcionarios.map(func => <SelectItem key={func.id} value={func.nome}>{func.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="mov-observacao">Observação</Label>
            <Textarea id="mov-observacao" value={observacao} onChange={e => setObservacao(e.target.value)} placeholder="Observações sobre a movimentação..." rows={2} className="min-h-16 resize-none" />
          </div>
        </div>
      </div>

      <div className="shrink-0 border-t border-border/60 bg-card p-3">
        <Button onClick={handleFinalizar} disabled={carrinho.length === 0 || !responsavel || finalizing} className="min-h-11 w-full px-2 text-xs xl:text-sm">
          <FileText className="mr-2 h-4 w-4 shrink-0" />
          {finalizing ? 'Finalizando...' : 'Finalizar e Gerar Comprovante'}
        </Button>
      </div>
    </Card>;
}
