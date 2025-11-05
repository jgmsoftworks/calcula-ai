import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import type { ReceitaCompleta, Receita } from '@/types/receitas';

interface SubReceitasTabProps {
  receita: ReceitaCompleta;
  onUpdate: () => void;
}

export function SubReceitasTab({ receita, onUpdate }: SubReceitasTabProps) {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [receitas, setReceitas] = useState<Receita[]>([]);
  const [showResults, setShowResults] = useState(false);

  const handleSearch = async () => {
    if (!user || !search.trim()) return;

    try {
      const { data, error } = await supabase
        .from('receitas')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'finalizada')
        .neq('id', receita.id)
        .ilike('nome', `%${search}%`)
        .limit(10);

      if (error) throw error;
      setReceitas((data || []) as Receita[]);
      setShowResults(true);
    } catch (error: any) {
      console.error('Erro ao buscar receitas:', error);
      toast.error('Erro ao buscar receitas');
    }
  };

  const handleAddSubReceita = async (subReceita: Receita) => {
    try {
      const { error } = await supabase.from('receita_sub_receitas').insert({
        receita_id: receita.id,
        sub_receita_id: subReceita.id,
        quantidade: 1,
      });

      if (error) throw error;
      toast.success('Sub-receita adicionada');
      setSearch('');
      setShowResults(false);
      onUpdate();
    } catch (error: any) {
      console.error('Erro ao adicionar sub-receita:', error);
      toast.error('Erro ao adicionar sub-receita');
    }
  };

  const handleRemoveSubReceita = async (id: string) => {
    try {
      const { error } = await supabase
        .from('receita_sub_receitas')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Sub-receita removida');
      onUpdate();
    } catch (error: any) {
      console.error('Erro ao remover sub-receita:', error);
      toast.error('Erro ao remover sub-receita');
    }
  };

  const handleUpdateQuantidade = async (id: string, quantidade: number) => {
    try {
      const { error } = await supabase
        .from('receita_sub_receitas')
        .update({ quantidade })
        .eq('id', id);

      if (error) throw error;
      onUpdate();
    } catch (error: any) {
      console.error('Erro ao atualizar quantidade:', error);
      toast.error('Erro ao atualizar quantidade');
    }
  };

  const total = receita.sub_receitas.reduce((sum, sr) => {
    if (!sr.sub_receita) return sum;
    return sum + (sr.sub_receita.preco_venda * sr.quantidade);
  }, 0);

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Buscar Sub-receitas..."
            className="pl-9"
          />
        </div>
        <Button onClick={handleSearch}>
          <Search className="h-4 w-4 mr-2" />
          Buscar
        </Button>
      </div>

      {showResults && receitas.length > 0 && (
        <div className="border rounded-lg p-2 space-y-2 max-h-60 overflow-y-auto">
          {receitas.map((r) => (
            <div
              key={r.id}
              className="flex items-center justify-between p-2 hover:bg-accent rounded cursor-pointer"
              onClick={() => handleAddSubReceita(r)}
            >
              <div>
                <p className="font-medium">{r.nome}</p>
                <p className="text-sm text-muted-foreground">
                  R$ {r.preco_venda.toFixed(2)} / {r.rendimento_unidade || 'un'}
                </p>
              </div>
              <Plus className="h-4 w-4" />
            </div>
          ))}
        </div>
      )}

      {receita.sub_receitas.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground border rounded-lg">
          Nenhuma sub-receita adicionada
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Badge variant="secondary" className="text-base px-4 py-2">
              Total: R$ {total.toFixed(2)}
            </Badge>
          </div>
          <Table>
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
              {receita.sub_receitas.map((subReceita) => {
                if (!subReceita.sub_receita) return null;
                
                const custoTotal = subReceita.sub_receita.preco_venda * subReceita.quantidade;
                const unidade = subReceita.sub_receita.rendimento_unidade || 'un';

                return (
                  <TableRow key={subReceita.id}>
                    <TableCell>{subReceita.sub_receita.nome}</TableCell>
                    <TableCell>{unidade}</TableCell>
                    <TableCell className="text-right">
                      <Input
                        type="number"
                        value={subReceita.quantidade}
                        onChange={(e) => handleUpdateQuantidade(subReceita.id, Number(e.target.value))}
                        className="w-20 text-right"
                        min="0"
                        step="0.01"
                      />
                    </TableCell>
                    <TableCell className="text-right">R$ {subReceita.sub_receita.preco_venda.toFixed(2)}</TableCell>
                    <TableCell className="text-right">R$ {custoTotal.toFixed(2)}</TableCell>
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
    </div>
  );
}
