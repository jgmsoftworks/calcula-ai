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

export function CarrinhoMovimentacao({ carrinho, onCarrinhoChange }: any) {
  const { finalizarMovimentacao } = useMovimentacoes();
  const { user } = useAuth();
  const [responsavel, setResponsavel] = useState('');
  const [observacao, setObservacao] = useState('');
  const [finalizing, setFinalizing] = useState(false);
  const [funcionarios, setFuncionarios] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;

    const loadFuncionarios = async () => {
      const { data } = await supabase
        .from('folha_pagamento')
        .select('id, nome')
        .eq('user_id', user.id)
        .eq('ativo', true)
        .order('nome');

      setFuncionarios(data || []);
    };

    loadFuncionarios();

    // Realtime - sincronizar mudanças na folha de pagamento
    const channel = supabase
      .channel('folha-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'folha_pagamento',
          filter: `user_id=eq.${user.id}`,
        },
        () => loadFuncionarios()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const handleFinalizar = async () => {
    if (carrinho.length === 0 || !responsavel) return;

    setFinalizing(true);
    const items = carrinho.map((item: any) => ({
      produto_id: item.produto_id,
      produto_nome: item.produto_nome,
      tipo: item.tipo,
      motivo: item.motivo,
      quantidade: item.quantidade,
      custo_aplicado: item.custo_aplicado,
      subtotal: item.subtotal,
    }));

    const result = await finalizarMovimentacao(items, responsavel, observacao);
    setFinalizing(false);

    if (result) {
      onCarrinhoChange([]);
      setResponsavel('');
      setObservacao('');
    }
  };

  const handleRemoveItem = (index: number) => {
    const newCarrinho = carrinho.filter((_: any, i: number) => i !== index);
    onCarrinhoChange(newCarrinho);
  };

  const totalItens = carrinho.length;
  const valorTotal = carrinho.reduce((sum: number, item: any) => sum + item.subtotal, 0);

  return (
    <Card className="p-4 flex flex-col h-[580px]">
      {/* Cabeçalho - fixo */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <ShoppingCart className="h-5 w-5" />
        <h3 className="font-semibold text-lg">Carrinho</h3>
        {totalItens > 0 && (
          <span className="ml-auto text-sm text-muted-foreground">
            {totalItens} {totalItens === 1 ? 'item' : 'itens'}
          </span>
        )}
      </div>

      <Separator className="my-4 flex-shrink-0" />

      {/* Área de itens - com scroll */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {carrinho.length === 0 ? (
          <div className="text-center text-muted-foreground py-8 text-sm">
            Nenhum item adicionado
          </div>
        ) : (
          <div className="space-y-2 pr-1">
            {carrinho.map((item: any, index: number) => (
              <ItemCarrinho
                key={`${item.produto_id}-${index}`}
                item={item}
                onRemove={() => handleRemoveItem(index)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Rodapé - fixo na parte inferior */}
      <div className="flex-shrink-0 space-y-4 mt-4">
        {carrinho.length > 0 && (
          <>
            <Separator />
            <div className="flex items-center justify-between font-semibold">
              <span>Total:</span>
              <span className="text-lg">{formatters.valor(valorTotal)}</span>
            </div>
          </>
        )}

        <Separator />

        <div className="space-y-2">
          <Label>Responsável *</Label>
          <Select value={responsavel} onValueChange={setResponsavel}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione o responsável" />
            </SelectTrigger>
            <SelectContent>
              {funcionarios.map((func) => (
                <SelectItem key={func.id} value={func.nome}>
                  {func.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Observação</Label>
          <Textarea
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
            placeholder="Observações sobre a movimentação..."
            rows={2}
          />
        </div>

        <Button
          onClick={handleFinalizar}
          disabled={carrinho.length === 0 || !responsavel || finalizing}
          className="w-full"
        >
          <FileText className="h-4 w-4 mr-2" />
          {finalizing ? 'Finalizando...' : 'Finalizar e Gerar Comprovante'}
        </Button>
      </div>
    </Card>
  );
}
