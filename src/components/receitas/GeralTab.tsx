import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { NumericInputPtBr } from '@/components/ui/numeric-input-ptbr';
import { TemperatureInput } from '@/components/ui/temperature-input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Camera, Plus, Trash2, Loader2, ArrowRight, Edit } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { resizeImageToSquare } from '@/lib/imageUtils';
import type { ReceitaCompleta } from '@/types/receitas';

interface TempPasso {
  id: string;
  ordem: number;
  descricao: string;
}

interface GeralTabProps {
  receita: ReceitaCompleta | null;
  formData: any;
  onFormChange: (field: string, value: any) => void;
  onUpdate: () => void;
  onTabChange?: (tab: string) => void;
  mode?: 'create' | 'edit';
  tempPassos?: TempPasso[];
  onAddPassoTemp?: (descricao: string) => void;
  onRemovePassoTemp?: (id: string) => void;
}

export function GeralTab({ 
  receita, 
  formData, 
  onFormChange, 
  onUpdate, 
  onTabChange,
  mode = 'edit',
  tempPassos = [],
  onAddPassoTemp,
  onRemovePassoTemp 
}: GeralTabProps) {
  const [novoPasso, setNovoPasso] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [markupInfo, setMarkupInfo] = useState<any>(null);
  const [editandoPasso, setEditandoPasso] = useState<string | null>(null);
  const [textoEdicao, setTextoEdicao] = useState('');

  useEffect(() => {
    const loadMarkupInfo = async () => {
      if (!formData.markup_id) {
        setMarkupInfo(null);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('markups')
          .select('id, nome, tipo')
          .eq('id', formData.markup_id)
          .maybeSingle();

        if (error) throw error;
        setMarkupInfo(data);
      } catch (error) {
        console.error('Erro ao carregar markup:', error);
      }
    };

    loadMarkupInfo();
  }, [formData.markup_id]);

  const handleAddPasso = () => {
    if (!novoPasso.trim()) return;
    onAddPassoTemp?.(novoPasso);
    setNovoPasso('');
    toast.success('Passo adicionado');
  };

  const handleRemovePasso = (id: string) => {
    onRemovePassoTemp?.(id);
    toast.success('Passo removido');
  };

  const handleEditPasso = async (id: string) => {
    if (!textoEdicao.trim()) return;

    try {
      const { error } = await supabase
        .from('receita_passos_preparo')
        .update({ descricao: textoEdicao })
        .eq('id', id);

      if (error) throw error;
      toast.success('Passo atualizado');
      setEditandoPasso(null);
      setTextoEdicao('');
      onUpdate();
    } catch (error: any) {
      console.error('Erro ao editar passo:', error);
      toast.error('Erro ao editar passo');
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

  const handleRemoveImage = async () => {
    if (!receita) return;
    
    try {
      setUploadingImage(true);
      
      // Atualizar receita no banco para remover imagem_url
      const { error: updateError } = await supabase
        .from('receitas')
        .update({ imagem_url: null })
        .eq('id', receita.id);
      
      if (updateError) throw updateError;
      
      // Deletar arquivo do storage
      if (receita.imagem_url) {
        const fileName = receita.imagem_url.split('/').pop();
        if (fileName) {
          await supabase.storage
            .from('receitas-images')
            .remove([`${receita.user_id}/${fileName}`]);
        }
      }
      
      // Limpar preview local
      setImagePreview(null);
      
      toast.success('Imagem removida!');
      onUpdate();
    } catch (error) {
      console.error('Erro ao remover imagem:', error);
      toast.error('Erro ao remover imagem');
    } finally {
      setUploadingImage(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Indicador de Markup Ativo */}
      {markupInfo && (
        <Card className="border-primary border-2">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge className="bg-primary">Markup Ativo</Badge>
                <span className="font-semibold">{markupInfo.nome}</span>
                {markupInfo.tipo === 'sub_receita' && (
                  <Badge className="bg-green-500 text-white">
                    Disponível como Sub-receita
                  </Badge>
                )}
              </div>
              {onTabChange && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => onTabChange('precificacao')}
                >
                  Alterar Markup
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

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
                <div className="absolute bottom-2 right-2 flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => document.getElementById('image-upload')?.click()}
                    disabled={uploadingImage}
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    Alterar
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleRemoveImage}
                    disabled={uploadingImage}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
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

      {/* SEÇÃO 3: Modo de Preparo (largura total) */}
      <div className="space-y-2">
        <Label>Passos de Preparo</Label>
        <div className="space-y-3">
          {(() => {
            const passos = tempPassos;
            return passos.length > 0 ? (
              passos.map((passo, index) => (
                <div key={passo.id} className="flex gap-3 items-start border rounded-lg p-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold">
                    {index + 1}
                  </div>
                  
                  {mode === 'edit' && editandoPasso === passo.id ? (
                    <div className="flex-1 space-y-2">
                      <Textarea
                        value={textoEdicao}
                        onChange={(e) => setTextoEdicao(e.target.value)}
                        rows={3}
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleEditPasso(passo.id)}>
                          Salvar
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          onClick={() => {
                            setEditandoPasso(null);
                            setTextoEdicao('');
                          }}
                        >
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex-1">
                        <p className="text-sm whitespace-pre-wrap">{passo.descricao}</p>
                      </div>
                      <div className="flex gap-1">
                        {mode === 'edit' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setEditandoPasso(passo.id);
                              setTextoEdicao(passo.descricao);
                            }}
                            title="Editar passo"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemovePasso(passo.id)}
                          title="Remover passo"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">Nenhum passo adicionado ainda</p>
            );
          })()}

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
