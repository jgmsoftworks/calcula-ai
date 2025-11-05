import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useReceitas } from '@/hooks/useReceitas';
import { IngredientesTab } from './IngredientesTab';
import { EmbalagensTa } from './EmbalagensTa';
import { PrepareTab } from './PrepareTab';
import { PrecificacaoTab } from './PrecificacaoTab';
import type { Receita, ReceitaCompleta } from '@/types/receitas';
import { Loader2, Upload, X } from 'lucide-react';

interface ReceitaFormProps {
  receita: Receita | null;
  onClose: () => void;
}

export function ReceitaForm({ receita, onClose }: ReceitaFormProps) {
  const { createReceita, updateReceita, fetchReceitaCompleta, uploadImagemReceita, loading } = useReceitas();
  const [activeTab, setActiveTab] = useState('basico');
  const [receitaCompleta, setReceitaCompleta] = useState<ReceitaCompleta | null>(null);
  const [formData, setFormData] = useState({
    nome: '',
    tipo_produto: '',
    rendimento_valor: 0,
    rendimento_unidade: 'un',
    observacoes: '',
    status: 'rascunho' as 'rascunho' | 'finalizada',
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  useEffect(() => {
    if (receita) {
      loadReceitaCompleta();
      setFormData({
        nome: receita.nome,
        tipo_produto: receita.tipo_produto || '',
        rendimento_valor: receita.rendimento_valor || 0,
        rendimento_unidade: receita.rendimento_unidade || 'un',
        observacoes: receita.observacoes || '',
        status: receita.status,
      });
      setImagePreview(receita.imagem_url);
    }
  }, [receita]);

  const loadReceitaCompleta = async () => {
    if (!receita) return;
    const data = await fetchReceitaCompleta(receita.id);
    if (data) setReceitaCompleta(data);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (!formData.nome.trim()) {
      alert('Nome é obrigatório');
      return;
    }

    let savedReceita: any;

    if (receita) {
      await updateReceita(receita.id, formData);
      savedReceita = { id: receita.id };
    } else {
      savedReceita = await createReceita(formData);
    }

    if (savedReceita && imageFile) {
      await uploadImagemReceita(imageFile, savedReceita.id);
    }

    onClose();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{receita ? 'Editar Receita' : 'Nova Receita'}</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="basico">Dados Básicos</TabsTrigger>
            <TabsTrigger value="ingredientes">Ingredientes</TabsTrigger>
            <TabsTrigger value="embalagens">Embalagens</TabsTrigger>
            <TabsTrigger value="preparo">Modo de Preparo</TabsTrigger>
            <TabsTrigger value="precificacao">Precificação</TabsTrigger>
          </TabsList>

          <TabsContent value="basico" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome da Receita *</Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  placeholder="Ex: Bolo de Chocolate"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tipo">Tipo de Produto</Label>
                <Select
                  value={formData.tipo_produto}
                  onValueChange={(value) => setFormData({ ...formData, tipo_produto: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="doce">Doce</SelectItem>
                    <SelectItem value="salgado">Salgado</SelectItem>
                    <SelectItem value="bebida">Bebida</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="rendimento">Rendimento</Label>
                <div className="flex gap-2">
                  <Input
                    id="rendimento"
                    type="number"
                    value={formData.rendimento_valor}
                    onChange={(e) => setFormData({ ...formData, rendimento_valor: Number(e.target.value) })}
                    placeholder="0"
                  />
                  <Select
                    value={formData.rendimento_unidade}
                    onValueChange={(value) => setFormData({ ...formData, rendimento_unidade: value })}
                  >
                    <SelectTrigger className="w-[120px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="un">Unidades</SelectItem>
                      <SelectItem value="kg">Kg</SelectItem>
                      <SelectItem value="g">Gramas</SelectItem>
                      <SelectItem value="l">Litros</SelectItem>
                      <SelectItem value="ml">ML</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value: 'rascunho' | 'finalizada') => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rascunho">Rascunho</SelectItem>
                    <SelectItem value="finalizada">Finalizada</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="observacoes">Observações</Label>
                <Textarea
                  id="observacoes"
                  value={formData.observacoes}
                  onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                  placeholder="Observações sobre a receita..."
                  rows={3}
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label>Imagem da Receita</Label>
                <div className="flex items-center gap-4">
                  {imagePreview && (
                    <div className="relative w-32 h-32">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="w-full h-full object-cover rounded-lg"
                      />
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute -top-2 -right-2 h-6 w-6"
                        onClick={() => {
                          setImageFile(null);
                          setImagePreview(null);
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                  <label className="cursor-pointer">
                    <div className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-accent">
                      <Upload className="h-4 w-4" />
                      <span>Escolher imagem</span>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="ingredientes">
            {receita && receitaCompleta ? (
              <IngredientesTab receita={receitaCompleta} onUpdate={loadReceitaCompleta} />
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Salve os dados básicos primeiro para adicionar ingredientes
              </div>
            )}
          </TabsContent>

          <TabsContent value="embalagens">
            {receita && receitaCompleta ? (
              <EmbalagensTa receita={receitaCompleta} onUpdate={loadReceitaCompleta} />
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Salve os dados básicos primeiro para adicionar embalagens
              </div>
            )}
          </TabsContent>

          <TabsContent value="preparo">
            {receita && receitaCompleta ? (
              <PrepareTab receita={receitaCompleta} onUpdate={loadReceitaCompleta} />
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Salve os dados básicos primeiro para adicionar o modo de preparo
              </div>
            )}
          </TabsContent>

          <TabsContent value="precificacao">
            {receita && receitaCompleta ? (
              <PrecificacaoTab receita={receitaCompleta} onUpdate={loadReceitaCompleta} />
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Salve os dados básicos primeiro para definir a precificação
              </div>
            )}
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-3 pt-4">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Salvar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
