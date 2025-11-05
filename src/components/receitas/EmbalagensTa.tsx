import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2 } from 'lucide-react';
import { SelectorProdutos } from './SelectorProdutos';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { ReceitaCompleta } from '@/types/receitas';

interface EmbalagensTabProps {
  receita: ReceitaCompleta;
  onUpdate: () => void;
}

export function EmbalagensTa({ receita, onUpdate }: EmbalagensTabProps) {
  const [showSelector, setShowSelector] = useState(false);

  const handleAddEmbalagem = async (produto: any, quantidade: number) => {
    try {
      const custoUnitario = produto.custo_unitario_uso || produto.custo_unitario;
      const unidade = produto.unidade_uso_final || produto.unidade_compra;
      
      const { error } = await supabase.from('receita_embalagens').insert({
        receita_id: receita.id,
        produto_id: produto.id,
        nome: produto.nome,
        quantidade,
        unidade,
        custo_unitario: custoUnitario,
        custo_total: custoUnitario * quantidade,
      });

      if (error) throw error;
      toast.success('Embalagem adicionada');
      onUpdate();
    } catch (error: any) {
      console.error('Erro ao adicionar embalagem:', error);
      toast.error('Erro ao adicionar embalagem');
    }
  };

  const handleRemoveEmbalagem = async (id: string) => {
    try {
      const { error } = await supabase
        .from('receita_embalagens')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Embalagem removida');
      onUpdate();
    } catch (error: any) {
      console.error('Erro ao remover embalagem:', error);
      toast.error('Erro ao remover embalagem');
    }
  };

  const total = receita.embalagens.reduce((sum, emb) => sum + emb.custo_total, 0);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Embalagens</h3>
        <Button onClick={() => setShowSelector(true)} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Embalagem
        </Button>
      </div>

      {receita.embalagens.length === 0 ? (
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
            {receita.embalagens.map((embalagem) => (
              <TableRow key={embalagem.id}>
                <TableCell>{embalagem.nome}</TableCell>
                <TableCell className="text-right">{embalagem.quantidade}</TableCell>
                <TableCell className="text-right">{(embalagem as any).unidade || 'un'}</TableCell>
                <TableCell className="text-right">
                  <div className="text-sm">R$ {embalagem.custo_unitario.toFixed(4)}/{(embalagem as any).unidade || 'un'}</div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="font-medium">R$ {embalagem.custo_total.toFixed(2)}</div>
                  <div className="text-xs text-muted-foreground">
                    {embalagem.quantidade} × R$ {embalagem.custo_unitario.toFixed(4)}
                  </div>
                </TableCell>
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
          onSelect={handleAddEmbalagem}
          onClose={() => setShowSelector(false)}
        />
      )}
    </div>
  );
}
