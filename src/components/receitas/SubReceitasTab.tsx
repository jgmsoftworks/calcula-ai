import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2, Search, Info, Package } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { NumericInput } from '@/components/ui/numeric-input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { formatBRL, formatNumber } from '@/lib/formatters';
import type { ReceitaCompleta, Receita } from '@/types/receitas';

interface TempSubReceita {
  id: string;
  sub_receita_id: string;
  quantidade: number;
  sub_receita: any;
}

interface SubReceitasTabProps {
  receita?: ReceitaCompleta;
  onUpdate?: () => void;
  mode: 'create' | 'edit';
  tempSubReceitas?: TempSubReceita[];
  onAddTemp?: (subReceita: any, quantidade: number) => void;
  onRemoveTemp?: (id: string) => void;
  onUpdateQuantidadeTemp?: (id: string, quantidade: number) => void;
  prefetchedSubReceitas?: any[];
  hasSubReceitaMarkup?: boolean;
}

export function SubReceitasTab({ 
  receita, 
  onUpdate, 
  mode, 
  tempSubReceitas = [], 
  onAddTemp, 
  onRemoveTemp,
  onUpdateQuantidadeTemp,
  prefetchedSubReceitas,
  hasSubReceitaMarkup = true
}: SubReceitasTabProps) {
  const [search, setSearch] = useState('');
  const [receitas, setReceitas] = useState<any[]>([]);

  // Filter out current recipe in edit mode
  const allSubReceitas = (prefetchedSubReceitas || []).filter(r => 
    mode === 'edit' && receita?.id ? r.id !== receita.id : true
  );

  useEffect(() => {
    if (!search.trim()) {
      setReceitas(allSubReceitas);
      return;
    }
    const filtered = allSubReceitas.filter(r => 
      r.nome.toLowerCase().includes(search.toLowerCase())
    );
    setReceitas(filtered);
  }, [search, allSubReceitas]);

  const handleAddSubReceita = (subReceita: Receita) => {
    onAddTemp?.(subReceita, 1);
    setSearch('');
    toast.success('Sub-receita adicionada');
  };

  const handleRemoveSubReceita = (id: string) => {
    onRemoveTemp?.(id);
    toast.success('Sub-receita removida');
  };

  const handleUpdateQuantidade = (id: string, quantidade: number) => {
    onUpdateQuantidadeTemp?.(id, quantidade);
  };

  const subReceitas = mode === 'create' ? tempSubReceitas : tempSubReceitas;

  const total = subReceitas.reduce((sum, sr) => {
    if (!sr.sub_receita) return sum;
    const custoUnitario = sr.sub_receita.rendimento_valor && sr.sub_receita.rendimento_valor > 0
      ? sr.sub_receita.preco_venda / sr.sub_receita.rendimento_valor
      : sr.sub_receita.preco_venda;
    return sum + (custoUnitario * sr.quantidade);
  }, 0);

  return (
    <div className="space-y-4">
      {/* Card explicativo - apenas quando não há markup configurado */}
      {!hasSubReceitaMarkup && (
        <Card className="glass-card overflow-hidden border-amber-500/50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h4 className="font-semibold text-amber-900 dark:text-amber-100 mb-1">
                  Nenhum Markup de Sub-receitas Configurado
                </h4>
                <p className="text-sm text-amber-800 dark:text-amber-200 mb-3">
                  Para usar sub-receitas, você precisa:
                </p>
                <ol className="text-sm text-amber-800 dark:text-amber-200 list-decimal list-inside space-y-1">
                  <li>Ir para a página <strong>Precificação</strong></li>
                  <li>Criar um <strong>Markup de Sub-receitas</strong></li>
                  <li>Voltar às suas receitas e selecionar esse markup nas receitas que deseja usar como sub-receitas</li>
                  <li>Finalizar essas receitas (status "Finalizada")</li>
                </ol>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {hasSubReceitaMarkup && allSubReceitas.length > 0 && (
        <>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filtrar sub-receitas pelo nome..."
                className="pl-9"
              />
            </div>
          </div>

          {receitas.length > 0 && (
            <div className="border border-green-200 bg-green-50/50 dark:bg-green-950/50 rounded-lg p-2 space-y-2 max-h-60 overflow-y-auto">
              {receitas.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between p-3 hover:bg-accent rounded cursor-pointer transition-colors"
                  onClick={() => handleAddSubReceita(r)}
                >
                  <div className="flex items-center gap-3">
                    <Badge className="bg-green-500 text-white">
                      <Package className="h-3 w-3 mr-1" />
                      Sub
                    </Badge>
                    <div>
                      <p className="font-medium">{r.nome}</p>
                      <p className="text-sm text-muted-foreground">
                        R$ {formatBRL(r.preco_venda)} / {r.rendimento_unidade || 'un'}
                      </p>
                    </div>
                  </div>
                  <Button size="sm" variant="outline">
                    <Plus className="h-4 w-4 mr-1" />
                    Adicionar
                  </Button>
                </div>
              ))}
            </div>
          )}

          {receitas.length === 0 && search && (
            <div className="text-center py-8 text-muted-foreground border rounded-lg">
              Nenhuma sub-receita encontrada com "{search}"
            </div>
          )}
        </>
      )}

      <Card className="glass-card overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-[#16a34a] to-[#15803d]" />
        <CardContent className="p-3 md:p-6">
      {subReceitas.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          Nenhuma sub-receita adicionada
        </div>
      ) : (
          <div className="space-y-4">
          <div className="flex justify-end">
            <Badge variant="secondary" className="text-base px-4 py-2">
              Total: R$ {formatBRL(total)}
            </Badge>
          </div>
          {/* Mobile cards */}
          <div className="md:hidden space-y-2">
            {subReceitas.map((subReceita) => {
              if (!subReceita.sub_receita) return null;
              const custoUnitario = subReceita.sub_receita.rendimento_valor && subReceita.sub_receita.rendimento_valor > 0
                ? subReceita.sub_receita.preco_venda / subReceita.sub_receita.rendimento_valor
                : subReceita.sub_receita.preco_venda;
              const custoTotal = custoUnitario * subReceita.quantidade;
              const unidade = subReceita.sub_receita.rendimento_unidade || 'un';
              return (
                <div key={subReceita.id} className="border rounded-lg p-3 space-y-2 bg-card">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium text-sm flex-1">{subReceita.sub_receita.nome}</p>
                    <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => handleRemoveSubReceita(subReceita.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <NumericInput
                      value={subReceita.quantidade}
                      onChange={(e) => handleUpdateQuantidade(subReceita.id, Number(e.target.value))}
                      className="w-24 text-right"
                      min={0}
                      step={0.01}
                    />
                    <span className="text-xs text-muted-foreground">{unidade}</span>
                    <span className="ml-auto text-sm font-semibold">R$ {formatBRL(custoTotal)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Unit: R$ {formatNumber(custoUnitario, 4)}</p>
                </div>
              );
            })}
          </div>

          <Table className="hidden md:table">
            <TableHeader>
              <TableRow>
                <TableHead>Sub-receita</TableHead>
                <TableHead>Unidade</TableHead>
                <TableHead className="text-right">Quantidade</TableHead>
                <TableHead className="text-right">Custo Unit.</TableHead>
                <TableHead className="text-right">Custo Total</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subReceitas.map((subReceita) => {
                if (!subReceita.sub_receita) return null;
                
                const custoUnitario = subReceita.sub_receita.rendimento_valor && subReceita.sub_receita.rendimento_valor > 0
                  ? subReceita.sub_receita.preco_venda / subReceita.sub_receita.rendimento_valor
                  : subReceita.sub_receita.preco_venda;
                const custoTotal = custoUnitario * subReceita.quantidade;
                const unidade = subReceita.sub_receita.rendimento_unidade || 'un';

                return (
                  <TableRow key={subReceita.id}>
                    <TableCell>{subReceita.sub_receita.nome}</TableCell>
                    <TableCell>{unidade}</TableCell>
                    <TableCell className="text-right">
                      <NumericInput
                        value={subReceita.quantidade}
                        onChange={(e) => handleUpdateQuantidade(subReceita.id, Number(e.target.value))}
                        className="w-20 text-right"
                        min={0}
                        step={0.01}
                      />
                    </TableCell>
                    <TableCell className="text-right">R$ {formatNumber(custoUnitario, 4)}</TableCell>
                    <TableCell className="text-right">R$ {formatBRL(custoTotal)}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveSubReceita(subReceita.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
        </CardContent>
      </Card>
    </div>
  );
}
