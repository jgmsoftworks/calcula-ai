import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { NumericInput } from '@/components/ui/numeric-input';
import { Plus, Trash2, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { formatBRL, formatNumber } from '@/lib/formatters';
import type { ReceitaCompleta } from '@/types/receitas';

interface TempEmbalagem {
  id: string;
  produto_id: string;
  quantidade: number;
  produto: any;
}

interface EmbalagensTabProps {
  // Modo edição
  receita?: ReceitaCompleta;
  onUpdate?: () => void;
  
  // Modo criação
  mode: 'create' | 'edit';
  tempEmbalagens?: TempEmbalagem[];
  onAddTemp?: (produto: any, quantidade: number) => void;
  onRemoveTemp?: (id: string) => void;
  onUpdateQuantidadeTemp?: (id: string, quantidade: number) => void;
}

export function EmbalagensTa({ 
  receita, 
  onUpdate, 
  mode, 
  tempEmbalagens = [], 
  onAddTemp, 
  onRemoveTemp,
  onUpdateQuantidadeTemp
}: EmbalagensTabProps) {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [produtos, setProdutos] = useState<any[]>([]);
  const [allProdutos, setAllProdutos] = useState<any[]>([]);

  useEffect(() => {
    loadProdutos();
  }, [user]);

  const loadProdutos = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('produtos')
      .select('*')
      .eq('user_id', user.id)
      .eq('ativo', true)
      .order('nome');
    setAllProdutos(data || []);
    setProdutos(data || []);
  };

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

  const handleAddEmbalagem = async (produto: any) => {
    const quantidadeInicial = 1;

    if (mode === 'create') {
      onAddTemp?.(produto, quantidadeInicial);
      setSearch('');
      return;
    }

    try {
      const { error } = await supabase.from('receita_embalagens').insert({
        receita_id: receita!.id,
        produto_id: produto.id,
        quantidade: quantidadeInicial,
      });

      if (error) throw error;
      toast.success('Embalagem adicionada');
      setSearch('');
      onUpdate?.();
    } catch (error: any) {
      console.error('Erro ao adicionar embalagem:', error);
      toast.error('Erro ao adicionar embalagem');
    }
  };

  const handleRemoveEmbalagem = async (id: string) => {
    if (mode === 'create') {
      onRemoveTemp?.(id);
      return;
    }

    try {
      const { error } = await supabase
        .from('receita_embalagens')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Embalagem removida');
      onUpdate?.();
    } catch (error: any) {
      console.error('Erro ao remover embalagem:', error);
      toast.error('Erro ao remover embalagem');
    }
  };

  const handleUpdateQuantidade = async (id: string, rawValue: string) => {
    const parsed = parseFloat(rawValue.replace(',', '.'));
    const quantidade = isNaN(parsed) || parsed < 0 ? 0 : parsed;

    if (mode === 'create') {
      onUpdateQuantidadeTemp?.(id, quantidade);
      return;
    }

    try {
      const { error } = await supabase
        .from('receita_embalagens')
        .update({ quantidade })
        .eq('id', id);

      if (error) throw error;
      onUpdate?.();
    } catch (error: any) {
      console.error('Erro ao atualizar quantidade:', error);
      toast.error('Erro ao atualizar quantidade');
    }
  };

  const embalagens = mode === 'create' ? tempEmbalagens : (receita?.embalagens || []);

  const total = embalagens.reduce((sum, emb) => {
    if (!emb.produto) return sum;
    const custoUnitario = emb.produto.unidade_uso 
      ? emb.produto.custo_unitario / (emb.produto.fator_conversao || 1)
      : emb.produto.custo_unitario;
    return sum + (custoUnitario * emb.quantidade);
  }, 0);

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar embalagens pelo nome ou código..."
            className="pl-9"
          />
        </div>
      </div>

      {produtos.length > 0 && (
        <div className="border border-orange-200 bg-orange-50 dark:bg-orange-950 rounded-lg p-2 space-y-2 max-h-60 overflow-y-auto">
          {produtos.map((produto) => (
            <div
              key={produto.id}
              className="flex items-center justify-between p-3 hover:bg-orange-100 dark:hover:bg-orange-900 rounded transition-colors"
            >
              <div className="flex-1">
                <p className="font-medium">{produto.nome}</p>
                <p className="text-sm text-muted-foreground">
                  R$ {formatNumber(produto.custo_unitario, 4)} / {produto.unidade_uso || produto.unidade_compra}
                </p>
              </div>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => handleAddEmbalagem(produto)}
              >
                <Plus className="h-4 w-4 mr-1" />
                Adicionar
              </Button>
            </div>
          ))}
        </div>
      )}

      {embalagens.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground border rounded-lg">
          Nenhuma embalagem adicionada
        </div>
      ) : (
        <Table>
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
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveEmbalagem(embalagem.id)}
                    >
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
      )}
    </div>
  );
}
