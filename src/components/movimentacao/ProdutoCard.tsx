import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Plus } from 'lucide-react';
import { NumericInputPtBr } from '@/components/ui/numeric-input-ptbr';

interface ProdutoCardProps {
  produto: any;
  onAddToCart: (item: any) => void;
}

export function ProdutoCard({ produto, onAddToCart }: ProdutoCardProps) {
  const [tipo, setTipo] = useState<'entrada' | 'saida'>('entrada');
  const [quantidade, setQuantidade] = useState(1);
  const [custoAplicado, setCustoAplicado] = useState(produto.custo_unitario);

  const handleAdd = () => {
    onAddToCart({
      id: produto.id,
      nome: produto.nome,
      codigo_interno: produto.codigo_interno,
      estoque_atual: produto.estoque_atual,
      imagem_url: produto.imagem_url,
      tipo,
      quantidade,
      custo_aplicado: custoAplicado,
      subtotal: quantidade * custoAplicado,
    });

    // Reset
    setQuantidade(1);
    setCustoAplicado(produto.custo_unitario);
  };

  const estoqueInsuficiente = tipo === 'saida' && quantidade > produto.estoque_atual;

  return (
    <Card className="p-4 space-y-3">
      {produto.imagem_url && (
        <div className="w-full h-32 rounded-lg overflow-hidden bg-muted">
          <img
            src={produto.imagem_url}
            alt={produto.nome}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      <div>
        <h4 className="font-semibold text-base line-clamp-2">{produto.nome}</h4>
        <div className="text-sm text-muted-foreground mt-1">
          Código: {produto.codigo_interno}
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-sm">Estoque:</span>
          <Badge variant={produto.estoque_atual <= produto.estoque_minimo ? 'destructive' : 'secondary'}>
            {produto.estoque_atual} {produto.unidade_compra}
          </Badge>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Tipo de Movimentação</Label>
        <RadioGroup value={tipo} onValueChange={(v) => setTipo(v as 'entrada' | 'saida')}>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="entrada" id={`entrada-${produto.id}`} />
            <Label htmlFor={`entrada-${produto.id}`} className="cursor-pointer">
              Entrada
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="saida" id={`saida-${produto.id}`} />
            <Label htmlFor={`saida-${produto.id}`} className="cursor-pointer">
              Saída
            </Label>
          </div>
        </RadioGroup>
      </div>

      <div className="space-y-2">
        <Label>Quantidade</Label>
        <NumericInputPtBr
          tipo="quantidade_continua"
          value={quantidade}
          onChange={setQuantidade}
          min={0.01}
        />
        {estoqueInsuficiente && (
          <p className="text-sm text-destructive">Estoque insuficiente!</p>
        )}
      </div>

      <div className="space-y-2">
        <Label>Custo Aplicado (R$)</Label>
        <NumericInputPtBr
          tipo="valor"
          value={custoAplicado}
          onChange={setCustoAplicado}
          min={0}
        />
      </div>

      <Button
        onClick={handleAdd}
        disabled={estoqueInsuficiente || quantidade <= 0}
        className="w-full"
      >
        <Plus className="h-4 w-4 mr-2" />
        Adicionar ao Carrinho
      </Button>
    </Card>
  );
}
