import { localizeText } from '@/i18n/localizeText';
import { useTranslation as usePortugalTranslation } from 'react-i18next';
import { trackRecipeCreated } from '@/lib/funnel-analytics';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState, useEffect, useRef } from 'react';
import { recipeSavePayload, recipeSaveError } from '@/lib/recipe-save';
import { useQueryClient } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { useReceitas } from '@/hooks/useReceitas';
import { IngredientesTab } from './IngredientesTab';
import { SubReceitasTab } from './SubReceitasTab';
import { EmbalagensTa } from './EmbalagensTa';
import { GeralTab } from './GeralTab';
import { ProjecaoTab } from './ProjecaoTab';
import { PrecificacaoTab } from './PrecificacaoTab';

import type { ReceitaCompleta } from '@/types/receitas';
import { ArrowLeft, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
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

interface TempMaoObra {
  id: string;
  funcionario_id: string;
  funcionario_nome: string;
  funcionario_cargo: string;
  custo_por_hora: number;
  tempo: number;
  unidade_tempo: string;
  valor_total: number;
}

interface ReceitaFormProps {
  receita: ReceitaCompleta | null;
  onClose: () => void;
}

export function ReceitaForm({ receita, onClose }: ReceitaFormProps) {
  usePortugalTranslation();
  const { saveReceitaCompleta, fetchReceitaCompleta, loading } = useReceitas();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [saveId] = useState(() => receita?.id || crypto.randomUUID());
  const lastAttempt = useRef<{ payload: string; requestId: string } | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  
  // Prefetched data for child tabs
  const [prefetchedProdutos, setPrefetchedProdutos] = useState<any[]>([]);
  const [prefetchedSubReceitas, setPrefetchedSubReceitas] = useState<any[]>([]);
  const [hasSubReceitaMarkup, setHasSubReceitaMarkup] = useState(true);
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
    markup_tipo: null as string | null,
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
  
  // Estados temporários para modo criação
  const [tempIngredientes, setTempIngredientes] = useState<TempIngrediente[]>([]);
  const [tempSubReceitas, setTempSubReceitas] = useState<TempSubReceita[]>([]);
  const [tempEmbalagens, setTempEmbalagens] = useState<TempEmbalagem[]>([]);
  const [tempPassos, setTempPassos] = useState<TempPasso[]>([]);
  const [tempMaoObra, setTempMaoObra] = useState<TempMaoObra[]>([]);
  
  // Estado para markup atual selecionado
  const [markupAtual, setMarkupAtual] = useState<{ tipo: string } | null>(null);

  const tabs = ['geral', 'ingredientes', 'sub-receitas', 'embalagens', 'projecao', 'precificacao'];
  const currentTabIndex = tabs.indexOf(activeTab);
  
  const isCreating = !receita?.id; // Modo criação se não tem ID

  const handleFormChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
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

  // Prefetch produtos and sub-receitas once when the editor opens
  useEffect(() => {
    if (!user) return;
    
    const fetchProdutos = async () => {
      const { data } = await supabase
        .from('produtos')
        .select('*')
        .eq('user_id', user.id)
        .eq('ativo', true)
        .order('nome');
      setPrefetchedProdutos(data || []);
    };
    
    const fetchSubReceitas = async () => {
      const { data: markupData } = await supabase
        .from('markups')
        .select('id')
        .eq('user_id', user.id)
        .eq('tipo', 'sub_receita')
        .eq('ativo', true)
        .maybeSingle();
      
      if (!markupData) {
        setHasSubReceitaMarkup(false);
        setPrefetchedSubReceitas([]);
        return;
      }
      
      setHasSubReceitaMarkup(true);
      const { data } = await supabase
        .from('receitas')
        .select('*')
        .eq('user_id', user.id)
        .eq('markup_id', markupData.id)
        .order('nome');
      setPrefetchedSubReceitas(data || []);
    };
    
    fetchProdutos();
    fetchSubReceitas();
  }, [user]);

  useEffect(() => {
    if (receita) {
      setReceitaCompleta(receita);
      setFormData({
        nome: receita.nome,
        tipo_produto_id: receita.tipo_produto_id || null,
        rendimento_valor: receita.rendimento_valor || 0,
        rendimento_unidade: receita.rendimento_unidade || 'un',
        observacoes: receita.observacoes || '',
        status: receita.status,
        preco_venda: receita.preco_venda || 0,
        markup_id: receita.markup_id,
        markup_tipo: receita.markup?.tipo || null,
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
    }
  }, [receita]);

  // Carregar dados do banco para estados temporários em modo edição
  useEffect(() => {
    if (receita && receitaCompleta && !isCreating) {
      // Popular estados temporários com dados existentes
      setTempIngredientes(receitaCompleta.ingredientes?.map(i => ({
        id: i.id,
        produto_id: i.produto_id,
        quantidade: i.quantidade,
        produto: i.produto,
      })) || []);
      
      setTempSubReceitas(receitaCompleta.sub_receitas?.map(s => ({
        id: s.id,
        sub_receita_id: s.sub_receita_id,
        quantidade: s.quantidade,
        sub_receita: s.sub_receita,
      })) || []);
      
      setTempEmbalagens(receitaCompleta.embalagens?.map(e => ({
        id: e.id,
        produto_id: e.produto_id,
        quantidade: e.quantidade,
        produto: e.produto,
      })) || []);
      
      setTempPassos(receitaCompleta.passos?.map(p => ({
        id: p.id,
        ordem: p.ordem,
        descricao: p.descricao,
      })) || []);

      setTempMaoObra(receitaCompleta.mao_obra?.map(mo => ({
        id: mo.id,
        funcionario_id: mo.funcionario_id,
        funcionario_nome: mo.funcionario_nome,
        funcionario_cargo: mo.funcionario_cargo,
        custo_por_hora: mo.custo_por_hora,
        tempo: mo.tempo,
        unidade_tempo: mo.unidade_tempo || 'horas',
        valor_total: mo.valor_total,
      })) || []);
    }
  }, [receitaCompleta, receita, isCreating]);

  const loadReceitaCompleta = async () => {
    if (!receita) return;
    const data = await fetchReceitaCompleta(receita.id);
    if (data) {
      setReceitaCompleta(data);
      
      // 🔄 SINCRONIZAR formData com dados do banco após reload
      setFormData(prev => ({
        ...prev,
        markup_id: data.markup_id,
        markup_tipo: data.markup?.tipo || null, // ✅ Já vem do JOIN
        preco_venda: data.preco_venda || 0,
        peso_unitario: data.peso_unitario || 0,
      }));
      
      console.log('✅ formData sincronizado após reload:', {
        markup_id: data.markup_id,
        markup_tipo: data.markup?.tipo,
        preco_venda: data.preco_venda,
        peso_unitario: data.peso_unitario
      });
    }
  };
  
  // Buscar tipo do markup APENAS como fallback (se não vier do loadReceitaCompleta)
  useEffect(() => {
    if (formData.markup_id && !formData.markup_tipo) {
      supabase
        .from('markups')
        .select('tipo')
        .eq('id', formData.markup_id)
        .single()
        .then(({ data }) => {
          if (data) {
            setMarkupAtual(data);
            setFormData(prev => ({ ...prev, markup_tipo: data.tipo }));
          }
        });
    } else if (!formData.markup_id) {
      setMarkupAtual(null);
      setFormData(prev => ({ ...prev, markup_tipo: null }));
    }
  }, [formData.markup_id, formData.markup_tipo]);

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

  const handleAddMaoObraTemp = (maoObra: Omit<TempMaoObra, 'id'>) => {
    setTempMaoObra([...tempMaoObra, {
      ...maoObra,
      id: crypto.randomUUID(),
    }]);
    toast.success('Mão de obra adicionada');
  };

  const handleRemoveMaoObraTemp = (id: string) => {
    setTempMaoObra(tempMaoObra.filter(mo => mo.id !== id));
    toast.success('Mão de obra removida');
  };

  const handleSave = async () => {
    if (savingRef.current) return;
    if (!formData.nome.trim()) {
      toast.error('Nome da receita é obrigatório');
      return;
    }
    savingRef.current = true;
    setSaving(true);
    setSaveError(null);
    try {
      const payload = recipeSavePayload(saveId, isCreating, receitaCompleta?.updated_at || null, formData, {
        ingredientes: tempIngredientes,
        sub_receitas: tempSubReceitas,
        embalagens: tempEmbalagens,
        passos: tempPassos,
        mao_obra: tempMaoObra,
      }, receitaCompleta);
      const fingerprint = JSON.stringify(payload);
      if (lastAttempt.current?.payload !== fingerprint) {
        lastAttempt.current = { payload: fingerprint, requestId: crypto.randomUUID() };
      }
      const saved = await saveReceitaCompleta({ ...payload, p_request_id: lastAttempt.current.requestId });
      if (isCreating && user) trackRecipeCreated(user.id, saved.numero_sequencial);
      toast.success(isCreating ? 'Receita criada com sucesso!' : 'Receita atualizada com sucesso!');
      void queryClient.invalidateQueries({ queryKey: ['receitas-lista', user?.id] });
      onClose();
    } catch (error: unknown) {
      console.error('Erro ao salvar receita completa:', error);
      const message = recipeSaveError(error);
      setSaveError(message);
      toast.error(message);
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const tabLabels: Record<string, string> = {
    'geral': '1 Geral',
    'ingredientes': '2 Ingredientes',
    'sub-receitas': '3 Sub-receitas',
    'embalagens': '4 Embalagens',
    'projecao': '5 Projeção',
    'precificacao': '6 Precificação',
  };

  return (
    <section aria-labelledby="receita-form-title" className="recipe-editor min-w-0 space-y-5">
      <div className="flex items-start gap-3">
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={onClose}
          disabled={saving}
          className="shrink-0"
          aria-label="Voltar para receitas"
          title="Voltar para receitas"
        >
          <ArrowLeft className="h-5 w-5" aria-hidden="true" />
        </Button>
        <div className="min-w-0">
          <h1 id="receita-form-title" className="text-xl font-semibold sm:text-2xl">
            {receita ? 'Editar Receita' : 'Nova Receita'}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Preencha as etapas e salve sua receita ao finalizar.
          </p>
        </div>
      </div>

      {saveError && <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{saveError}</p>}

      <div className="min-w-0 rounded-2xl border bg-card shadow-sm">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="min-w-0">
          <div className="rounded-t-2xl px-2 md:px-6 py-2 md:py-4 border-b bg-background">
            <div className="recipe-compact space-y-2 px-1">
              <label htmlFor="receita-etapa" className="block text-sm font-medium">
                Etapa {currentTabIndex + 1} de {tabs.length}
              </label>
              <Select value={activeTab} disabled={saving} onValueChange={setActiveTab}>
                <SelectTrigger id="receita-etapa" aria-label="Etapa da receita" className="h-12">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {tabs.map(tab => <SelectItem key={tab} value={tab}>{tabLabels[tab]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <TabsList className="recipe-wide-tabs w-full grid-cols-6 gap-1 h-auto">
              <TabsTrigger className="min-h-11" disabled={saving} value="geral">1 Geral</TabsTrigger>
              <TabsTrigger className="min-h-11" disabled={saving} value="ingredientes">2 Ingredientes</TabsTrigger>
              <TabsTrigger className="min-h-11" disabled={saving} value="sub-receitas">3 Sub-receitas</TabsTrigger>
              <TabsTrigger className="min-h-11" disabled={saving} value="embalagens">4 Embalagens</TabsTrigger>
              <TabsTrigger className="min-h-11" disabled={saving} value="projecao">5 Projeção</TabsTrigger>
              <TabsTrigger className="min-h-11" disabled={saving} value="precificacao">{localizeText("6 Precificação")}</TabsTrigger>
            </TabsList>
          </div>

          <div className="min-w-0 px-3 md:px-6 py-4 md:py-6">
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
              prefetchedProdutos={prefetchedProdutos}
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
                prefetchedSubReceitas={prefetchedSubReceitas}
                hasSubReceitaMarkup={hasSubReceitaMarkup}
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
              prefetchedProdutos={prefetchedProdutos}
            />
            </TabsContent>

            <TabsContent value="projecao" className="mt-0">
              <ProjecaoTab
                mode={isCreating ? 'create' : 'edit'}
                receita={isCreating ? {} : receitaCompleta}
                formData={formData}
                onFormChange={handleFormChange}
                tempMaoObra={tempMaoObra}
                onAddMaoObraTemp={handleAddMaoObraTemp}
                onRemoveMaoObraTemp={handleRemoveMaoObraTemp}
              />
            </TabsContent>

            <TabsContent value="precificacao" className="mt-0">
              <PrecificacaoTab
                mode={isCreating ? 'create' : 'edit'}
                receita={{
                  ...receitaCompleta,
                  ingredientes: tempIngredientes,
                  embalagens: tempEmbalagens,
                  sub_receitas: tempSubReceitas,
                  mao_obra: tempMaoObra,
                  rendimento_valor: formData.rendimento_valor,
                  rendimento_unidade: formData.rendimento_unidade,
                  preco_venda: formData.preco_venda,
                  markup_id: formData.markup_id,
                }}
                formData={formData}
                onFormChange={handleFormChange}
                onUpdate={loadReceitaCompleta}
              />
            </TabsContent>
          </div>
        </Tabs>

      <div className="flex justify-between items-center gap-2 rounded-b-2xl px-3 md:px-6 py-3 md:py-4 border-t bg-background">
          <Button variant="outline" size="sm" className="min-h-11 min-w-11" onClick={handlePrevious} disabled={currentTabIndex === 0 || saving} aria-label="Etapa anterior">
            <ChevronLeft className="h-4 w-4 md:mr-2" />
            <span className="hidden md:inline">Anterior</span>
          </Button>

          <Button variant="outline" size="sm" className="min-h-11" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>

          <Button size="sm" className="min-h-11" onClick={currentTabIndex === tabs.length - 1 ? handleSave : handleNext} disabled={loading || saving}>
            {(loading || saving) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {currentTabIndex === tabs.length - 1
              ? (receita ? 'Atualizar' : 'Criar')
              : 'Próximo'
            }
            {currentTabIndex < tabs.length - 1 && <ChevronRight className="h-4 w-4 ml-1 md:ml-2" />}
          </Button>
        </div>
      </div>
    </section>
  );
}

