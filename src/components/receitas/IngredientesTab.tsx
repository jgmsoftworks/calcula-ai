import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2 } from 'lucide-react';
import { SelectorProdutos } from './SelectorProdutos';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
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
}

export function IngredientesTab({ 
  receita, 
  onUpdate, 
  mode, 
  tempIngredientes = [], 
  onAddTemp, 
  onRemoveTemp 
}: IngredientesTabProps) {
  const [showSelector, setShowSelector] = useState(false);

  const handleAddIngrediente = async (produto: any, quantidade: number) => {
    if (mode === 'create') {
      onAddTemp?.(produto, quantidade);
      setShowSelector(false);
      return;
    }

    try {
      const { error } = await supabase.from('receita_ingredientes').insert({
        receita_id: receita!.id,
        produto_id: produto.id,
        quantidade,
      });

      if (error) throw error;
      toast.success('Ingrediente adicionado');
      onUpdate?.();
    } catch (error: any) {
      console.error('Erro ao adicionar ingrediente:', error);
      toast.error('Erro ao adicionar ingrediente');
    }
  };

  const handleRemoveIngrediente = async (id: string) => {
    if (mode === 'create') {
      onRemoveTemp?.(id);
      return;
    }

    try {
      const { error } = await supabase
        .from('receita_ingredientes')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Ingrediente removido');
      onUpdate?.();
    } catch (error: any) {
      console.error('Erro ao remover ingrediente:', error);
      toast.error('Erro ao remover ingrediente');
    }
  };

  const ingredientes = mode === 'create' ? tempIngredientes : (receita?.ingredientes || []);

  const total = ingredientes.reduce((sum, ing) => {
    if (!ing.produto) return sum;
    const custoUnitario = ing.produto.unidade_uso 
      ? ing.produto.custo_unitario / (ing.produto.fator_conversao || 1)
      : ing.produto.custo_unitario;
    return sum + (custoUnitario * ing.quantidade);
  }, 0);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Ingredientes</h3>
        <Button onClick={() => setShowSelector(true)} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Ingrediente
        </Button>
      </div>

      {ingredientes.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground border rounded-lg">
          Nenhum ingrediente adicionado
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Produto</TableHead>
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
                  <TableCell>
                    <div>
                      <div className="font-medium">{ingrediente.produto.nome}</div>
                      {ingrediente.produto.marcas && ingrediente.produto.marcas.length > 0 && (
                        <div className="text-xs text-muted-foreground">
                          Marca: {ingrediente.produto.marcas.join(', ')}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">{ingrediente.quantidade}</TableCell>
                  <TableCell className="text-right">{unidade}</TableCell>
                  <TableCell className="text-right">
                    <div className="text-sm">R$ {custoUnitario.toFixed(4)}/{unidade}</div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="font-medium">R$ {custoTotal.toFixed(2)}</div>
                    <div className="text-xs text-muted-foreground">
                      {ingrediente.quantidade} × R$ {custoUnitario.toFixed(4)}
                    </div>
                  </TableCell>
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
              <TableCell className="text-right font-semibold">R$ {total.toFixed(2)}</TableCell>
              <TableCell></TableCell>
            </TableRow>
          </TableBody>
        </Table>
      )}

      {showSelector && (
        <SelectorProdutos
          onSelect={handleAddIngrediente}
          onClose={() => setShowSelector(false)}
        />
      )}
    </div>
  );
}
