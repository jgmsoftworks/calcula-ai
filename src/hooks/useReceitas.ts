import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import { resizeImageToSquare } from '@/lib/imageUtils';
import type { Receita, ReceitaCompleta, ReceitaIngrediente, ReceitaEmbalagem, ReceitaPasso } from '@/types/receitas';

export function useReceitas() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

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

  const fetchReceitas = async (filters?: {
    search?: string;
    tipo?: string;
    status?: 'rascunho' | 'finalizada';
  }) => {
    if (!user) return [];
    
    setLoading(true);
    try {
      let query = supabase
        .from('receitas')
        .select(`
          *,
          total_ingredientes:receita_ingredientes(count),
          total_embalagens:receita_embalagens(count),
          total_sub_receitas:receita_sub_receitas!receita_sub_receitas_receita_id_fkey(count),
          ingredientes:receita_ingredientes(custo_total),
          embalagens:receita_embalagens(custo_total),
          mao_obra:receita_mao_obra(valor_total),
          sub_receitas:receita_sub_receitas!receita_sub_receitas_receita_id_fkey(custo_total)
        `)
        .eq('user_id', user.id)
        .order('numero_sequencial', { ascending: false });

      if (filters?.search) {
        query = query.ilike('nome', `%${filters.search}%`);
      }

      if (filters?.tipo) {
        query = query.eq('tipo_produto', filters.tipo);
      }

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Transform data to include calculated fields
      const receitasComDados = (data || []).map((receita: any) => ({
        ...receita,
        total_ingredientes: receita.total_ingredientes?.[0]?.count || 0,
        total_embalagens: receita.total_embalagens?.[0]?.count || 0,
        total_sub_receitas: receita.total_sub_receitas?.[0]?.count || 0,
        custo_ingredientes: receita.ingredientes?.reduce((sum: number, i: any) => sum + (i.custo_total || 0), 0) || 0,
        custo_embalagens: receita.embalagens?.reduce((sum: number, e: any) => sum + (e.custo_total || 0), 0) || 0,
        custo_mao_obra: receita.mao_obra?.reduce((sum: number, m: any) => sum + (m.valor_total || 0), 0) || 0,
        custo_sub_receitas: receita.sub_receitas?.reduce((sum: number, s: any) => sum + (s.custo_total || 0), 0) || 0,
      }));

      return receitasComDados;
    } catch (error: any) {
      console.error('Erro ao buscar receitas:', error);
      toast.error('Erro ao carregar receitas');
      return [];
    } finally {
      setLoading(false);
    }
  };

  const fetchReceitaCompleta = async (id: string): Promise<ReceitaCompleta | null> => {
    if (!user) return null;

    setLoading(true);
    try {
      const { data: receita, error: receitaError } = await supabase
        .from('receitas')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

      if (receitaError) throw receitaError;

      const [ingredientes, embalagens, passos, subReceitas, maoObra] = await Promise.all([
        supabase.from('receita_ingredientes').select('*').eq('receita_id', id),
        supabase.from('receita_embalagens').select('*').eq('receita_id', id),
        supabase.from('receita_passos_preparo').select('*').eq('receita_id', id).order('ordem'),
        supabase.from('receita_sub_receitas').select('*').eq('receita_id', id),
        supabase.from('receita_mao_obra').select('*').eq('receita_id', id),
      ]);

      return {
        ...receita,
        ingredientes: ingredientes.data || [],
        embalagens: embalagens.data || [],
        passos: passos.data || [],
        sub_receitas: subReceitas.data || [],
        mao_obra: maoObra.data || [],
      } as ReceitaCompleta;
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

    setLoading(true);
    try {
      const numeroSequencial = await gerarNumeroSequencial();

      const { data: receita, error } = await supabase
        .from('receitas')
        .insert([{
          nome: data.nome || '',
          tipo_produto: data.tipo_produto || null,
          rendimento_valor: data.rendimento_valor || null,
          rendimento_unidade: data.rendimento_unidade || null,
          observacoes: data.observacoes || null,
          status: data.status || 'rascunho',
          preco_venda: data.preco_venda || 0,
          tempo_preparo_total: 0,
          tempo_preparo_mao_obra: 0,
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
      toast.error('Erro ao criar receita');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const updateReceita = async (id: string, data: Partial<Receita>) => {
    if (!user) return false;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('receitas')
        .update(data)
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
        supabase.from('receita_ingredientes').select('custo_total').eq('receita_id', receitaId),
        supabase.from('receita_embalagens').select('custo_total').eq('receita_id', receitaId),
        supabase.from('receita_mao_obra').select('valor_total').eq('receita_id', receitaId),
        supabase.from('receita_sub_receitas').select('custo_total').eq('receita_id', receitaId),
      ]);

      const total = 
        (ingredientes.data?.reduce((sum, i) => sum + (i.custo_total || 0), 0) || 0) +
        (embalagens.data?.reduce((sum, e) => sum + (e.custo_total || 0), 0) || 0) +
        (maoObra.data?.reduce((sum, m) => sum + (m.valor_total || 0), 0) || 0) +
        (subReceitas.data?.reduce((sum, s) => sum + (s.custo_total || 0), 0) || 0);

      return total;
    } catch (error: any) {
      console.error('Erro ao calcular custo total:', error);
      return 0;
    }
  };

  return {
    loading,
    gerarNumeroSequencial,
    fetchReceitas,
    fetchReceitaCompleta,
    createReceita,
    updateReceita,
    deleteReceita,
    uploadImagemReceita,
    deleteImagemReceita,
    calcularCustoTotal,
  };
}
