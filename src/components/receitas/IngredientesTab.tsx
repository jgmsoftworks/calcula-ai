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

interface TempIngrediente {
  id: string;
  produto_id: string;
  quantidade: number;
  produto: any;
}

interface IngredientesTabProps {
  // Modo edição
  receita?: ReceitaCompleta;
  onUpdate?: () => void;
  
  // Modo criação
  mode: 'create' | 'edit';
  tempIngredientes?: TempIngrediente[];
  onAddTemp?: (produto: any, quantidade: number) => void;
  onRemoveTemp?: (id: string) => void;
  onUpdateQuantidadeTemp?: (id: string, quantidade: number) => void;
}

export function IngredientesTab({ 
  receita, 
  onUpdate, 
  mode, 
  tempIngredientes = [], 
  onAddTemp, 
  onRemoveTemp,
  onUpdateQuantidadeTemp
}: IngredientesTabProps) {
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
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar ingredientes pelo nome ou código..."
            className="pl-9"
          />
        </div>
      </div>

      {produtos.length > 0 && (
        <div className="border border-blue-200 bg-blue-50 dark:bg-blue-950 rounded-lg p-2 space-y-2 max-h-60 overflow-y-auto">
          {produtos.map((produto) => (
            <div
              key={produto.id}
              className="flex items-center justify-between p-3 hover:bg-blue-100 dark:hover:bg-blue-900 rounded transition-colors"
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
                onClick={() => handleAddIngrediente(produto)}
              >
                <Plus className="h-4 w-4 mr-1" />
                Adicionar
              </Button>
            </div>
          ))}
        </div>
      )}

      {ingredientes.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground border rounded-lg">
          Nenhum ingrediente adicionado
        </div>
      ) : (
        <Table>
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
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveIngrediente(ingrediente.id)}
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
