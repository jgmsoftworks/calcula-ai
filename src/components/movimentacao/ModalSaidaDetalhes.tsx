import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { NumericInputPtBr } from '@/components/ui/numeric-input-ptbr';
import { parsePtBrNumber, formatters } from '@/lib/formatters';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

interface ModalSaidaDetalhesProps {
  open: boolean;
  produto: {
    id: string;
    nome: string;
    unidade: string;
    estoque_atual: number;
    custo_unitario: number;
    preco_venda?: number;
  } | null;
  origem: 'estoque' | 'vitrine';
  onConfirm: (data: {
    quantidade: number;
    valorUnitario: number;
    valorTotal: number;
    observacao?: string;
  }) => void;
  onClose: () => void;
}

export function ModalSaidaDetalhes({
  open,
  produto,
  origem,
  onConfirm,
  onClose,
}: ModalSaidaDetalhesProps) {
  const { toast } = useToast();
  const [quantidade, setQuantidade] = useState(0);
  const [observacao, setObservacao] = useState('');

  const valorUnitario = origem === 'estoque' 
    ? (produto?.custo_unitario || 0)
    : (produto?.preco_venda || 0);
  const valorTotal = quantidade * valorUnitario;

  useEffect(() => {
    if (open && produto) {
      setQuantidade(0);
      setObservacao('');
    }
  }, [open, produto?.id]);

  const handleConfirm = () => {
    if (quantidade <= 0) {
      toast({
        title: 'Quantidade inválida',
        description: 'A quantidade deve ser maior que zero',
        variant: 'destructive',
      });
      return;
    }

    if (produto && quantidade > produto.estoque_atual) {
      toast({
        title: 'Estoque insuficiente',
        description: `Disponível: ${formatters.quantidadeContinua(produto.estoque_atual)} ${produto.unidade}`,
        variant: 'destructive',
      });
      return;
    }

    onConfirm({
      quantidade,
      valorUnitario,
      valorTotal,
      observacao: observacao || undefined,
    });

    onClose();
  };

  if (!produto) return null;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <DialogContent className="sm:max-w-[450px]" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>SAÍDA - {produto.nome}</DialogTitle>
        </DialogHeader>

        <div className="mb-4">
          <Badge variant="secondary">
            Estoque disponível: {formatters.quantidadeContinua(produto.estoque_atual)} {produto.unidade}
          </Badge>
        </div>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Quantidade ({produto.unidade}) *</Label>
            <NumericInputPtBr
              tipo="quantidade_continua"
              value={quantidade}
              onChange={setQuantidade}
              className="text-lg"
              min={0}
              max={produto.estoque_atual}
            />
          </div>

          <div className="space-y-2">
            <Label>Valor Unitário (R$/{produto.unidade})</Label>
            <Input
              value={formatters.valor(valorUnitario)}
              readOnly
              className="text-lg bg-muted"
            />
          </div>

          <div className="space-y-2">
            <Label>Valor Total (R$)</Label>
            <Input
              value={formatters.valor(valorTotal)}
              readOnly
              className="text-lg font-bold bg-muted"
            />
          </div>

          <div className="space-y-2">
            <Label>Observação</Label>
            <Textarea
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              placeholder="Observações sobre esta saída..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm}>Adicionar ao Carrinho</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
