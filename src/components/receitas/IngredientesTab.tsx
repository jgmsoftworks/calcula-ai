import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2 } from 'lucide-react';
import { SelectorProdutos } from './SelectorProdutos';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { ReceitaCompleta } from '@/types/receitas';

interface IngredientesTabProps {
  receita: ReceitaCompleta;
  onUpdate: () => void;
}

export function IngredientesTab({ receita, onUpdate }: IngredientesTabProps) {
  const [showSelector, setShowSelector] = useState(false);

  const handleAddIngrediente = async (produto: any, quantidade: number) => {
    try {
      const custoUnitario = produto.custo_unitario_uso || produto.custo_unitario;
      const unidade = produto.unidade_uso_final || produto.unidade_compra;
      
      const { error } = await supabase.from('receita_ingredientes').insert({
        receita_id: receita.id,
        produto_id: produto.id,
        nome: produto.nome,
        marcas: produto.marcas,
        quantidade,
        unidade,
        custo_unitario: custoUnitario,
        custo_total: custoUnitario * quantidade,
      });

      if (error) throw error;
      toast.success('Ingrediente adicionado');
      onUpdate();
    } catch (error: any) {
      console.error('Erro ao adicionar ingrediente:', error);
      toast.error('Erro ao adicionar ingrediente');
    }
  };

  const handleRemoveIngrediente = async (id: string) => {
    try {
      const { error } = await supabase
        .from('receita_ingredientes')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Ingrediente removido');
      onUpdate();
    } catch (error: any) {
      console.error('Erro ao remover ingrediente:', error);
      toast.error('Erro ao remover ingrediente');
    }
  };

  const total = receita.ingredientes.reduce((sum, ing) => sum + ing.custo_total, 0);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Ingredientes</h3>
        <Button onClick={() => setShowSelector(true)} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Ingrediente
        </Button>
      </div>

      {receita.ingredientes.length === 0 ? (
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
            {receita.ingredientes.map((ingrediente) => (
              <TableRow key={ingrediente.id}>
                <TableCell>
                  <div>
                    <div className="font-medium">{ingrediente.nome}</div>
                    {ingrediente.marcas && ingrediente.marcas.length > 0 && (
                      <div className="text-xs text-muted-foreground">
                        Marca: {ingrediente.marcas.join(', ')}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right">{ingrediente.quantidade}</TableCell>
                <TableCell className="text-right">{(ingrediente as any).unidade || 'un'}</TableCell>
                <TableCell className="text-right">
                  <div className="text-sm">R$ {ingrediente.custo_unitario.toFixed(4)}/{(ingrediente as any).unidade || 'un'}</div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="font-medium">R$ {ingrediente.custo_total.toFixed(2)}</div>
                  <div className="text-xs text-muted-foreground">
                    {ingrediente.quantidade} × R$ {ingrediente.custo_unitario.toFixed(4)}
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
            ))}
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
