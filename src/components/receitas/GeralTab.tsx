import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Camera, Plus, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { ReceitaCompleta } from '@/types/receitas';

interface GeralTabProps {
  receita: ReceitaCompleta | null;
  formData: any;
  onFormChange: (field: string, value: any) => void;
  onUpdate: () => void;
}

export function GeralTab({ receita, formData, onFormChange, onUpdate }: GeralTabProps) {
  const [novoPasso, setNovoPasso] = useState('');

  const handleAddPasso = async () => {
    if (!novoPasso.trim() || !receita) return;

    try {
      const ordem = receita.passos.length + 1;
      const { error } = await supabase.from('receita_passos_preparo').insert({
        receita_id: receita.id,
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
  };

  const handleRemovePasso = async (id: string) => {
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
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="nome">Nome da Receita *</Label>
          <Input
            id="nome"
            value={formData.nome || ''}
            onChange={(e) => onFormChange('nome', e.target.value)}
            placeholder="Nome da receita"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="tipo_produto">Tipo de Produto</Label>
          <Input
            id="tipo_produto"
            value={formData.tipo_produto || ''}
            onChange={(e) => onFormChange('tipo_produto', e.target.value)}
            placeholder="Ex: MASSA, DOCE, SALGADO"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Passos de Preparo</Label>
        <div className="space-y-3">
          {receita?.passos.map((passo, index) => (
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
                className="opacity-0 group-hover:opacity-100"
              >
                <Camera className="h-4 w-4" />
              </Button>
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

      <div className="space-y-2">
        <Label htmlFor="observacoes">Observações</Label>
        <Textarea
          id="observacoes"
          value={formData.observacoes || ''}
          onChange={(e) => onFormChange('observacoes', e.target.value)}
          placeholder="Observações gerais sobre a receita..."
          rows={4}
        />
      </div>
    </div>
  );
}
