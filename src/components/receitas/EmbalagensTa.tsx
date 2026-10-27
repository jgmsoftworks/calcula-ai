import { localizeText } from '@/i18n/localizeText';
import { useTranslation as usePortugalTranslation } from 'react-i18next';
import { formatMoney } from '@/lib/business-region';
import { useState, useMemo } from 'react';
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
  usePortugalTranslation();
  const [search, setSearch] = useState('');
  const [suggestionLimit, setSuggestionLimit] = useState(20);
  const matches = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (prefetchedProdutos || []).filter(produto =>
      !term || produto.nome.toLowerCase().includes(term) || produto.codigo_interno?.toString().includes(term)
    );
  }, [search, prefetchedProdutos]);
  const produtos = matches.slice(0, suggestionLimit);

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
                onChange={(e) => { setSearch(e.target.value); setSuggestionLimit(20); }}
                placeholder={localizeText("Buscar embalagens...")}
                className="pl-9"
              />
            </div>
          </div>

          {matches.length > produtos.length && (
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span>{produtos.length} de {matches.length} {localizeText("resultados. Busque pelo nome ou código.")}</span>
              <Button type="button" variant="outline" className="min-h-11" onClick={() => setSuggestionLimit(limit => limit + 20)}>Mostrar mais</Button>
            </div>
          )}
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
                      {formatMoney(produto.custo_unitario, { minimumFractionDigits: 4, maximumFractionDigits: 4 })} / {produto.unidade_uso || produto.unidade_compra}
                    </p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => handleAddEmbalagem(produto)} className="shrink-0 min-h-11 min-w-11" aria-label={`Adicionar ${produto.nome}`}>
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
              <div className="recipe-compact space-y-2">
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
                        <Button variant="ghost" size="icon" className="h-11 w-11 shrink-0" aria-label={`Remover ${embalagem.produto?.nome || 'embalagem'}`} onClick={() => handleRemoveEmbalagem(embalagem.id)}>
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
                        <span className="ml-auto text-sm font-semibold">{formatMoney(custoTotal)}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">Unit: {formatMoney(custoUnitario, { minimumFractionDigits: 4, maximumFractionDigits: 4 })}</p>
                    </div>
                  );
                })}
                <div className="flex justify-between items-center pt-2 border-t">
                  <span className="font-semibold">Total:</span>
                  <span className="font-semibold">{formatMoney(total)}</span>
                </div>
              </div>

              {/* Desktop */}
              <Table className="recipe-wide-table">
                <TableHeader>
                  <TableRow>
                    <TableHead>Embalagem</TableHead>
                    <TableHead className="w-36 text-right">Quantidade</TableHead>
                    <TableHead className="text-right">Unidade</TableHead>
                    <TableHead className="w-36 whitespace-nowrap text-right">Custo Unit.</TableHead>
                    <TableHead className="w-36 whitespace-nowrap text-right">Custo Total</TableHead>
                    <TableHead className="w-14"><span className="sr-only">Ações</span></TableHead>
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
                            className="ml-auto w-24 text-right tabular-nums"
                            value={embalagem.quantidade}
                            onChange={(e) => handleUpdateQuantidade(embalagem.id, e.target.value)}
                          />
                        </TableCell>
                        <TableCell className="text-right">{unidade}</TableCell>
                        <TableCell className="whitespace-nowrap text-right tabular-nums">{formatMoney(custoUnitario, { minimumFractionDigits: 4, maximumFractionDigits: 4 })}</TableCell>
                        <TableCell className="whitespace-nowrap text-right tabular-nums">{formatMoney(custoTotal)}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" aria-label={`Remover ${embalagem.produto?.nome || 'embalagem'}`} onClick={() => handleRemoveEmbalagem(embalagem.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  <TableRow>
                    <TableCell colSpan={4} className="text-right font-semibold">Total:</TableCell>
                    <TableCell className="text-right font-semibold">{formatMoney(total)}</TableCell>
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

