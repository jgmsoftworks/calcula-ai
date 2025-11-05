import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { NumericInputPtBr } from '@/components/ui/numeric-input-ptbr';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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

      {/* Imagem e Conservação lado a lado */}
      <div className="grid grid-cols-2 gap-4">
        {/* Bloco esquerdo - Upload de Imagem */}
        <div className="space-y-2 border rounded-lg p-4 flex flex-col items-center justify-center min-h-[400px]">
          <h3 className="text-lg font-semibold mb-2">Imagem da Receita</h3>
          {receita?.imagem_url ? (
            <div className="relative w-full h-64">
              <img
                src={receita.imagem_url}
                alt={receita.nome}
                className="w-full h-full object-cover rounded-lg"
              />
              <Button
                variant="destructive"
                size="sm"
                className="absolute top-2 right-2"
                onClick={async () => {
                  const { useReceitas } = await import('@/hooks/useReceitas');
                  const { deleteImagemReceita } = useReceitas();
                  await deleteImagemReceita(receita.id);
                  onUpdate();
                }}
              >
                Remover
              </Button>
            </div>
          ) : (
            <div className="w-full h-64 border-2 border-dashed rounded-lg flex items-center justify-center">
              <label className="cursor-pointer text-center">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const { useReceitas } = await import('@/hooks/useReceitas');
                      const { uploadImagemReceita } = useReceitas();
                      await uploadImagemReceita(file, receita.id);
                      onUpdate();
                    }
                  }}
                />
                <div className="text-muted-foreground">
                  <p className="font-semibold">Clique para adicionar imagem</p>
                  <p className="text-sm">PNG, JPG até 5MB</p>
                </div>
              </label>
            </div>
          )}
        </div>

        {/* Bloco direito - Conservação */}
        <div className="space-y-4 border rounded-lg p-4">
          <h3 className="text-lg font-semibold">Conservação</h3>
          <div className="space-y-3">
          {/* Congelado */}
          <div className="grid grid-cols-[120px_1fr_1fr_100px] gap-3 items-center">
            <Label className="text-sm font-medium">Congelado</Label>
            <div className="space-y-1">
              <Label htmlFor="temp_congelado" className="text-xs text-muted-foreground">Temp. °C</Label>
              <NumericInputPtBr
                id="temp_congelado"
                tipo="quantidade_continua"
                value={formData.conservacao?.congelado?.temperatura || 0}
                onChange={(value) => onFormChange('conservacao', {
                  ...formData.conservacao,
                  congelado: { ...formData.conservacao?.congelado, temperatura: value }
                })}
                placeholder="-18"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="tempo_congelado" className="text-xs text-muted-foreground">Tempo</Label>
              <NumericInputPtBr
                id="tempo_congelado"
                tipo="quantidade_un"
                value={formData.conservacao?.congelado?.tempo || 0}
                onChange={(value) => onFormChange('conservacao', {
                  ...formData.conservacao,
                  congelado: { ...formData.conservacao?.congelado, tempo: value }
                })}
                placeholder="90"
              />
            </div>
            <Select
              value={formData.conservacao?.congelado?.unidade || 'dias'}
              onValueChange={(value) => onFormChange('conservacao', {
                ...formData.conservacao,
                congelado: { ...formData.conservacao?.congelado, unidade: value }
              })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="horas">horas</SelectItem>
                <SelectItem value="dias">dias</SelectItem>
                <SelectItem value="meses">meses</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Refrigerado */}
          <div className="grid grid-cols-[120px_1fr_1fr_100px] gap-3 items-center">
            <Label className="text-sm font-medium">Refrigerado</Label>
            <div className="space-y-1">
              <Label htmlFor="temp_refrigerado" className="text-xs text-muted-foreground">Temp. °C</Label>
              <NumericInputPtBr
                id="temp_refrigerado"
                tipo="quantidade_continua"
                value={formData.conservacao?.refrigerado?.temperatura || 0}
                onChange={(value) => onFormChange('conservacao', {
                  ...formData.conservacao,
                  refrigerado: { ...formData.conservacao?.refrigerado, temperatura: value }
                })}
                placeholder="3"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="tempo_refrigerado" className="text-xs text-muted-foreground">Tempo</Label>
              <NumericInputPtBr
                id="tempo_refrigerado"
                tipo="quantidade_un"
                value={formData.conservacao?.refrigerado?.tempo || 0}
                onChange={(value) => onFormChange('conservacao', {
                  ...formData.conservacao,
                  refrigerado: { ...formData.conservacao?.refrigerado, tempo: value }
                })}
                placeholder="15"
              />
            </div>
            <Select
              value={formData.conservacao?.refrigerado?.unidade || 'dias'}
              onValueChange={(value) => onFormChange('conservacao', {
                ...formData.conservacao,
                refrigerado: { ...formData.conservacao?.refrigerado, unidade: value }
              })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="horas">horas</SelectItem>
                <SelectItem value="dias">dias</SelectItem>
                <SelectItem value="meses">meses</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Ambiente */}
          <div className="grid grid-cols-[120px_1fr_1fr_100px] gap-3 items-center">
            <Label className="text-sm font-medium">Ambiente</Label>
            <div className="space-y-1">
              <Label htmlFor="temp_ambiente" className="text-xs text-muted-foreground">Temp. °C</Label>
              <NumericInputPtBr
                id="temp_ambiente"
                tipo="quantidade_continua"
                value={formData.conservacao?.ambiente?.temperatura || 0}
                onChange={(value) => onFormChange('conservacao', {
                  ...formData.conservacao,
                  ambiente: { ...formData.conservacao?.ambiente, temperatura: value }
                })}
                placeholder="0"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="tempo_ambiente" className="text-xs text-muted-foreground">Tempo</Label>
              <NumericInputPtBr
                id="tempo_ambiente"
                tipo="quantidade_un"
                value={formData.conservacao?.ambiente?.tempo || 0}
                onChange={(value) => onFormChange('conservacao', {
                  ...formData.conservacao,
                  ambiente: { ...formData.conservacao?.ambiente, tempo: value }
                })}
                placeholder="0"
              />
            </div>
            <Select
              value={formData.conservacao?.ambiente?.unidade || 'horas'}
              onValueChange={(value) => onFormChange('conservacao', {
                ...formData.conservacao,
                ambiente: { ...formData.conservacao?.ambiente, unidade: value }
              })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="horas">horas</SelectItem>
                <SelectItem value="dias">dias</SelectItem>
                <SelectItem value="meses">meses</SelectItem>
              </SelectContent>
            </Select>
          </div>
          </div>
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
