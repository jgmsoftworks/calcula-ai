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
    subReceita?: string;
  }) => {
    if (!user) return [];
    
    setLoading(true);
    try {
      let query = supabase
        .from('receitas')
        .select(`
          *,
          tipo_produto:tipos_produto(id, nome),
          markup:markups(id, nome, tipo),
          total_ingredientes:receita_ingredientes(count),
          total_embalagens:receita_embalagens(count),
          total_sub_receitas:receita_sub_receitas!receita_sub_receitas_receita_id_fkey(count),
          ingredientes:receita_ingredientes(
            quantidade,
            produto:produtos(custo_unitario, unidade_uso, fator_conversao, unidade_compra)
          ),
          embalagens:receita_embalagens(
            quantidade,
            produto:produtos(custo_unitario, unidade_uso, fator_conversao, unidade_compra)
          ),
          mao_obra:receita_mao_obra(valor_total),
          sub_receitas:receita_sub_receitas!receita_sub_receitas_receita_id_fkey(
            quantidade,
            sub_receita:receitas!receita_sub_receitas_sub_receita_id_fkey(preco_venda, rendimento_valor)
          )
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

      let receitasFiltradas = data || [];

      // Filtro de sub-receitas (feito em memória porque precisa verificar o tipo do markup)
      if (filters?.subReceita === 'subreceita') {
        receitasFiltradas = receitasFiltradas.filter((r: any) => r.markup?.tipo === 'sub_receita');
      } else if (filters?.subReceita === 'normal') {
        receitasFiltradas = receitasFiltradas.filter((r: any) => r.markup?.tipo !== 'sub_receita');
      }

      // Transform data to include calculated fields
      const receitasComDados = receitasFiltradas.map((receita: any) => {
        // Calcular custo de ingredientes dinamicamente
        const custoIngredientes = receita.ingredientes?.reduce((sum: number, i: any) => {
          if (!i.produto) return sum;
          const unidade = i.produto.unidade_uso || i.produto.unidade_compra;
          const custoUnitario = i.produto.unidade_uso 
            ? i.produto.custo_unitario / (i.produto.fator_conversao || 1)
            : i.produto.custo_unitario;
          return sum + (custoUnitario * i.quantidade);
        }, 0) || 0;

        // Calcular custo de embalagens dinamicamente
        const custoEmbalagens = receita.embalagens?.reduce((sum: number, e: any) => {
          if (!e.produto) return sum;
          const unidade = e.produto.unidade_uso || e.produto.unidade_compra;
          const custoUnitario = e.produto.unidade_uso 
            ? e.produto.custo_unitario / (e.produto.fator_conversao || 1)
            : e.produto.custo_unitario;
          return sum + (custoUnitario * e.quantidade);
        }, 0) || 0;

        // Calcular custo de sub-receitas dinamicamente
        const custoSubReceitas = receita.sub_receitas?.reduce((sum: number, s: any) => {
          if (!s.sub_receita) return sum;
          const custoUnitario = s.sub_receita.rendimento_valor && s.sub_receita.rendimento_valor > 0
            ? s.sub_receita.preco_venda / s.sub_receita.rendimento_valor
            : s.sub_receita.preco_venda;
          return sum + (custoUnitario * s.quantidade);
        }, 0) || 0;

        return {
          ...receita,
          total_ingredientes: receita.total_ingredientes?.[0]?.count || 0,
          total_embalagens: receita.total_embalagens?.[0]?.count || 0,
          total_sub_receitas: receita.total_sub_receitas?.[0]?.count || 0,
          custo_ingredientes: custoIngredientes,
          custo_embalagens: custoEmbalagens,
          custo_mao_obra: receita.mao_obra?.reduce((sum: number, m: any) => sum + (m.valor_total || 0), 0) || 0,
          custo_sub_receitas: custoSubReceitas,
        };
      });

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
        .select(`
          *,
          tipo_produto:tipos_produto(id, nome)
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
            rendimento_unidade
          )
        `).eq('receita_id', id),
        supabase.from('receita_mao_obra').select('*').eq('receita_id', id),
      ]);

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
          status: data.status || 'rascunho',
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
      // Remover campos que são JOINs e não devem ser atualizados
      const { tipo_produto, ...updateData } = data;
      
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
