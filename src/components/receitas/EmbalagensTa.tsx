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

interface TempEmbalagem {
  id: string;
  produto_id: string;
  quantidade: number;
  produto: any;
}

interface EmbalagensTabProps {
  receita?: ReceitaCompleta;
  onUpdate?: () => void;
  mode: 'create' | 'edit';
  tempEmbalagens?: TempEmbalagem[];
  onAddTemp?: (produto: any, quantidade: number) => void;
  onRemoveTemp?: (id: string) => void;
  onUpdateQuantidadeTemp?: (id: string, quantidade: number) => void;
  prefetchedProdutos?: any[];
}

export function EmbalagensTa({ 
  receita, 
  onUpdate, 
  mode, 
  tempEmbalagens = [], 
  onAddTemp, 
  onRemoveTemp,
  onUpdateQuantidadeTemp,
  prefetchedProdutos
}: EmbalagensTabProps) {
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

  const handleAddEmbalagem = (produto: any) => {
    const quantidadeInicial = 1;
    onAddTemp?.(produto, quantidadeInicial);
    setSearch('');
    toast.success('Embalagem adicionada');
  };

  const handleRemoveEmbalagem = (id: string) => {
    onRemoveTemp?.(id);
    toast.success('Embalagem removida');
  };

  const handleUpdateQuantidade = (id: string, rawValue: string) => {
    const parsed = parseFloat(rawValue.replace(',', '.'));
    const quantidade = isNaN(parsed) || parsed < 0 ? 0 : parsed;
    onUpdateQuantidadeTemp?.(id, quantidade);
  };

  const embalagens = mode === 'create' ? tempEmbalagens : tempEmbalagens;

  const total = embalagens.reduce((sum, emb) => {
    if (!emb.produto) return sum;
    const custoUnitario = emb.produto.unidade_uso 
      ? emb.produto.custo_unitario / (emb.produto.fator_conversao || 1)
      : emb.produto.custo_unitario;
    return sum + (custoUnitario * emb.quantidade);
  }, 0);

  return (
    <div className="space-y-4">
      <Card className="glass-card overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-[#f96e0c] to-[#dd0b52]" />
        <CardContent className="p-3 md:p-6 space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar embalagens..."
                className="pl-9"
              />
            </div>
          </div>

          {produtos.length > 0 && (
            <div className="border border-orange-200 bg-orange-50 dark:bg-orange-950 rounded-lg p-2 space-y-2 max-h-60 overflow-y-auto">
              {produtos.map((produto) => (
                <div
                  key={produto.id}
                  className="flex items-center justify-between gap-2 p-2 md:p-3 hover:bg-orange-100 dark:hover:bg-orange-900 rounded transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm md:text-base truncate">{produto.nome}</p>
                    <p className="text-xs md:text-sm text-muted-foreground truncate">
                      R$ {formatNumber(produto.custo_unitario, 4)} / {produto.unidade_uso || produto.unidade_compra}
                    </p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => handleAddEmbalagem(produto)} className="shrink-0">
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
        <div className="h-1 bg-gradient-to-r from-[#dd0b52] to-[#af1188]" />
        <CardContent className="p-3 md:p-6">
          {embalagens.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma embalagem adicionada
            </div>
          ) : (
            <>
              {/* Mobile */}
              <div className="md:hidden space-y-2">
                {embalagens.map((embalagem) => {
                  if (!embalagem.produto) return null;
                  const unidade = embalagem.produto.unidade_uso || embalagem.produto.unidade_compra;
                  const custoUnitario = embalagem.produto.unidade_uso
                    ? embalagem.produto.custo_unitario / (embalagem.produto.fator_conversao || 1)
                    : embalagem.produto.custo_unitario;
                  const custoTotal = custoUnitario * embalagem.quantidade;
                  return (
                    <div key={embalagem.id} className="border rounded-lg p-3 space-y-2 bg-card">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium text-sm flex-1">{embalagem.produto.nome}</p>
                        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => handleRemoveEmbalagem(embalagem.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex items-center gap-2">
                        <NumericInput
                          className="w-24 text-right"
                          value={embalagem.quantidade}
                          onChange={(e) => handleUpdateQuantidade(embalagem.id, e.target.value)}
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

              {/* Desktop */}
              <Table className="hidden md:table">
                <TableHeader>
                  <TableRow>
                    <TableHead>Embalagem</TableHead>
                    <TableHead className="text-right">Quantidade</TableHead>
                    <TableHead className="text-right">Unidade</TableHead>
                    <TableHead className="text-right">Custo Unit.</TableHead>
                    <TableHead className="text-right">Custo Total</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {embalagens.map((embalagem) => {
                    if (!embalagem.produto) return null;
                    const unidade = embalagem.produto.unidade_uso || embalagem.produto.unidade_compra;
                    const custoUnitario = embalagem.produto.unidade_uso
                      ? embalagem.produto.custo_unitario / (embalagem.produto.fator_conversao || 1)
                      : embalagem.produto.custo_unitario;
                    const custoTotal = custoUnitario * embalagem.quantidade;
                    return (
                      <TableRow key={embalagem.id}>
                        <TableCell>{embalagem.produto.nome}</TableCell>
                        <TableCell className="text-right">
                          <NumericInput
                            className="w-20 text-right"
                            value={embalagem.quantidade}
                            onChange={(e) => handleUpdateQuantidade(embalagem.id, e.target.value)}
                          />
                        </TableCell>
                        <TableCell className="text-right">{unidade}</TableCell>
                        <TableCell className="text-right">R$ {formatNumber(custoUnitario, 4)}</TableCell>
                        <TableCell className="text-right">R$ {formatBRL(custoTotal)}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => handleRemoveEmbalagem(embalagem.id)}>
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

