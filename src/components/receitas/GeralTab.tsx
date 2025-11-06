import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { NumericInputPtBr } from '@/components/ui/numeric-input-ptbr';
import { TemperatureInput } from '@/components/ui/temperature-input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Camera, Plus, Trash2, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { resizeImageToSquare } from '@/lib/imageUtils';
import type { ReceitaCompleta } from '@/types/receitas';

interface GeralTabProps {
  receita: ReceitaCompleta | null;
  formData: any;
  onFormChange: (field: string, value: any) => void;
  onUpdate: () => void;
}

export function GeralTab({ receita, formData, onFormChange, onUpdate }: GeralTabProps) {
  const [novoPasso, setNovoPasso] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

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

  const handleImageUpload = async (file: File) => {
    if (!receita) return;
    
    try {
      setUploadingImage(true);
      
      // 0. Obter user_id
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Usuário não autenticado');
        return;
      }
      
      // 1. Redimensionar imagem para 512x512
      const resizedImage = await resizeImageToSquare(
        URL.createObjectURL(file),
        512,
        0.9
      );
      
      // 2. Converter data URL para Blob
      const response = await fetch(resizedImage);
      const blob = await response.blob();
      
      // 3. Upload para Supabase Storage (com user_id no path)
      const fileName = `${user.id}/${receita.id}-${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from('receitas-images')
        .upload(fileName, blob, {
          contentType: 'image/jpeg',
          upsert: true
        });
      
      if (uploadError) throw uploadError;
      
      // 4. Obter URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('receitas-images')
        .getPublicUrl(fileName);
      
      // 5. Atualizar receita no banco
      const { error: updateError } = await supabase
        .from('receitas')
        .update({ imagem_url: publicUrl })
        .eq('id', receita.id);
      
      if (updateError) throw updateError;
      
      setImagePreview(publicUrl);
      toast.success('Imagem atualizada!');
      onUpdate();
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      toast.error('Erro ao fazer upload da imagem');
    } finally {
      setUploadingImage(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* SEÇÃO 1: Imagem + Conservação lado a lado */}
      <div className="grid grid-cols-[300px_1fr] gap-6">
        {/* Upload de Imagem */}
        <div className="space-y-2">
          <Label>Imagem da Receita</Label>
          <div className="relative aspect-square bg-muted rounded-lg overflow-hidden border-2 border-dashed border-muted-foreground/25 hover:border-muted-foreground/50 transition-colors">
            {imagePreview || receita?.imagem_url ? (
              <>
                <img 
                  src={imagePreview || receita?.imagem_url} 
                  alt="Imagem da receita"
                  className="w-full h-full object-cover"
                />
                <Button
                  variant="secondary"
                  size="sm"
                  className="absolute bottom-2 right-2"
                  onClick={() => document.getElementById('image-upload')?.click()}
                  disabled={uploadingImage}
                >
                  <Camera className="h-4 w-4 mr-2" />
                  Alterar
                </Button>
              </>
            ) : (
              <label 
                htmlFor="image-upload"
                className="flex flex-col items-center justify-center h-full cursor-pointer p-4 text-center"
              >
                <Camera className="h-12 w-12 mb-2 text-muted-foreground" />
                <span className="text-sm font-medium">Clique para adicionar</span>
                <span className="text-xs text-muted-foreground mt-1">
                  A imagem será redimensionada automaticamente
                </span>
              </label>
            )}
            
            <input
              id="image-upload"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleImageUpload(file);
              }}
              disabled={uploadingImage}
            />
            
            {uploadingImage && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-white" />
              </div>
            )}
          </div>
        </div>

        {/* Conservação */}
        <div className="space-y-3">
          <Label>Conservação</Label>
          <div className="space-y-4 border rounded-lg p-4">
            {/* Congelado */}
            <div className="grid grid-cols-[120px_1fr_1fr_110px] gap-4 items-end">
              <Label className="text-sm font-medium pb-2">Congelado</Label>
              <div className="space-y-1.5">
                <Label htmlFor="temp_congelado" className="text-xs text-muted-foreground">Temp. °C</Label>
                <TemperatureInput
                  id="temp_congelado"
                  value={formData.conservacao?.congelado?.temperatura || 0}
                  onChange={(value) => onFormChange('conservacao', {
                    ...formData.conservacao,
                    congelado: { ...formData.conservacao?.congelado, temperatura: value }
                  })}
                  placeholder="-18"
                />
              </div>
              <div className="space-y-1.5">
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
            <div className="grid grid-cols-[120px_1fr_1fr_110px] gap-4 items-end">
              <Label className="text-sm font-medium pb-2">Refrigerado</Label>
              <div className="space-y-1.5">
                <Label htmlFor="temp_refrigerado" className="text-xs text-muted-foreground">Temp. °C</Label>
                <TemperatureInput
                  id="temp_refrigerado"
                  value={formData.conservacao?.refrigerado?.temperatura || 0}
                  onChange={(value) => onFormChange('conservacao', {
                    ...formData.conservacao,
                    refrigerado: { ...formData.conservacao?.refrigerado, temperatura: value }
                  })}
                  placeholder="3"
                />
              </div>
              <div className="space-y-1.5">
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
            <div className="grid grid-cols-[120px_1fr_1fr_110px] gap-4 items-end">
              <Label className="text-sm font-medium pb-2">Ambiente</Label>
              <div className="space-y-1.5">
                <Label htmlFor="temp_ambiente" className="text-xs text-muted-foreground">Temp. °C</Label>
                <TemperatureInput
                  id="temp_ambiente"
                  value={formData.conservacao?.ambiente?.temperatura || 0}
                  onChange={(value) => onFormChange('conservacao', {
                    ...formData.conservacao,
                    ambiente: { ...formData.conservacao?.ambiente, temperatura: value }
                  })}
                  placeholder="0"
                />
              </div>
              <div className="space-y-1.5">
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

      {/* SEÇÃO 2: Nome da Receita (largura total) */}
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

      {/* SEÇÃO 3: Tipo de Produto (largura total) */}
      <div className="space-y-2">
        <Label htmlFor="tipo_produto">Tipo de Produto</Label>
        <Input
          id="tipo_produto"
          value={formData.tipo_produto || ''}
          onChange={(e) => onFormChange('tipo_produto', e.target.value)}
          placeholder="Ex: MASSA, DOCE, SALGADO"
        />
      </div>

      {/* SEÇÃO 3: Modo de Preparo (largura total) */}
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

      {/* SEÇÃO 4: Observações (largura total) */}
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
