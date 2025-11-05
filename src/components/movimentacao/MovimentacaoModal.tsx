import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { NumericInputPtBr } from '@/components/ui/numeric-input-ptbr';
import { MOTIVOS_ENTRADA, MOTIVOS_SAIDA } from '@/lib/motivosMovimentacao';
import { formatters } from '@/lib/formatters';
import { ArrowDownCircle, ArrowUpCircle } from 'lucide-react';

interface MovimentacaoModalProps {
  produto: any;
  open: boolean;
  onClose: () => void;
  onAddToCart: (item: any) => void;
}

export function MovimentacaoModal({
  produto,
  open,
  onClose,
  onAddToCart,
}: MovimentacaoModalProps) {
  const [tipo, setTipo] = useState<'entrada' | 'saida'>('entrada');
  const [motivo, setMotivo] = useState('');
  const [quantidade, setQuantidade] = useState(1);
  const [custoAplicado, setCustoAplicado] = useState(produto?.custo_unitario || 0);

  useEffect(() => {
    if (produto) {
      setCustoAplicado(produto.custo_unitario);
      setQuantidade(1);
      setTipo('entrada');
      setMotivo('');
    }
  }, [produto]);

  useEffect(() => {
    setMotivo('');
    if (tipo === 'saida' && produto) {
      setCustoAplicado(produto.custo_unitario);
    }
  }, [tipo, produto]);

  if (!produto) return null;

  const motivosDisponiveis = tipo === 'entrada' ? MOTIVOS_ENTRADA : MOTIVOS_SAIDA;
  const estoqueInsuficiente = tipo === 'saida' && quantidade > produto.estoque_atual;
  const subtotal = quantidade * custoAplicado;

  const handleAdicionar = () => {
    if (!motivo || quantidade <= 0 || estoqueInsuficiente) {
      return;
    }

    // Validar se produto tem ID válido
    if (!produto?.id) {
      console.error('❌ Produto sem ID:', produto);
      return;
    }

    console.log('✅ Adicionando ao carrinho:', {
      produto_id: produto.id,
      produto_nome: produto.nome,
      tipo,
      motivo,
      quantidade,
    });

    onAddToCart({
      produto_id: produto.id,
      produto_nome: produto.nome,
      imagem_url: produto.imagem_url,
      tipo,
      motivo,
      quantidade,
      custo_aplicado: custoAplicado,
      subtotal,
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            {produto.imagem_url && (
              <img
                src={produto.imagem_url}
                alt={produto.nome}
                className="h-12 w-12 rounded object-cover"
              />
            )}
            <div className="flex-1">
              <div className="text-sm text-muted-foreground">
                #{produto.codigo_interno}
              </div>
              <div className="font-semibold">{produto.nome}</div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Tipo de Movimentação</Label>
            <RadioGroup value={tipo} onValueChange={(v: any) => setTipo(v)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="entrada" id="entrada" />
                <Label htmlFor="entrada" className="flex items-center gap-2 cursor-pointer">
                  <ArrowUpCircle className="h-4 w-4 text-green-600" />
                  Entrada
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="saida" id="saida" />
                <Label htmlFor="saida" className="flex items-center gap-2 cursor-pointer">
                  <ArrowDownCircle className="h-4 w-4 text-red-600" />
                  Saída
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="motivo">Motivo</Label>
            <Select value={motivo} onValueChange={setMotivo}>
              <SelectTrigger id="motivo">
                <SelectValue placeholder="Selecione o motivo" />
              </SelectTrigger>
              <SelectContent>
                {motivosDisponiveis.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="quantidade">Quantidade</Label>
            <NumericInputPtBr
              id="quantidade"
              tipo="quantidade_continua"
              value={quantidade}
              onChange={setQuantidade}
              min={0.01}
            />
            {estoqueInsuficiente && (
              <p className="text-sm text-destructive">
                Estoque insuficiente. Disponível: {formatters.quantidadeContinua(produto.estoque_atual)}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="custo">Custo Unitário</Label>
            {tipo === 'entrada' ? (
              <NumericInputPtBr
                id="custo"
                tipo="valor"
                value={custoAplicado}
                onChange={setCustoAplicado}
                min={0}
              />
            ) : (
              <div className="rounded-md border bg-muted px-3 py-2">
                {formatters.valor(custoAplicado)}
              </div>
            )}
          </div>

          <div className="rounded-lg border bg-muted/50 p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Subtotal:</span>
              <span className="text-lg font-bold text-primary">
                {formatters.valor(subtotal)}
              </span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleAdicionar}
            disabled={!motivo || quantidade <= 0 || estoqueInsuficiente}
          >
            Adicionar ao Carrinho
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
