import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { NumericInputPtBr } from '@/components/ui/numeric-input-ptbr';
import { parsePtBrNumber, formatters } from '@/lib/formatters';
import { useToast } from '@/hooks/use-toast';

interface Fornecedor {
  id: string;
  nome: string;
}

interface ModalEntradaDetalhesProps {
  open: boolean;
  produto: {
    id: string;
    nome: string;
    unidade: string;
  } | null;
  origem: 'estoque' | 'vitrine';
  fornecedores: Fornecedor[];
  onConfirm: (data: {
    quantidade: number;
    custoUnitario: number;
    custoTotal: number;
    fornecedor_id?: string;
    fornecedor_nome?: string;
    observacao?: string;
  }) => void;
  onClose: () => void;
}

export function ModalEntradaDetalhes({
  open,
  produto,
  origem,
  fornecedores,
  onConfirm,
  onClose,
}: ModalEntradaDetalhesProps) {
  const { toast } = useToast();
  const [quantidade, setQuantidade] = useState(0);
  const [custoUnitario, setCustoUnitario] = useState(0);
  const [fornecedorId, setFornecedorId] = useState<string>();
  const [observacao, setObservacao] = useState('');

  const custoTotal = quantidade * custoUnitario;

  useEffect(() => {
    if (open) {
      setQuantidade(0);
      setCustoUnitario(0);
      setFornecedorId(undefined);
      setObservacao('');
    }
  }, [open]);

  const handleConfirm = () => {
    if (quantidade <= 0) {
      toast({
        title: 'Quantidade inválida',
        description: 'A quantidade deve ser maior que zero',
        variant: 'destructive',
      });
      return;
    }

    if (custoUnitario < 0) {
      toast({
        title: 'Custo inválido',
        description: 'O custo unitário não pode ser negativo',
        variant: 'destructive',
      });
      return;
    }

    const fornecedor = fornecedores.find((f) => f.id === fornecedorId);

    onConfirm({
      quantidade,
      custoUnitario,
      custoTotal,
      fornecedor_id: fornecedorId,
      fornecedor_nome: fornecedor?.nome,
      observacao: observacao || undefined,
    });

    onClose();
  };

  if (!produto) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>ENTRADA - {produto.nome}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Quantidade ({produto.unidade}) *</Label>
            <NumericInputPtBr
              tipo="quantidade_continua"
              value={quantidade}
              onChange={setQuantidade}
              className="text-lg"
              min={0}
            />
          </div>

          <div className="space-y-2">
            <Label>Custo Unitário (R$/{produto.unidade}) *</Label>
            <NumericInputPtBr
              tipo="valor"
              value={custoUnitario}
              onChange={setCustoUnitario}
              className="text-lg"
              min={0}
            />
          </div>

          <div className="space-y-2">
            <Label>Custo Total (R$)</Label>
            <Input
              value={formatters.valor(custoTotal)}
              readOnly
              className="text-lg font-bold bg-muted"
            />
          </div>

          {origem === 'estoque' && (
            <div className="space-y-2">
              <Label>Fornecedor (opcional)</Label>
              <Select value={fornecedorId} onValueChange={setFornecedorId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {fornecedores.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>Observação</Label>
            <Textarea
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              placeholder="Observações sobre esta entrada..."
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
