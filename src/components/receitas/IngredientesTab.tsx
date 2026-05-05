import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { NumericInput } from '@/components/ui/numeric-input';
import { Plus, Trash2, Search } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { formatBRL, formatNumber } from '@/lib/formatters';
import type { ReceitaCompleta } from '@/types/receitas';

interface TempIngrediente {
  id: string;
  produto_id: string;
  quantidade: number;
  produto: any;
}

interface IngredientesTabProps {
  receita?: ReceitaCompleta;
  onUpdate?: () => void;
  mode: 'create' | 'edit';
  tempIngredientes?: TempIngrediente[];
  onAddTemp?: (produto: any, quantidade: number) => void;
  onRemoveTemp?: (id: string) => void;
  onUpdateQuantidadeTemp?: (id: string, quantidade: number) => void;
  prefetchedProdutos?: any[];
}

export function IngredientesTab({ 
  receita, 
  onUpdate, 
  mode, 
  tempIngredientes = [], 
  onAddTemp, 
  onRemoveTemp,
  onUpdateQuantidadeTemp,
  prefetchedProdutos
}: IngredientesTabProps) {
  const [search, setSearch] = useState('');
  const [produtos, setProdutos] = useState<any[]>([]);

  const allProdutos = prefetchedProdutos || [];

  useEffect(() => {
    if (!search.trim()) {
      setProdutos(allProdutos);
      return;
    }
    const filtered = allProdutos.filter(p => 
      p.nome.toLowerCase().includes(search.toLowerCase()) ||
      p.codigo_interno?.toString().includes(search)
    );
    setProdutos(filtered);
  }, [search, allProdutos]);

  const handleAddIngrediente = (produto: any) => {
    const quantidadeInicial = 1;
    onAddTemp?.(produto, quantidadeInicial);
    setSearch('');
    toast.success('Ingrediente adicionado');
  };

  const handleRemoveIngrediente = (id: string) => {
    onRemoveTemp?.(id);
    toast.success('Ingrediente removido');
  };

  const handleUpdateQuantidade = (id: string, rawValue: string) => {
    const parsed = parseFloat(rawValue.replace(',', '.'));
    const quantidade = isNaN(parsed) || parsed < 0 ? 0 : parsed;
    onUpdateQuantidadeTemp?.(id, quantidade);
  };

  const ingredientes = mode === 'create' ? tempIngredientes : tempIngredientes;

  const total = ingredientes.reduce((sum, ing) => {
    if (!ing.produto) return sum;
    const custoUnitario = ing.produto.unidade_uso 
      ? ing.produto.custo_unitario / (ing.produto.fator_conversao || 1)
      : ing.produto.custo_unitario;
    return sum + (custoUnitario * ing.quantidade);
  }, 0);

  return (
    <div className="space-y-4">
      <Card className="glass-card overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-[#0483e4] to-[#2c4dc7]" />
        <CardContent className="p-3 md:p-6 space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar ingredientes..."
                className="pl-9"
              />
            </div>
          </div>

          {produtos.length > 0 && (
            <div className="border border-blue-200 bg-blue-50 dark:bg-blue-950 rounded-lg p-2 space-y-2 max-h-60 overflow-y-auto">
              {produtos.map((produto) => (
                <div
                  key={produto.id}
                  className="flex items-center justify-between gap-2 p-2 md:p-3 hover:bg-blue-100 dark:hover:bg-blue-900 rounded transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm md:text-base truncate">{produto.nome}</p>
                    <p className="text-xs md:text-sm text-muted-foreground truncate">
                      R$ {formatNumber(produto.custo_unitario, 4)} / {produto.unidade_uso || produto.unidade_compra}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleAddIngrediente(produto)}
                    className="shrink-0"
                  >
                    <Plus className="h-4 w-4 md:mr-1" />
                    <span className="hidden md:inline">Adicionar</span>
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="glass-card overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-[#7328b1] to-[#af1188]" />
        <CardContent className="p-3 md:p-6">
          {ingredientes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum ingrediente adicionado
            </div>
          ) : (
            <>
              {/* Mobile: cards */}
              <div className="md:hidden space-y-2">
                {ingredientes.map((ingrediente) => {
                  if (!ingrediente.produto) return null;
                  const unidade = ingrediente.produto.unidade_uso || ingrediente.produto.unidade_compra;
                  const custoUnitario = ingrediente.produto.unidade_uso
                    ? ingrediente.produto.custo_unitario / (ingrediente.produto.fator_conversao || 1)
                    : ingrediente.produto.custo_unitario;
                  const custoTotal = custoUnitario * ingrediente.quantidade;

                  return (
                    <div key={ingrediente.id} className="border rounded-lg p-3 space-y-2 bg-card">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium text-sm flex-1">{ingrediente.produto.nome}</p>
                        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => handleRemoveIngrediente(ingrediente.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex items-center gap-2">
                        <NumericInput
                          className="w-24 text-right"
                          value={ingrediente.quantidade}
                          onChange={(e) => handleUpdateQuantidade(ingrediente.id, e.target.value)}
                        />
                        <span className="text-xs text-muted-foreground">{unidade}</span>
                        <span className="ml-auto text-sm font-semibold">R$ {formatBRL(custoTotal)}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">Unit: R$ {formatNumber(custoUnitario, 4)}</p>
                    </div>
                  );
                })}
                <div className="flex justify-between items-center pt-2 border-t">
                  <span className="font-semibold">Total:</span>
                  <span className="font-semibold">R$ {formatBRL(total)}</span>
                </div>
              </div>

              {/* Desktop: tabela */}
              <Table className="hidden md:table">
                <TableHeader>
                  <TableRow>
                    <TableHead>Ingrediente</TableHead>
                    <TableHead className="text-right">Quantidade</TableHead>
                    <TableHead className="text-right">Unidade</TableHead>
                    <TableHead className="text-right">Custo Unit.</TableHead>
                    <TableHead className="text-right">Custo Total</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ingredientes.map((ingrediente) => {
                    if (!ingrediente.produto) return null;
                    const unidade = ingrediente.produto.unidade_uso || ingrediente.produto.unidade_compra;
                    const custoUnitario = ingrediente.produto.unidade_uso
                      ? ingrediente.produto.custo_unitario / (ingrediente.produto.fator_conversao || 1)
                      : ingrediente.produto.custo_unitario;
                    const custoTotal = custoUnitario * ingrediente.quantidade;

                    return (
                      <TableRow key={ingrediente.id}>
                        <TableCell>{ingrediente.produto.nome}</TableCell>
                        <TableCell className="text-right">
                          <NumericInput
                            className="w-20 text-right"
                            value={ingrediente.quantidade}
                            onChange={(e) => handleUpdateQuantidade(ingrediente.id, e.target.value)}
                          />
                        </TableCell>
                        <TableCell className="text-right">{unidade}</TableCell>
                        <TableCell className="text-right">R$ {formatNumber(custoUnitario, 4)}</TableCell>
                        <TableCell className="text-right">R$ {formatBRL(custoTotal)}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => handleRemoveIngrediente(ingrediente.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  <TableRow>
                    <TableCell colSpan={4} className="text-right font-semibold">Total:</TableCell>
                    <TableCell className="text-right font-semibold">R$ {formatBRL(total)}</TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

