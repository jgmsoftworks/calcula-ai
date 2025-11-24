import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { ReceitaCompleta } from '@/types/receitas';

interface TempPasso {
  id: string;
  ordem: number;
  descricao: string;
}

interface PrepareTabProps {
  mode: 'create' | 'edit';
  receita: ReceitaCompleta | null;
  onUpdate: () => void;
  tempPassos?: TempPasso[];
  onAddTemp?: (descricao: string) => void;
  onRemoveTemp?: (id: string) => void;
}

export function PrepareTab({ mode, receita, onUpdate, tempPassos = [], onAddTemp, onRemoveTemp }: PrepareTabProps) {
  const [novoPasso, setNovoPasso] = useState('');

  const handleAddPasso = async () => {
    if (!novoPasso.trim()) return;

    if (mode === 'create') {
      // Modo criação: usar handler temporário
      onAddTemp?.(novoPasso);
      setNovoPasso('');
    } else {
      // Modo edição: salvar no banco
      try {
        const ordem = (receita?.passos?.length || 0) + 1;
        const { error } = await supabase.from('receita_passos_preparo').insert({
          receita_id: receita!.id,
          ordem,
          descricao: novoPasso,
        });

        if (error) throw error;
        toast.success('Passo adicionado');
        setNovoPasso('');
        onUpdate();
      } catch (error: any) {
        console.error('Erro ao adicionar passo:', error);
        toast.error('Erro ao adicionar passo');
      }
    }
  };

  const handleRemovePasso = async (id: string) => {
    if (mode === 'create') {
      // Modo criação: remover temporariamente
      onRemoveTemp?.(id);
    } else {
      // Modo edição: remover do banco
      try {
        const { error } = await supabase
          .from('receita_passos_preparo')
          .delete()
          .eq('id', id);

        if (error) throw error;
        toast.success('Passo removido');
        onUpdate();
      } catch (error: any) {
        console.error('Erro ao remover passo:', error);
        toast.error('Erro ao remover passo');
      }
    }
  };

  const passos = mode === 'create' ? tempPassos : (receita?.passos || []);

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Modo de Preparo</h3>

      <div className="space-y-4">
        {passos.map((passo, index) => (
          <div key={passo.id} className="flex gap-3 items-start border rounded-lg p-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold">
              {index + 1}
            </div>
            <div className="flex-1">
              <p className="text-sm whitespace-pre-wrap">{passo.descricao}</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleRemovePasso(passo.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}

        <div className="space-y-2">
          <Textarea
            value={novoPasso}
            onChange={(e) => setNovoPasso(e.target.value)}
            placeholder="Descreva o próximo passo..."
            rows={3}
          />
          <Button onClick={handleAddPasso} disabled={!novoPasso.trim()}>
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Passo
          </Button>
        </div>
      </div>
    </div>
  );
}
