import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useEstoque } from '@/hooks/useEstoque';
import { Search } from 'lucide-react';

interface SelectorProdutosProps {
  onSelect: (produto: any, quantidade: number) => void;
  onClose: () => void;
}

export function SelectorProdutos({ onSelect, onClose }: SelectorProdutosProps) {
  const { fetchProdutos } = useEstoque();
  const [produtos, setProdutos] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [selectedProduto, setSelectedProduto] = useState<any>(null);
  const [quantidade, setQuantidade] = useState(1);

  useEffect(() => {
    loadProdutos();
  }, [search]);

  const loadProdutos = async () => {
    const filters = search ? { search } : undefined;
    const data = await fetchProdutos(filters);
    setProdutos(data);
  };

  const handleSelect = () => {
    if (selectedProduto && quantidade > 0) {
      // Calcular custo por unidade de uso
      const unidadeParaUsar = selectedProduto.unidade_uso || selectedProduto.unidade_compra;
      const fatorConversao = selectedProduto.fator_conversao || 1;
      
      const custoUnitarioUso = selectedProduto.unidade_uso && selectedProduto.fator_conversao
        ? selectedProduto.custo_unitario / fatorConversao
        : selectedProduto.custo_unitario;
      
      // Passar dados convertidos
      onSelect({
        ...selectedProduto,
        custo_unitario_uso: custoUnitarioUso,
        unidade_uso_final: unidadeParaUsar
      }, quantidade);
      onClose();
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Selecionar Produto</DialogTitle>
        </DialogHeader>

        {!selectedProduto ? (
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar produto..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-[50vh] overflow-y-auto">
              {produtos.map((produto) => (
                <button
                  key={produto.id}
                  onClick={() => setSelectedProduto(produto)}
                  className="p-3 border rounded-lg hover:border-primary hover:bg-accent transition-colors text-left"
                >
                  {produto.imagem_url ? (
                    <img
                      src={produto.imagem_url}
                      alt={produto.nome}
                      className="w-full aspect-square object-cover rounded mb-2"
                    />
                  ) : (
                    <div className="w-full aspect-square bg-muted rounded mb-2 flex items-center justify-center text-muted-foreground text-xs">
                      Sem imagem
                    </div>
                  )}
                  <p className="font-medium text-sm truncate">{produto.nome}</p>
                  <p className="text-xs text-muted-foreground">
                    R$ {produto.custo_unitario.toFixed(2)}
                  </p>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-4 border rounded-lg">
              {selectedProduto.imagem_url ? (
                <img
                  src={selectedProduto.imagem_url}
                  alt={selectedProduto.nome}
                  className="w-20 h-20 object-cover rounded"
                />
              ) : (
                <div className="w-20 h-20 bg-muted rounded flex items-center justify-center text-muted-foreground">
                  Sem imagem
                </div>
              )}
              <div>
                <h3 className="font-semibold">{selectedProduto.nome}</h3>
                <p className="text-sm text-muted-foreground">
                  R$ {selectedProduto.custo_unitario.toFixed(2)} / {selectedProduto.unidade_compra}
                  {selectedProduto.unidade_uso && selectedProduto.unidade_uso !== selectedProduto.unidade_compra && (
                    <span className="text-primary font-medium ml-2">
                      → R$ {(selectedProduto.custo_unitario / (selectedProduto.fator_conversao || 1)).toFixed(4)} / {selectedProduto.unidade_uso}
                    </span>
                  )}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="quantidade">Quantidade</Label>
              <Input
                id="quantidade"
                type="number"
                step="0.01"
                min="0"
                value={quantidade}
                onChange={(e) => setQuantidade(Number(e.target.value))}
              />
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setSelectedProduto(null)} className="flex-1">
                Voltar
              </Button>
              <Button onClick={handleSelect} disabled={quantidade <= 0} className="flex-1">
                Adicionar
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
