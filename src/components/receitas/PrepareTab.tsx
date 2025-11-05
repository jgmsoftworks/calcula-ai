import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, Camera, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useReceitas } from '@/hooks/useReceitas';
import type { ReceitaCompleta } from '@/types/receitas';

interface PrepareTabProps {
  receita: ReceitaCompleta;
  onUpdate: () => void;
}

export function PrepareTab({ receita, onUpdate }: PrepareTabProps) {
  const [novoPasso, setNovoPasso] = useState('');
  const { uploadImagemPasso, deleteImagemPasso } = useReceitas();

  const handleAddPasso = async () => {
    if (!novoPasso.trim()) return;

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

  const handleImageUpload = async (passoId: string, file: File) => {
    try {
      const imageUrl = await uploadImagemPasso(file, receita.id, passoId);
      if (imageUrl) {
        toast.success('Imagem adicionada ao passo');
        onUpdate();
      }
    } catch (error: any) {
      console.error('Erro ao fazer upload da imagem:', error);
      toast.error('Erro ao fazer upload da imagem');
    }
  };

  const handleImageDelete = async (passoId: string) => {
    try {
      await deleteImagemPasso(receita.id, passoId);
      toast.success('Imagem removida');
      onUpdate();
    } catch (error: any) {
      console.error('Erro ao remover imagem:', error);
      toast.error('Erro ao remover imagem');
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Modo de Preparo</h3>

      <div className="space-y-4">
        {receita.passos.map((passo, index) => (
          <div key={passo.id} className="border rounded-lg p-4 space-y-3">
            <div className="flex gap-3 items-start">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold">
                {index + 1}
              </div>
              <div className="flex-1">
                <p className="text-sm whitespace-pre-wrap">{passo.descricao}</p>
              </div>
              <div className="flex gap-1">
                <label>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleImageUpload(passo.id, file);
                    }}
                  />
                  <Button variant="ghost" size="icon" type="button" asChild>
                    <span className="cursor-pointer">
                      <Camera className="h-4 w-4" />
                    </span>
                  </Button>
                </label>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemovePasso(passo.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            {passo.imagem_url && (
              <div className="relative ml-11">
                <img
                  src={passo.imagem_url}
                  alt={`Passo ${index + 1}`}
                  className="w-full max-w-md h-48 object-cover rounded-lg"
                />
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2"
                  onClick={() => handleImageDelete(passo.id)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
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
