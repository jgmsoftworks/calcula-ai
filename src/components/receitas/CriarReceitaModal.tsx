import { useState, useCallback, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { IngredientesStep } from './steps/IngredientesStep';
import { SubReceitasStep } from './steps/SubReceitasStep';
import { EmbalagensStep } from './steps/EmbalagensStep';
import { GeralStep } from './steps/GeralStep';
import { ProjecaoStep } from './steps/ProjecaoStep';
import { PrecificacaoStep } from './steps/PrecificacaoStep';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { usePlanLimits } from '@/hooks/usePlanLimits';
import { UpgradePlansModal } from '@/components/planos/UpgradePlansModal';

interface MarkupData {
  id: string;
  nome: string;
  tipo: string;
  markup_ideal: number;
}

interface CriarReceitaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  receitaId?: string | null; // Para edição de receita existente
}

// Interfaces for shared state
interface Ingrediente {
  id: string;
  produto_id: string;
  nome: string;
  quantidade: number;
  unidade: string;
  custo_unitario: number;
  custo_total: number;
  marcas?: string[];
}

interface SubReceita {
  id: string;
  receita_id: string;
  nome: string;
  quantidade: number;
  unidade: string;
  custo_unitario: number;
  custo_total: number;
}

interface Embalagem {
  id: string;
  produto_id: string;
  nome: string;
  quantidade: number;
  unidade: string;
  custo_unitario: number;
  custo_total: number;
}

interface MaoObraItem {
  id: string;
  funcionario: {
    id: string;
    nome: string;
    cargo: string;
    custo_por_hora: number;
  };
  tempo: number;
  valorTotal: number;
  unidadeTempo?: string;
}

interface PassoPreparo {
  id: string;
  ordem: number;
  descricao: string;
  imagem?: string;
}

interface ConservacaoItem {
  id: string;
  descricao: string;
  temperatura: string;
  tempo: number;
  unidade_tempo: string;
}

interface ReceitaData {
  ingredientes: Ingrediente[];
  subReceitas: SubReceita[];
  embalagens: Embalagem[];
  maoObra: MaoObraItem[];
  rendimentoValor: string;
  rendimentoUnidade: string;
  // Dados do passo Geral
  nomeReceita: string;
  tipoProduto: string;
  observacoes: string;
  imagemReceita: string;
  passosPreparo: PassoPreparo[];
  conservacao: ConservacaoItem[];
  // Dados da precificação
  markupSelecionado: string | null;
  precoVenda: number;
  pesoUnitario: number;
}

const steps = [
  { id: 'ingredientes', title: 'Ingredientes' },
  { id: 'sub-receitas', title: 'Sub-receitas' },
  { id: 'embalagens', title: 'Embalagens' },
  { id: 'geral', title: 'Geral' },
  { id: 'projecao', title: 'Projeção' },
  { id: 'precificacao', title: 'Precificação' },
];

export function CriarReceitaModal({ open, onOpenChange, receitaId: existingReceitaId }: CriarReceitaModalProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [receitaId, setReceitaId] = useState<string | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const { checkLimit, showUpgradeMessage } = usePlanLimits();
  const [markups, setMarkups] = useState<MarkupData[]>([]);
  
  // Carregar markups quando abre o modal (para novas receitas)
  useEffect(() => {
    const carregarMarkups = async () => {
      if (!user?.id || !open || existingReceitaId) return; // Só carrega para novas receitas
      
      try {
        console.log('📊 Carregando markups para nova receita...');
        const { data: markupsData } = await supabase
          .from('markups')
          .select('*')
          .eq('user_id', user.id)
          .eq('ativo', true);
        
        setMarkups(markupsData || []);
        console.log('✅ Markups carregados:', markupsData?.length || 0);
      } catch (error) {
        console.error('Erro ao carregar markups:', error);
      }
    };
    
    carregarMarkups();
  }, [user?.id, open, existingReceitaId]);
  
  // Shared state for all recipe data (apenas em memória até finalizar)
  const [receitaData, setReceitaData] = useState<ReceitaData>({
    ingredientes: [],
    subReceitas: [],
    embalagens: [],
    maoObra: [],
    rendimentoValor: '',
    rendimentoUnidade: 'unidade',
    // Dados do passo Geral
    nomeReceita: '',
    tipoProduto: '',
    observacoes: '',
    imagemReceita: '',
    passosPreparo: [{ id: '1', ordem: 1, descricao: '' }],
    conservacao: [
      { id: '1', descricao: 'Congelado', temperatura: '', tempo: 0, unidade_tempo: 'meses' },
      { id: '2', descricao: 'Refrigerado', temperatura: '', tempo: 0, unidade_tempo: 'dias' },
      { id: '3', descricao: 'Ambiente', temperatura: '', tempo: 0, unidade_tempo: 'horas' },
    ],
    // Dados da precificação
    markupSelecionado: null,
    precoVenda: 0,
    pesoUnitario: 0,
  });

  // Carregar receita existente para edição
  const carregarReceitaExistente = useCallback(async () => {
    if (!existingReceitaId || !user?.id) return;

    try {
      console.log('📖 Carregando receita para edição:', existingReceitaId);
      
      // Buscar markups disponíveis para uso no cálculo
      const { data: markupsData } = await supabase
        .from('markups')
        .select('*')
        .eq('user_id', user.id)
        .eq('ativo', true);
      
      setMarkups(markupsData || []);
      
      const { data: receita, error } = await supabase
        .from('receitas')
        .select(`
          *,
          receita_ingredientes(*),
          receita_embalagens(*),
          receita_mao_obra(*)
        `)
        .eq('id', existingReceitaId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Erro ao carregar receita:', error);
        toast({
          title: "Erro",
          description: "Não foi possível carregar a receita.",
          variant: "destructive",
        });
        return;
      }

      if (!receita) {
        console.error('Receita não encontrada:', existingReceitaId);
        toast({
          title: "Erro",
          description: "Receita não encontrada.",
          variant: "destructive",
        });
        return;
      }

      // Buscar sub-receitas separadamente para evitar ambiguidade
      const { data: subReceitas } = await supabase
        .from('receita_sub_receitas')
        .select('*')
        .eq('receita_id', existingReceitaId);

      // Buscar passos de preparo
      const { data: passosPreparo } = await supabase
        .from('receita_passos_preparo')
        .select('*')
        .eq('receita_id', existingReceitaId)
        .order('ordem');

      console.log('✅ Receita carregada para edição:', receita);
      
      // Atualizar receitaId para modo edição
      setReceitaId(existingReceitaId);
      
      // Carregar dados da receita no state
      setReceitaData({
        ingredientes: receita.receita_ingredientes?.map((ing: any) => ({
          id: ing.id,
          produto_id: ing.produto_id,
          nome: ing.nome,
          quantidade: ing.quantidade,
          unidade: ing.unidade,
          custo_unitario: ing.custo_unitario,
          custo_total: ing.custo_total,
          marcas: ing.marcas || []
        })) || [],
        subReceitas: subReceitas?.map((sub: any) => ({
          id: sub.id,
          receita_id: sub.sub_receita_id,
          nome: sub.nome,
          quantidade: sub.quantidade,
          unidade: sub.unidade,
          custo_unitario: sub.custo_unitario,
          custo_total: sub.custo_total
        })) || [],
        embalagens: receita.receita_embalagens?.map((emb: any) => ({
          id: emb.id,
          produto_id: emb.produto_id,
          nome: emb.nome,
          quantidade: emb.quantidade,
          unidade: emb.unidade,
          custo_unitario: emb.custo_unitario,
          custo_total: emb.custo_total
        })) || [],
        maoObra: receita.receita_mao_obra?.map((mao: any) => ({
          id: mao.id,
          funcionario: {
            id: mao.funcionario_id,
            nome: mao.funcionario_nome,
            cargo: mao.funcionario_cargo,
            custo_por_hora: mao.custo_por_hora
          },
          tempo: mao.tempo,
          valorTotal: mao.valor_total,
          unidadeTempo: mao.unidade_tempo
        })) || [],
        rendimentoValor: receita.rendimento_valor?.toString() || '',
        rendimentoUnidade: receita.rendimento_unidade || 'unidade',
        nomeReceita: receita.nome || '',
        tipoProduto: receita.tipo_produto || '',
        observacoes: receita.observacoes || '',
        imagemReceita: receita.imagem_url || '',
        passosPreparo: passosPreparo?.map((passo: any) => ({
          id: passo.id,
          ordem: passo.ordem,
          descricao: passo.descricao,
          imagem: passo.imagem_url || ''
        })) || [{ id: '1', ordem: 1, descricao: '' }],
        conservacao: (receita.conservacao as unknown as ConservacaoItem[]) || [
          { id: '1', descricao: 'Congelado', temperatura: '-18°C', tempo: 6, unidade_tempo: 'meses' },
          { id: '2', descricao: 'Refrigerado', temperatura: '4°C', tempo: 3, unidade_tempo: 'dias' },
          { id: '3', descricao: 'Ambiente', temperatura: '20°C', tempo: 2, unidade_tempo: 'horas' },
        ],
        // Dados da precificação
        markupSelecionado: receita.markup_id || null,
        precoVenda: receita.preco_venda || 0,
        pesoUnitario: receita.peso_unitario || 0,
      });

    } catch (error) {
      console.error('Erro ao carregar receita:', error);
    }
  }, [existingReceitaId, user?.id, toast]);

  // Efeito para carregar receita existente quando modal abrir em modo edição
  useEffect(() => {
    if (open && existingReceitaId && user?.id) {
      console.log('📂 Modal aberto em modo edição...');
      carregarReceitaExistente();
    }
  }, [open, existingReceitaId, user?.id, carregarReceitaExistente]);

  const updateReceitaData = (updates: Partial<ReceitaData>) => {
    setReceitaData(prev => ({ ...prev, ...updates }));
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Helper function to upload image to Supabase storage
  const uploadImage = async (file: File, folder: string): Promise<string | null> => {
    if (!user?.id) return null;

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${folder}/${Date.now()}.${fileExt}`;
      
      const { data, error } = await supabase.storage
        .from('receitas-images')
        .upload(fileName, file);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('receitas-images')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error) {
      console.error('Erro ao fazer upload da imagem:', error);
      return null;
    }
  };

  // Função para criar e salvar a receita completa no banco
  const finalizarReceita = async () => {
    if (!user?.id) return;

    // Validação básica
    if (!receitaData.nomeReceita.trim()) {
      toast({
        title: "Erro",
        description: "Por favor, informe o nome da receita.",
        variant: "destructive",
      });
      return;
    }

    // Verificar limite do plano apenas para novas receitas
    if (!existingReceitaId) {
      const limitCheck = await checkLimit('receitas');
      
      if (!limitCheck.allowed) {
        if (limitCheck.reason === 'limit_exceeded') {
          showUpgradeMessage('receitas');
          setShowUpgradeModal(true);
        }
        return;
      }
    }

    try {
      let receitaFinalId = receitaId;
      let imagemUrl = receitaData.imagemReceita;

      // Upload da imagem principal se for um arquivo
      if (receitaData.imagemReceita && receitaData.imagemReceita.startsWith('blob:')) {
        try {
          const response = await fetch(receitaData.imagemReceita);
          const blob = await response.blob();
          const file = new File([blob], 'recipe-image.jpg', { type: 'image/jpeg' });
          imagemUrl = await uploadImage(file, 'recipes') || '';
        } catch (error) {
          console.error('Erro ao processar imagem:', error);
        }
      }

      // Se estamos editando, atualizar receita existente
      if (existingReceitaId) {
        const { error: updateError } = await supabase
          .from('receitas')
          .update({
            nome: receitaData.nomeReceita,
            tipo_produto: receitaData.tipoProduto,
            observacoes: receitaData.observacoes,
            rendimento_valor: parseFloat(receitaData.rendimentoValor) || null,
            rendimento_unidade: receitaData.rendimentoUnidade,
            status: 'finalizada',
            markup_id: receitaData.markupSelecionado,
            conservacao: receitaData.conservacao as any,
            imagem_url: imagemUrl,
            peso_unitario: receitaData.pesoUnitario,
            // Usar preço de venda calculado se disponível, senão calcular
            preco_venda: (() => {
              // Se já temos um preço calculado para sub-receita, usar ele
              if (receitaData.precoVenda !== undefined) {
                console.log('💾 Usando preço de venda do estado:', receitaData.precoVenda);
                return receitaData.precoVenda;
              }
              
              // Senão, calcular baseado no markup selecionado
              if (receitaData.markupSelecionado) {
                const markup = markups.find(m => m.id === receitaData.markupSelecionado);
                if (markup?.tipo === 'sub_receita') {
                  const custoTotal = [...receitaData.ingredientes, ...receitaData.embalagens].reduce((total, item) => total + item.custo_total, 0) +
                                    receitaData.maoObra.reduce((total, item) => total + item.valorTotal, 0);
                  const custoUnitario = custoTotal / (parseFloat(receitaData.rendimentoValor) || 1);
                  const precoCalculado = custoUnitario * markup.markup_ideal;
                  console.log('🧮 Calculando preço na finalização:', precoCalculado);
                  return precoCalculado;
                }
              }
              return 0;
            })()
          })
          .eq('id', existingReceitaId);

        if (updateError) {
          console.error('Erro ao atualizar receita:', updateError);
          toast({
            title: "Erro",
            description: "Não foi possível atualizar a receita.",
            variant: "destructive",
          });
          return;
        }

        receitaFinalId = existingReceitaId;
      } else {
        // Criar nova receita
        const { data: novaReceita, error: createError } = await supabase
          .from('receitas')
          .insert({
            user_id: user.id,
            nome: receitaData.nomeReceita,
            tipo_produto: receitaData.tipoProduto,
            observacoes: receitaData.observacoes,
            rendimento_valor: parseFloat(receitaData.rendimentoValor) || null,
            rendimento_unidade: receitaData.rendimentoUnidade,
            status: 'finalizada',
            markup_id: receitaData.markupSelecionado,
            conservacao: receitaData.conservacao as any,
            imagem_url: imagemUrl,
            peso_unitario: receitaData.pesoUnitario,
            // Usar preço de venda calculado se disponível, senão calcular
            preco_venda: (() => {
              // Se já temos um preço calculado para sub-receita, usar ele
              if (receitaData.precoVenda !== undefined) {
                console.log('💾 Usando preço de venda do estado (nova receita):', receitaData.precoVenda);
                return receitaData.precoVenda;
              }
              
              // Senão, calcular baseado no markup selecionado
              if (receitaData.markupSelecionado) {
                const markup = markups.find(m => m.id === receitaData.markupSelecionado);
                if (markup?.tipo === 'sub_receita') {
                  const custoTotal = [...receitaData.ingredientes, ...receitaData.embalagens].reduce((total, item) => total + item.custo_total, 0) +
                                    receitaData.maoObra.reduce((total, item) => total + item.valorTotal, 0);
                  const custoUnitario = custoTotal / (parseFloat(receitaData.rendimentoValor) || 1);
                  const precoCalculado = custoUnitario * markup.markup_ideal;
                  console.log('🧮 Calculando preço na finalização (nova receita):', precoCalculado);
                  return precoCalculado;
                }
              }
              return 0;
            })()
          } as any)
          .select()
          .single();

        if (createError) {
          console.error('Erro ao criar receita:', createError);
          toast({
            title: "Erro",
            description: "Não foi possível criar a receita.",
            variant: "destructive",
          });
          return;
        }

        receitaFinalId = novaReceita.id;
      }

      // Salvar ingredientes
      if (receitaData.ingredientes.length > 0) {
        if (existingReceitaId) {
          // Deletar ingredientes existentes
          await supabase
            .from('receita_ingredientes')
            .delete()
            .eq('receita_id', existingReceitaId);
        }

        const { error: ingredientesError } = await supabase
          .from('receita_ingredientes')
          .insert(
            receitaData.ingredientes.map(ing => ({
              receita_id: receitaFinalId,
              produto_id: ing.produto_id,
              nome: ing.nome,
              quantidade: ing.quantidade,
              unidade: ing.unidade,
              custo_unitario: ing.custo_unitario,
              custo_total: ing.custo_total,
              marcas: ing.marcas
            }))
          );

        if (ingredientesError) {
          console.error('Erro ao salvar ingredientes:', ingredientesError);
        }
      }

      // Salvar sub-receitas
      if (receitaData.subReceitas.length > 0) {
        if (existingReceitaId) {
          await supabase
            .from('receita_sub_receitas')
            .delete()
            .eq('receita_id', existingReceitaId);
        }

        const { error: subReceitasError } = await supabase
          .from('receita_sub_receitas')
          .insert(
            receitaData.subReceitas.map(sub => ({
              receita_id: receitaFinalId,
              sub_receita_id: sub.receita_id,
              nome: sub.nome,
              quantidade: sub.quantidade,
              unidade: sub.unidade,
              custo_unitario: sub.custo_unitario,
              custo_total: sub.custo_total
            }))
          );

        if (subReceitasError) {
          console.error('Erro ao salvar sub-receitas:', subReceitasError);
        }
      }

      // Salvar embalagens
      if (receitaData.embalagens.length > 0) {
        if (existingReceitaId) {
          await supabase
            .from('receita_embalagens')
            .delete()
            .eq('receita_id', existingReceitaId);
        }

        const { error: embalagensError } = await supabase
          .from('receita_embalagens')
          .insert(
            receitaData.embalagens.map(emb => ({
              receita_id: receitaFinalId,
              produto_id: emb.produto_id,
              nome: emb.nome,
              quantidade: emb.quantidade,
              unidade: emb.unidade,
              custo_unitario: emb.custo_unitario,
              custo_total: emb.custo_total
            }))
          );

        if (embalagensError) {
          console.error('Erro ao salvar embalagens:', embalagensError);
        }
      }

      // Salvar mão de obra
      if (receitaData.maoObra.length > 0) {
        if (existingReceitaId) {
          await supabase
            .from('receita_mao_obra')
            .delete()
            .eq('receita_id', existingReceitaId);
        }

        const { error: maoObraError } = await supabase
          .from('receita_mao_obra')
          .insert(
            receitaData.maoObra.map(mao => ({
              receita_id: receitaFinalId,
              funcionario_id: mao.funcionario.id,
              funcionario_nome: mao.funcionario.nome,
              funcionario_cargo: mao.funcionario.cargo,
              custo_por_hora: mao.funcionario.custo_por_hora,
              tempo: mao.tempo,
              valor_total: mao.valorTotal,
              unidade_tempo: mao.unidadeTempo
            }))
          );

        if (maoObraError) {
          console.error('Erro ao salvar mão de obra:', maoObraError);
        }
      }

      // Salvar passos de preparo
      if (receitaData.passosPreparo.length > 0) {
        // Primeiro deletar registros existentes se for edição
        if (existingReceitaId) {
          await supabase
            .from('receita_passos_preparo')
            .delete()
            .eq('receita_id', existingReceitaId);
        }

        // Processar cada passo e fazer upload das imagens se necessário
        const passosParaSalvar = await Promise.all(
          receitaData.passosPreparo
            .filter(passo => passo.descricao.trim() !== '') // Só salvar passos com descrição
            .map(async (passo, index) => {
              let imagemUrl = passo.imagem || '';
              
              // Se a imagem é um blob (arquivo recém-selecionado), fazer upload
              if (passo.imagem && passo.imagem.startsWith('blob:')) {
                try {
                  const response = await fetch(passo.imagem);
                  const blob = await response.blob();
                  const file = new File([blob], `step-${index + 1}.jpg`, { type: 'image/jpeg' });
                  imagemUrl = await uploadImage(file, 'steps') || '';
                } catch (error) {
                  console.error('Erro ao processar imagem do passo:', error);
                }
              }

              return {
                receita_id: receitaFinalId,
                ordem: passo.ordem,
                descricao: passo.descricao,
                imagem_url: imagemUrl
              };
            })
        );

        if (passosParaSalvar.length > 0) {
          const { error: passosError } = await supabase
            .from('receita_passos_preparo')
            .insert(passosParaSalvar);

          if (passosError) throw passosError;
        }
      }

      toast({
        title: "Sucesso",
        description: existingReceitaId ? "Receita atualizada com sucesso!" : "Receita criada com sucesso!",
      });
      
      handleClose();
    } catch (error) {
      console.error('Erro ao finalizar receita:', error);
      toast({
        title: "Erro",
        description: "Não foi possível finalizar a receita.",
        variant: "destructive",
      });
    }
  };

  const handleClose = () => {
    // Apenas resetar o estado - não há nada para deletar do banco
    setCurrentStep(0);
    setReceitaId(null);
    setReceitaData({
      ingredientes: [],
      subReceitas: [],
      embalagens: [],
      maoObra: [],
      rendimentoValor: '',
      rendimentoUnidade: 'unidade',
      // Dados do passo Geral
      nomeReceita: '',
      tipoProduto: '',
      observacoes: '',
      imagemReceita: '',
      passosPreparo: [{ id: '1', ordem: 1, descricao: '' }],
      conservacao: [
        { id: '1', descricao: 'Congelado', temperatura: '-18°C', tempo: 6, unidade_tempo: 'meses' },
        { id: '2', descricao: 'Refrigerado', temperatura: '4°C', tempo: 3, unidade_tempo: 'dias' },
        { id: '3', descricao: 'Ambiente', temperatura: '20°C', tempo: 2, unidade_tempo: 'horas' },
      ],
      // Dados da precificação
      markupSelecionado: null,
      precoVenda: 0,
      pesoUnitario: 0,
    });
    onOpenChange(false);
  };

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <IngredientesStep
            receitaId={receitaId}
            ingredientes={receitaData.ingredientes}
            onIngredientesChange={(ingredientes) => updateReceitaData({ ingredientes })}
          />
        );
      case 1:
        return (
          <SubReceitasStep
            receitaId={receitaId}
            subReceitas={receitaData.subReceitas}
            onSubReceitasChange={(subReceitas) => updateReceitaData({ subReceitas })}
          />
        );
      case 2:
        return (
          <EmbalagensStep
            receitaId={receitaId}
            embalagens={receitaData.embalagens}
            onEmbalagensChange={(embalagens) => updateReceitaData({ embalagens })}
          />
        );
      case 3:
        return (
          <GeralStep
            receitaId={receitaId || ''}
            nomeReceita={receitaData.nomeReceita}
            observacoes={receitaData.observacoes}
            imagemReceita={receitaData.imagemReceita}
            passosPreparo={receitaData.passosPreparo}
            conservacao={receitaData.conservacao}
            onGeralChange={(data) => updateReceitaData(data)}
          />
        );
      case 4:
        return (
        <ProjecaoStep
          receitaId={receitaId || ''}
          maoObra={receitaData.maoObra}
          rendimentoValor={receitaData.rendimentoValor}
          rendimentoUnidade={receitaData.rendimentoUnidade}
          tipoProduto={receitaData.tipoProduto}
          onMaoObraChange={(maoObra) => updateReceitaData({ maoObra })}
          onRendimentoChange={(rendimentoValor, rendimentoUnidade) => 
            updateReceitaData({ rendimentoValor, rendimentoUnidade })
          }
          onTipoProdutoChange={(tipoProduto) => updateReceitaData({ tipoProduto })}
        />
        );
      case 5:
        return (
          <PrecificacaoStep 
            receitaId={receitaId}
            receitaData={receitaData}
            onReceitaDataChange={setReceitaData}
          />
        );
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {existingReceitaId ? 'Editar Receita' : 'Criar Nova Receita'}
          </DialogTitle>
        </DialogHeader>

        {/* Progress Bar */}
        <div className="flex flex-wrap justify-center lg:justify-between items-center mb-4 gap-1">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div 
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium ${
                  index === currentStep
                    ? 'bg-primary text-primary-foreground'
                    : index < currentStep
                    ? 'bg-primary/20 text-primary'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {index + 1}
              </div>
              <span className={`ml-1 text-xs hidden sm:inline ${
                index === currentStep ? 'text-foreground font-medium' : 'text-muted-foreground'
              }`}>
                {step.title}
              </span>
              {index < steps.length - 1 && (
                <div className={`w-6 h-px mx-2 hidden lg:block ${
                  index < currentStep ? 'bg-primary' : 'bg-muted'
                }`} />
              )}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <div className="min-h-[400px]">
          {renderCurrentStep()}
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between items-center pt-6 border-t">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === 0}
            className="gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            Anterior
          </Button>

          <div className="flex gap-2">
            <Button variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            {currentStep === steps.length - 1 ? (
              <Button onClick={finalizarReceita} className="gap-2">
                {existingReceitaId ? 'Atualizar Receita' : 'Finalizar Receita'}
              </Button>
            ) : (
              <Button onClick={handleNext} className="gap-2">
                Próximo
                <ChevronRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </DialogContent>

      <UpgradePlansModal 
        open={showUpgradeModal}
        onOpenChange={setShowUpgradeModal}
      />
    </Dialog>
  );
}