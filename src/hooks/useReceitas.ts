import { fetchTiposProduto as loadTiposProduto } from '@/lib/tiposProdutoData';
import { useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import { resizeImageToSquare } from '@/lib/imageUtils';
import { usePlanGate } from '@/contexts/PlanLimitContext';
import { isPlanLimitError } from '@/lib/plan-access';
import { recipeDuplicateRequest, savedRecipeResponse, isRecipeMarkupRequired, RECIPE_MARKUP_REQUIRED, type RecipeSaveRequest } from '@/lib/recipe-save';
import type { Receita, ReceitaCompleta, ReceitaIngrediente, ReceitaEmbalagem, ReceitaPasso } from '@/types/receitas';

export function useReceitas() {
  const { user } = useAuth();
  const { requestAccess } = usePlanGate();
  const [loading, setLoading] = useState(false);
  const pendingCopies = useRef(new Map<string, { request: RecipeSaveRequest; name: string }>());
  const copying = useRef(new Map<string, Promise<boolean>>());

  const saveReceitaCompleta = async (request: RecipeSaveRequest) => {
    if (!user) throw new Error('Sessão indisponível.');
    setLoading(true);
    try {
      // The RPC enforces permissions/limits and commits all recipe rows together.
      // No preflight count on retry: a lost response may already have used the last plan slot.
      const { data, error } = await supabase.rpc('salvar_receita_completa', request);
      if (error) throw error;
      return savedRecipeResponse(data, request.p_receita_id);
    } catch (error) {
      if (isPlanLimitError(error)) await requestAccess('receitas');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const gerarNumeroSequencial = async () => {
    if (!user) return 1;
    
    const { data, error } = await supabase
      .from('receitas')
      .select('numero_sequencial')
      .eq('user_id', user.id)
      .order('numero_sequencial', { ascending: false })
      .limit(1);

    if (error) {
      console.error('Erro ao buscar número sequencial:', error);
      return 1;
    }

    return (data[0]?.numero_sequencial || 0) + 1;
  };

  const fetchTiposProduto = (signal?: AbortSignal) => user ? loadTiposProduto(user.id, signal) : Promise.resolve([]);

  const fetchReceitaCompleta = async (id: string): Promise<ReceitaCompleta | null> => {
    if (!user) return null;

    setLoading(true);
    try {
      const { data: receita, error: receitaError } = await supabase
        .from('receitas')
        .select(`
          *,
          tipo_produto:tipos_produto(id, nome),
          markup:markups(id, nome, tipo)
        `)
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

      if (receitaError) throw receitaError;

      const [ingredientes, embalagens, passos, subReceitas, maoObra] = await Promise.all([
        supabase.from('receita_ingredientes').select(`
          *,
          produto:produtos(
            id,
            nome,
            marcas,
            custo_unitario,
            unidade_compra,
            unidade_uso,
            fator_conversao
          )
        `).eq('receita_id', id),
        supabase.from('receita_embalagens').select(`
          *,
          produto:produtos(
            id,
            nome,
            custo_unitario,
            unidade_compra,
            unidade_uso,
            fator_conversao
          )
        `).eq('receita_id', id),
        supabase.from('receita_passos_preparo').select('*').eq('receita_id', id).order('ordem'),
      supabase.from('receita_sub_receitas').select(`
        *,
        sub_receita:receitas!receita_sub_receitas_sub_receita_id_fkey(
          id,
          nome,
          preco_venda,
          rendimento_unidade,
          rendimento_valor
        )
      `).eq('receita_id', id),
        supabase.from('receita_mao_obra').select('*').eq('receita_id', id),
      ]);

      const relationError = [ingredientes, embalagens, passos, subReceitas, maoObra].find(result => result.error)?.error;
      if (relationError) throw relationError;

      return {
        ...receita,
        ingredientes: ingredientes.data || [],
        embalagens: embalagens.data || [],
        passos: passos.data || [],
        sub_receitas: subReceitas.data || [],
        mao_obra: maoObra.data || [],
      } as any as ReceitaCompleta;
    } catch (error: any) {
      console.error('Erro ao buscar receita completa:', error);
      toast.error('Erro ao carregar receita');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const createReceita = async (data: Partial<Receita>) => {
    if (!user) return null;
    if (!await requestAccess('receitas')) return null;
    if (!data.markup_id?.trim()) {
      toast.error(RECIPE_MARKUP_REQUIRED);
      return null;
    }

    setLoading(true);
    try {
      const numeroSequencial = await gerarNumeroSequencial();

      const { data: receita, error } = await supabase
        .from('receitas')
        .insert([{
          nome: data.nome || '',
          tipo_produto_id: data.tipo_produto_id || null,
          rendimento_valor: data.rendimento_valor || null,
          rendimento_unidade: data.rendimento_unidade || null,
          observacoes: data.observacoes || null,
          status: 'finalizada',
          preco_venda: data.preco_venda || 0,
          tempo_preparo_total: data.tempo_preparo_total || 0,
          tempo_preparo_unidade: data.tempo_preparo_unidade || 'minutos',
          tempo_preparo_mao_obra: 0,
          peso_unitario: data.peso_unitario || null,
          conservacao: data.conservacao || null,
          markup_id: data.markup_id || null,
          user_id: user.id,
          numero_sequencial: numeroSequencial,
        }])
        .select()
        .single();

      if (error) throw error;

      toast.success('Receita criada com sucesso!');
      return receita;
    } catch (error: any) {
      console.error('Erro ao criar receita:', error);
      if (isPlanLimitError(error)) await requestAccess('receitas');
      else toast.error('Não foi possível criar a receita. Tente novamente.');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const updateReceita = async (id: string, data: Partial<Receita>) => {
    if (!user) return false;

    setLoading(true);
    try {
      // Remover campos que são JOINs e não devem ser atualizados
      const { tipo_produto, markup_tipo, ...updateData } = data as any;
      
      const { error } = await supabase
        .from('receitas')
        .update(updateData)
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      toast.success('Receita atualizada com sucesso!');
      return true;
    } catch (error: any) {
      console.error('Erro ao atualizar receita:', error);
      toast.error('Erro ao atualizar receita');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const deleteReceita = async (id: string) => {
    if (!user) return false;

    setLoading(true);
    try {
      // Verificar se está sendo usada como sub-receita em outras receitas
      const { data: receitasQueUsam } = await supabase
        .from('receita_sub_receitas')
        .select(`
          receita:receitas!receita_sub_receitas_receita_id_fkey(nome)
        `)
        .eq('sub_receita_id', id);

      if (receitasQueUsam && receitasQueUsam.length > 0) {
        // Extrair nomes das receitas que usam esta sub-receita
        const nomes = receitasQueUsam
          .map((r: any) => r.receita?.nome)
          .filter(Boolean)
          .join(', ');
        
        toast.error(
          `Não é possível excluir esta receita pois está sendo usada como sub-receita em: ${nomes}`
        );
        return false;
      }

      // Se não está sendo usada, prosseguir com exclusão
      const { error } = await supabase
        .from('receitas')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      toast.success('Receita excluída com sucesso!');
      return true;
    } catch (error: any) {
      console.error('Erro ao excluir receita:', error);
      toast.error('Erro ao excluir receita');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const uploadImagemReceita = async (file: File, receitaId: string) => {
    if (!user) return null;

    try {
      const reader = new FileReader();
      const imageDataUrl = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const resizedImage = await resizeImageToSquare(imageDataUrl, 512, 0.8);
      
      const blob = await fetch(resizedImage).then(r => r.blob());
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${receitaId}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('receitas-images')
        .upload(fileName, blob, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('receitas-images')
        .getPublicUrl(fileName);

      await supabase
        .from('receitas')
        .update({ imagem_url: publicUrl })
        .eq('id', receitaId)
        .eq('user_id', user.id);

      return publicUrl;
    } catch (error: any) {
      console.error('Erro ao fazer upload da imagem:', error);
      toast.error('Erro ao fazer upload da imagem');
      return null;
    }
  };

  const deleteImagemReceita = async (receitaId: string) => {
    if (!user) return false;

    try {
      const { data: receita } = await supabase
        .from('receitas')
        .select('imagem_url')
        .eq('id', receitaId)
        .eq('user_id', user.id)
        .single();

      if (receita?.imagem_url) {
        const fileName = receita.imagem_url.split('/').slice(-2).join('/');
        await supabase.storage.from('receitas-images').remove([fileName]);
      }

      await supabase
        .from('receitas')
        .update({ imagem_url: null })
        .eq('id', receitaId)
        .eq('user_id', user.id);

      return true;
    } catch (error: any) {
      console.error('Erro ao deletar imagem:', error);
      return false;
    }
  };

  const calcularCustoTotal = async (receitaId: string) => {
    if (!user) return 0;

    try {
      const [ingredientes, embalagens, maoObra, subReceitas] = await Promise.all([
        supabase.from('receita_ingredientes').select(`
          quantidade,
          produto:produtos(custo_unitario, unidade_uso, fator_conversao, unidade_compra)
        `).eq('receita_id', receitaId),
        supabase.from('receita_embalagens').select(`
          quantidade,
          produto:produtos(custo_unitario, unidade_uso, fator_conversao, unidade_compra)
        `).eq('receita_id', receitaId),
        supabase.from('receita_mao_obra').select('valor_total').eq('receita_id', receitaId),
        supabase.from('receita_sub_receitas').select(`
          quantidade,
          sub_receita:receitas!receita_sub_receitas_sub_receita_id_fkey(preco_venda, rendimento_valor)
        `).eq('receita_id', receitaId),
      ]);

      const custoIngredientes = ingredientes.data?.reduce((sum, i: any) => {
        if (!i.produto) return sum;
        const custoUnitario = i.produto.unidade_uso 
          ? i.produto.custo_unitario / (i.produto.fator_conversao || 1)
          : i.produto.custo_unitario;
        return sum + (custoUnitario * i.quantidade);
      }, 0) || 0;

      const custoEmbalagens = embalagens.data?.reduce((sum, e: any) => {
        if (!e.produto) return sum;
        const custoUnitario = e.produto.unidade_uso 
          ? e.produto.custo_unitario / (e.produto.fator_conversao || 1)
          : e.produto.custo_unitario;
        return sum + (custoUnitario * e.quantidade);
      }, 0) || 0;

      const custoSubReceitas = subReceitas.data?.reduce((sum, s: any) => {
        if (!s.sub_receita) return sum;
        const custoUnitario = s.sub_receita.rendimento_valor && s.sub_receita.rendimento_valor > 0
          ? s.sub_receita.preco_venda / s.sub_receita.rendimento_valor
          : s.sub_receita.preco_venda;
        return sum + (custoUnitario * s.quantidade);
      }, 0) || 0;

      const total = 
        custoIngredientes +
        custoEmbalagens +
        (maoObra.data?.reduce((sum, m) => sum + (m.valor_total || 0), 0) || 0) +
        custoSubReceitas;

      return total;
    } catch (error: any) {
      console.error('Erro ao calcular custo total:', error);
      return 0;
    }
  };

  const duplicarReceita = (receitaId: string): Promise<boolean> => {
    if (!user) return Promise.resolve(false);
    const key = `${user.id}:${receitaId}`;
    const inFlight = copying.current.get(key);
    if (inFlight) return inFlight;

    // Register the promise before the first await, including the plan check.
    const attempt = Promise.resolve().then(async () => {
      setLoading(true);
      try {
        let pending = pendingCopies.current.get(key);
        if (!pending) {
          if (!await requestAccess('receitas')) return false;
          const receitaCompleta = await fetchReceitaCompleta(receitaId);
          if (!receitaCompleta) return false;

          const nomeBase = `${receitaCompleta.nome} (Cópia)`;
          const { data: existentes, error } = await supabase
            .from('receitas')
            .select('nome')
            .eq('user_id', user.id)
            .ilike('nome', `${receitaCompleta.nome} (Cópia%`);
          if (error) throw error;

          const nomesExistentes = new Set((existentes || []).map(r => r.nome));
          let nomeUnico = nomeBase;
          let contador = 2;
          while (nomesExistentes.has(nomeUnico)) {
            nomeUnico = `${receitaCompleta.nome} (Cópia ${contador++})`;
          }
          pending = { request: recipeDuplicateRequest(receitaCompleta, nomeUnico), name: nomeUnico };
          pendingCopies.current.set(key, pending);
        }

        // One transaction writes the parent and all five component groups.
        // A retry keeps the IDs, name and payload and skips the preflight quota:
        // a lost response may already have committed the last allowed recipe.
        await saveReceitaCompleta(pending.request);
        pendingCopies.current.delete(key);
        toast.success(`Receita duplicada: "${pending.name}"`);
        return true;
      } catch (error: unknown) {
        console.error('Erro ao duplicar receita:', error);
        // saveReceitaCompleta already opens the plan dialog on a server denial.
        if (isRecipeMarkupRequired(error)) toast.error('Abra a receita original e selecione um markup na etapa Precificação antes de duplicar.');
        else if (!isPlanLimitError(error)) toast.error('Não foi possível confirmar a duplicação. Tente novamente.');
        return false;
      } finally {
        copying.current.delete(key);
        setLoading(false);
      }
    });
    copying.current.set(key, attempt);
    return attempt;
  };

  return {
    loading,
    saveReceitaCompleta,
    gerarNumeroSequencial,
    fetchReceitaCompleta,
    createReceita,
    updateReceita,
    deleteReceita,
    duplicarReceita,
    uploadImagemReceita,
    deleteImagemReceita,
    calcularCustoTotal,
    fetchTiposProduto,
  };
}

