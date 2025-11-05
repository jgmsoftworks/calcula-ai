import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { useReceitas } from '@/hooks/useReceitas';
import { IngredientesTab } from './IngredientesTab';
import { SubReceitasTab } from './SubReceitasTab';
import { EmbalagensTa } from './EmbalagensTa';
import { GeralTab } from './GeralTab';
import { ProjecaoTab } from './ProjecaoTab';
import { PrecificacaoTab } from './PrecificacaoTab';
import type { Receita, ReceitaCompleta } from '@/types/receitas';
import { Loader2, ChevronLeft, ChevronRight } from 'lucide-react';

interface ReceitaFormProps {
  receita: Receita | null;
  onClose: () => void;
}

export function ReceitaForm({ receita, onClose }: ReceitaFormProps) {
  const { createReceita, updateReceita, fetchReceitaCompleta, loading } = useReceitas();
  const [activeTab, setActiveTab] = useState('ingredientes');
  const [receitaCompleta, setReceitaCompleta] = useState<ReceitaCompleta | null>(null);
  const [formData, setFormData] = useState({
    nome: '',
    tipo_produto: '',
    rendimento_valor: 0,
    rendimento_unidade: 'un',
    observacoes: '',
    status: 'rascunho' as 'rascunho' | 'finalizada',
    preco_venda: 0,
    markup_id: null as string | null,
    peso_unitario: 0,
    tempo_preparo_total: 0,
    tempo_preparo_mao_obra: 0,
    conservacao: {
      congelado: { temperatura: 0, tempo: 0, unidade: 'dias' },
      refrigerado: { temperatura: 0, tempo: 0, unidade: 'dias' },
      ambiente: { temperatura: 0, tempo: 0, unidade: 'horas' }
    },
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const tabs = ['ingredientes', 'sub-receitas', 'embalagens', 'geral', 'projecao', 'precificacao'];
  const currentTabIndex = tabs.indexOf(activeTab);

  const handleFormChange = (field: string, value: any) => {
    setFormData({ ...formData, [field]: value });
  };

  const handlePrevious = () => {
    if (currentTabIndex > 0) {
      setActiveTab(tabs[currentTabIndex - 1]);
    }
  };

  const handleNext = () => {
    if (currentTabIndex < tabs.length - 1) {
      setActiveTab(tabs[currentTabIndex + 1]);
    }
  };

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
        preco_venda: receita.preco_venda || 0,
        markup_id: receita.markup_id,
        peso_unitario: receita.peso_unitario || 0,
        tempo_preparo_total: receita.tempo_preparo_total || 0,
        tempo_preparo_mao_obra: receita.tempo_preparo_mao_obra || 0,
        conservacao: receita.conservacao || {
          congelado: { temperatura: 0, tempo: 0, unidade: 'dias' },
          refrigerado: { temperatura: 0, tempo: 0, unidade: 'dias' },
          ambiente: { temperatura: 0, tempo: 0, unidade: 'horas' }
        },
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

    if (receita) {
      await updateReceita(receita.id, formData);
    } else {
      await createReceita(formData);
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
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="ingredientes">1 Ingredientes</TabsTrigger>
            <TabsTrigger value="sub-receitas">2 Sub-receitas</TabsTrigger>
            <TabsTrigger value="embalagens">3 Embalagens</TabsTrigger>
            <TabsTrigger value="geral">4 Geral</TabsTrigger>
            <TabsTrigger value="projecao">5 Projeção</TabsTrigger>
            <TabsTrigger value="precificacao">6 Precificação</TabsTrigger>
          </TabsList>

          <TabsContent value="ingredientes">
            {receita && receitaCompleta ? (
              <IngredientesTab receita={receitaCompleta} onUpdate={loadReceitaCompleta} />
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Salve os dados básicos primeiro para adicionar ingredientes
              </div>
            )}
          </TabsContent>

          <TabsContent value="sub-receitas">
            {receita && receitaCompleta ? (
              <SubReceitasTab receita={receitaCompleta} onUpdate={loadReceitaCompleta} />
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Salve os dados básicos primeiro para adicionar sub-receitas
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

          <TabsContent value="geral">
            {receita && receitaCompleta ? (
              <GeralTab
                receita={receitaCompleta}
                formData={formData}
                onFormChange={handleFormChange}
                onUpdate={loadReceitaCompleta}
              />
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Salve os dados básicos primeiro
              </div>
            )}
          </TabsContent>

          <TabsContent value="projecao">
            {receita && receitaCompleta ? (
              <ProjecaoTab
                receita={receitaCompleta}
                formData={formData}
                onFormChange={handleFormChange}
              />
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Salve os dados básicos primeiro
              </div>
            )}
          </TabsContent>

          <TabsContent value="precificacao">
            {receita && receitaCompleta ? (
              <PrecificacaoTab
                receita={receitaCompleta}
                formData={formData}
                onFormChange={handleFormChange}
              />
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Salve os dados básicos primeiro para definir a precificação
              </div>
            )}
          </TabsContent>
        </Tabs>

        <div className="flex justify-between items-center pt-4 border-t">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentTabIndex === 0}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Anterior
          </Button>

          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>

          <Button onClick={currentTabIndex === tabs.length - 1 ? handleSave : handleNext} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {currentTabIndex === tabs.length - 1 ? 'Atualizar Receita' : 'Próximo'}
            {currentTabIndex < tabs.length - 1 && <ChevronRight className="h-4 w-4 ml-2" />}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
