import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useMovimentacoes } from '@/hooks/useMovimentacoes';

export function CarrinhoMovimentacao({ carrinho, onCarrinhoChange }: any) {
  const { finalizarMovimentacao } = useMovimentacoes();
  const [responsavel, setResponsavel] = useState('');
  const [observacao, setObservacao] = useState('');
  const [finalizing, setFinalizing] = useState(false);

  const handleFinalizar = async () => {
    if (carrinho.length === 0 || !responsavel) return;
    
    setFinalizing(true);
    const items = carrinho.map((item: any) => ({
      produto_id: item.id,
      produto_nome: item.nome,
      tipo: item.tipo || 'entrada',
      quantidade: item.quantidade || 1,
      custo_aplicado: item.custo_unitario,
      subtotal: (item.quantidade || 1) * item.custo_unitario,
    }));

    const result = await finalizarMovimentacao(items, responsavel, observacao);
    setFinalizing(false);

    if (result) {
      onCarrinhoChange([]);
      setResponsavel('');
      setObservacao('');
    }
  };

  return (
    <Card className="p-4 space-y-4">
      <h3 className="font-semibold">Carrinho ({carrinho.length} itens)</h3>

      <div className="space-y-2">
        <Label>Responsável *</Label>
        <Input
          value={responsavel}
          onChange={(e) => setResponsavel(e.target.value)}
          placeholder="Nome do responsável"
        />
      </div>

      <div className="space-y-2">
        <Label>Observação</Label>
        <Textarea
          value={observacao}
          onChange={(e) => setObservacao(e.target.value)}
          placeholder="Observações..."
          rows={3}
        />
      </div>

      <Button
        onClick={handleFinalizar}
        disabled={carrinho.length === 0 || !responsavel || finalizing}
        className="w-full"
      >
        {finalizing ? 'Finalizando...' : 'Finalizar e Gerar Comprovante'}
      </Button>
    </Card>
  );
}
