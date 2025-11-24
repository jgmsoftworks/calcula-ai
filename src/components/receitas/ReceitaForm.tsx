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
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Tipos para itens temporários em modo criação
interface TempIngrediente {
  id: string;
  produto_id: string;
  quantidade: number;
  produto: any;
}

interface TempSubReceita {
  id: string;
  sub_receita_id: string;
  quantidade: number;
  sub_receita: any;
}

interface TempEmbalagem {
  id: string;
  produto_id: string;
  quantidade: number;
  produto: any;
}

interface TempPasso {
  id: string;
  ordem: number;
  descricao: string;
}

interface ReceitaFormProps {
  receita: Receita | null;
  onClose: () => void;
}

export function ReceitaForm({ receita, onClose }: ReceitaFormProps) {
  const { createReceita, updateReceita, fetchReceitaCompleta, uploadImagemReceita, loading } = useReceitas();
  const [activeTab, setActiveTab] = useState('geral');
  const [receitaCompleta, setReceitaCompleta] = useState<ReceitaCompleta | null>(null);
  const [formData, setFormData] = useState({
    nome: '',
    tipo_produto_id: null as string | null,
    rendimento_valor: 0,
    rendimento_unidade: 'un',
    observacoes: '',
    status: 'finalizada' as 'rascunho' | 'finalizada',
    preco_venda: 0,
    markup_id: null as string | null,
    peso_unitario: 0,
    tempo_preparo_total: 0,
    tempo_preparo_unidade: 'minutos' as string,
    tempo_preparo_mao_obra: 0,
    conservacao: {
      congelado: { temperatura: 0, tempo: 0, unidade: 'dias' },
      refrigerado: { temperatura: 0, tempo: 0, unidade: 'dias' },
      ambiente: { temperatura: 0, tempo: 0, unidade: 'horas' }
    },
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  
  // Estados temporários para modo criação
  const [tempIngredientes, setTempIngredientes] = useState<TempIngrediente[]>([]);
  const [tempSubReceitas, setTempSubReceitas] = useState<TempSubReceita[]>([]);
  const [tempEmbalagens, setTempEmbalagens] = useState<TempEmbalagem[]>([]);
  const [tempPassos, setTempPassos] = useState<TempPasso[]>([]);

  const tabs = ['geral', 'ingredientes', 'sub-receitas', 'embalagens', 'projecao', 'precificacao'];
  const currentTabIndex = tabs.indexOf(activeTab);
  
  const isCreating = !receita?.id; // Modo criação se não tem ID

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
        tipo_produto_id: receita.tipo_produto_id || null,
        rendimento_valor: receita.rendimento_valor || 0,
        rendimento_unidade: receita.rendimento_unidade || 'un',
        observacoes: receita.observacoes || '',
        status: receita.status,
        preco_venda: receita.preco_venda || 0,
        markup_id: receita.markup_id,
        peso_unitario: receita.peso_unitario || 0,
        tempo_preparo_total: receita.tempo_preparo_total || 0,
        tempo_preparo_unidade: receita.tempo_preparo_unidade || 'minutos',
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
    if (data) {
      setReceitaCompleta(data);
      
      // 🔄 SINCRONIZAR formData com dados do banco após reload
      setFormData(prev => ({
        ...prev,
        markup_id: data.markup_id,
        preco_venda: data.preco_venda || 0,
        peso_unitario: data.peso_unitario || 0,
      }));
      
      console.log('✅ formData sincronizado após reload:', {
        markup_id: data.markup_id,
        preco_venda: data.preco_venda,
        peso_unitario: data.peso_unitario
      });
    }
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

  const handleAddIngredienteTemp = (produto: any, quantidade: number) => {
    setTempIngredientes([...tempIngredientes, {
      id: crypto.randomUUID(),
      produto_id: produto.id,
      quantidade,
      produto
    }]);
    toast.success('Ingrediente adicionado');
  };

  const handleRemoveIngredienteTemp = (id: string) => {
    setTempIngredientes(tempIngredientes.filter(i => i.id !== id));
    toast.success('Ingrediente removido');
  };

  const handleUpdateQuantidadeIngredienteTemp = (id: string, quantidade: number) => {
    setTempIngredientes(tempIngredientes.map(i => 
      i.id === id ? { ...i, quantidade } : i
    ));
  };

  const handleAddSubReceitaTemp = (subReceita: any, quantidade: number) => {
    setTempSubReceitas([...tempSubReceitas, {
      id: crypto.randomUUID(),
      sub_receita_id: subReceita.id,
      quantidade,
      sub_receita: subReceita
    }]);
    toast.success('Sub-receita adicionada');
  };

  const handleRemoveSubReceitaTemp = (id: string) => {
    setTempSubReceitas(tempSubReceitas.filter(s => s.id !== id));
    toast.success('Sub-receita removida');
  };

  const handleUpdateQuantidadeSubReceitaTemp = (id: string, quantidade: number) => {
    setTempSubReceitas(tempSubReceitas.map(s => 
      s.id === id ? { ...s, quantidade } : s
    ));
  };

  const handleAddEmbalagemTemp = (produto: any, quantidade: number) => {
    setTempEmbalagens([...tempEmbalagens, {
      id: crypto.randomUUID(),
      produto_id: produto.id,
      quantidade,
      produto
    }]);
    toast.success('Embalagem adicionada');
  };

  const handleRemoveEmbalagemTemp = (id: string) => {
    setTempEmbalagens(tempEmbalagens.filter(e => e.id !== id));
    toast.success('Embalagem removida');
  };

  const handleUpdateQuantidadeEmbalagemTemp = (id: string, quantidade: number) => {
    setTempEmbalagens(tempEmbalagens.map(e => 
      e.id === id ? { ...e, quantidade } : e
    ));
  };

  const handleAddPassoTemp = (descricao: string) => {
    const ordem = tempPassos.length + 1;
    setTempPassos([...tempPassos, {
      id: crypto.randomUUID(),
      ordem,
      descricao
    }]);
    toast.success('Passo adicionado');
  };

  const handleRemovePassoTemp = (id: string) => {
    setTempPassos(tempPassos.filter(p => p.id !== id));
    toast.success('Passo removido');
  };

  const handleSave = async () => {
    if (!formData.nome.trim()) {
      toast.error('Nome da receita é obrigatório');
      return;
    }

    try {
      if (isCreating) {
        // MODO CRIAÇÃO: Salvar tudo de uma vez
        const novaReceita = await createReceita(formData);
        if (!novaReceita?.id) {
          toast.error('Erro ao criar receita');
          return;
        }

        // Inserir ingredientes
        if (tempIngredientes.length > 0) {
          const { error: errorIngredientes } = await supabase
            .from('receita_ingredientes')
            .insert(
              tempIngredientes.map(ing => ({
                receita_id: novaReceita.id,
                produto_id: ing.produto_id,
                quantidade: ing.quantidade
              }))
            );
          
          if (errorIngredientes) throw errorIngredientes;
        }

        // Inserir sub-receitas
        if (tempSubReceitas.length > 0) {
          const { error: errorSubReceitas } = await supabase
            .from('receita_sub_receitas')
            .insert(
              tempSubReceitas.map(sub => ({
                receita_id: novaReceita.id,
                sub_receita_id: sub.sub_receita_id,
                quantidade: sub.quantidade
              }))
            );
          
          if (errorSubReceitas) throw errorSubReceitas;
        }

        // Inserir embalagens
        if (tempEmbalagens.length > 0) {
          const { error: errorEmbalagens } = await supabase
            .from('receita_embalagens')
            .insert(
              tempEmbalagens.map(emb => ({
                receita_id: novaReceita.id,
                produto_id: emb.produto_id,
                quantidade: emb.quantidade
              }))
            );
          
          if (errorEmbalagens) throw errorEmbalagens;
        }

        // Inserir passos de preparo
        if (tempPassos.length > 0) {
          const { error: errorPassos } = await supabase
            .from('receita_passos_preparo')
            .insert(
              tempPassos.map(passo => ({
                receita_id: novaReceita.id,
                ordem: passo.ordem,
                descricao: passo.descricao
              }))
            );
          
          if (errorPassos) throw errorPassos;
        }

        // Upload de imagem se houver
        if (imageFile) {
          await uploadImagemReceita(imageFile, novaReceita.id);
        }

        toast.success('Receita criada com sucesso!');
      } else {
        // MODO EDIÇÃO: Apenas atualizar dados básicos
        await updateReceita(receita!.id, formData);
        
        if (imageFile) {
          await uploadImagemReceita(imageFile, receita!.id);
        }
      }

      onClose();
    } catch (error: any) {
      console.error('Erro ao salvar receita:', error);
      toast.error('Erro ao salvar receita');
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent 
        className="w-[1000px] h-[810px] max-w-none flex flex-col p-0 overflow-hidden"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader className="px-6 py-4 border-b shrink-0">
          <DialogTitle>{receita ? 'Editar Receita' : 'Nova Receita'}</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          {/* TabsList FIXA - fora da área de scroll */}
          <div className="px-6 py-4 border-b shrink-0 bg-background">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="geral">1 Geral</TabsTrigger>
              <TabsTrigger value="ingredientes">2 Ingredientes</TabsTrigger>
              <TabsTrigger value="sub-receitas">3 Sub-receitas</TabsTrigger>
              <TabsTrigger value="embalagens">4 Embalagens</TabsTrigger>
              <TabsTrigger value="projecao">5 Projeção</TabsTrigger>
              <TabsTrigger value="precificacao">6 Precificação</TabsTrigger>
            </TabsList>
          </div>

          {/* Área de SCROLL - só o conteúdo */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            <TabsContent value="geral" className="mt-0">
              <GeralTab
                receita={receitaCompleta}
                formData={formData}
                onFormChange={handleFormChange}
                onUpdate={loadReceitaCompleta}
                onTabChange={setActiveTab}
                mode={isCreating ? 'create' : 'edit'}
                tempPassos={tempPassos}
                onAddPassoTemp={handleAddPassoTemp}
                onRemovePassoTemp={handleRemovePassoTemp}
              />
            </TabsContent>

            <TabsContent value="ingredientes" className="mt-0">
            <IngredientesTab
              mode={isCreating ? 'create' : 'edit'}
              receita={receitaCompleta}
              onUpdate={loadReceitaCompleta}
              tempIngredientes={tempIngredientes}
              onAddTemp={handleAddIngredienteTemp}
              onRemoveTemp={handleRemoveIngredienteTemp}
              onUpdateQuantidadeTemp={handleUpdateQuantidadeIngredienteTemp}
            />
            </TabsContent>

            <TabsContent value="sub-receitas" className="mt-0">
              <SubReceitasTab
                mode={isCreating ? 'create' : 'edit'}
                receita={receitaCompleta}
                onUpdate={loadReceitaCompleta}
                tempSubReceitas={tempSubReceitas}
                onAddTemp={handleAddSubReceitaTemp}
                onRemoveTemp={handleRemoveSubReceitaTemp}
                onUpdateQuantidadeTemp={handleUpdateQuantidadeSubReceitaTemp}
              />
            </TabsContent>

            <TabsContent value="embalagens" className="mt-0">
            <EmbalagensTa
              mode={isCreating ? 'create' : 'edit'}
              receita={receitaCompleta}
              onUpdate={loadReceitaCompleta}
              tempEmbalagens={tempEmbalagens}
              onAddTemp={handleAddEmbalagemTemp}
              onRemoveTemp={handleRemoveEmbalagemTemp}
              onUpdateQuantidadeTemp={handleUpdateQuantidadeEmbalagemTemp}
            />
            </TabsContent>

            <TabsContent value="projecao" className="mt-0">
              <ProjecaoTab
                mode={isCreating ? 'create' : 'edit'}
                receita={isCreating ? {} : receitaCompleta}
                formData={formData}
                onFormChange={handleFormChange}
              />
            </TabsContent>

            <TabsContent value="precificacao" className="mt-0">
              <PrecificacaoTab
                mode={isCreating ? 'create' : 'edit'}
                receita={isCreating ? {
                  ingredientes: tempIngredientes,
                  embalagens: tempEmbalagens,
                  sub_receitas: tempSubReceitas,
                  mao_obra: [],
                  rendimento_valor: formData.rendimento_valor,
                  rendimento_unidade: formData.rendimento_unidade,
                  preco_venda: formData.preco_venda,
                  markup_id: formData.markup_id,
                } : receitaCompleta}
                formData={formData}
                onFormChange={handleFormChange}
                onUpdate={loadReceitaCompleta}
                isMarkupSubReceita={receitaCompleta?.markup?.tipo === 'sub_receita'}
              />
            </TabsContent>
          </div>
        </Tabs>

      <div className="flex justify-between items-center px-6 py-4 border-t shrink-0 bg-background">
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
            {currentTabIndex === tabs.length - 1 
              ? (receita ? 'Atualizar Receita' : 'Criar Receita')
              : 'Próximo'
            }
            {currentTabIndex < tabs.length - 1 && <ChevronRight className="h-4 w-4 ml-2" />}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
