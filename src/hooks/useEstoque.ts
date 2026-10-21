import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { fetchCatalogoProdutos, filtrarProdutos, produtosKey, type ProdutoFilters } from '@/lib/produtosData';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { resizeImageToSquare } from '@/lib/imageUtils';
import { validateImageFile } from '@/lib/uploadValidation';
import type { Json } from '@/integrations/supabase/types';

export interface Produto {
  id: string;
  user_id: string;
  nome: string;
  codigo_interno: number;
  codigos_barras: string[];
  marcas: string[];
  categorias: string[];
  unidade_compra: string;
  custo_unitario: number;
  estoque_atual: number;
  estoque_minimo: number;
  unidade_uso: string | null;
  fator_conversao: number | null;
  imagem_url: string | null;
  rotulo_nutricional?: Json | null;
  rotulos_nutricionais?: Json | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export function useEstoque() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const gerarCodigoInterno = useCallback(async (): Promise<number> => {
    if (!user) return 1;

    const { data, error } = await supabase
      .rpc('gerar_proximo_codigo_interno', { p_user_id: user.id });

    if (error) {
      console.error('Erro ao gerar código interno:', error);
      return 1;
    }

    return (data as number) || 1;
  }, [user]);

  const fetchProdutos = useCallback(async (filters?: ProdutoFilters) => {
    if (!user?.id) return [];
    try {
      return filtrarProdutos(await fetchCatalogoProdutos(user.id), filters);
    } catch (error) {
      toast.error('Erro ao carregar produtos');
      console.error(error);
      return [];
    }
  }, [user?.id]);

  const createProduto = async (data: Partial<Produto>) => {
    if (!user) {
      toast.error('Usuário não autenticado');
      return null;
    }

    // Remove user_id do data se existir (será adicionado abaixo)
    const { user_id, ...produtoData } = data as any;

    const { data: produto, error } = await supabase
      .from('produtos')
      .insert({
        ...produtoData,
        user_id: user.id,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        toast.error('Código interno já existe. Tente outro.');
      } else {
        toast.error('Erro ao criar produto');
      }
      console.error(error);
      return null;
    }

    void queryClient.invalidateQueries({ queryKey: produtosKey(user.id), refetchType: 'none' });
    toast.success('Produto criado com sucesso');
    return produto;
  };

  const updateProduto = async (id: string, data: Partial<Produto>) => {
    if (!user) {
      toast.error('Usuário não autenticado');
      return null;
    }

    const { data: produto, error } = await supabase
      .from('produtos')
      .update(data)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        toast.error('Código interno já existe. Tente outro.');
      } else {
        toast.error('Erro ao atualizar produto');
      }
      console.error(error);
      return null;
    }

    void queryClient.invalidateQueries({ queryKey: produtosKey(user.id), refetchType: 'none' });
    toast.success('Produto atualizado com sucesso');
    return produto;
  };

  const deleteProduto = async (id: string) => {
    if (!user) {
      toast.error('Usuário não autenticado');
      return false;
    }

    const { error } = await supabase
      .from('produtos')
      .update({ ativo: false })
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      toast.error('Erro ao desativar produto');
      console.error(error);
      return false;
    }

    void queryClient.invalidateQueries({ queryKey: produtosKey(user.id), refetchType: 'none' });
    toast.success('Produto desativado com sucesso');
    return true;
  };

  const uploadImagemProduto = async (file: File, produtoId: string): Promise<string | null> => {
    if (!user) {
      toast.error('Usuário não autenticado');
      return null;
    }

    const validation = validateImageFile(file);
    if (!validation.ok) {
      toast.error(validation.error);
      return null;
    }


    try {
      console.log('📸 [UPLOAD] Iniciando compressão da imagem...');
      
      // Criar data URL do arquivo
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      // Comprimir imagem para 512x512, JPEG, qualidade 0.9
      const compressedDataUrl = await resizeImageToSquare(dataUrl, 512, 0.9);
      
      // Converter data URL para blob
      const response = await fetch(compressedDataUrl);
      const blob = await response.blob();
      
      const fileSizeKB = (blob.size / 1024).toFixed(2);
      console.log(`📸 [UPLOAD] Imagem comprimida: ${fileSizeKB} KB`);

      // Nome do arquivo: userId/produtoId.jpg
      const filePath = `${user.id}/${produtoId}.jpg`;

      // Upload para Storage
      const { error: uploadError } = await supabase.storage
        .from('produtos-fotos')
        .upload(filePath, blob, {
          contentType: 'image/jpeg',
          upsert: true, // Sobrescrever se já existir
        });

      if (uploadError) {
        console.error('❌ [UPLOAD] Erro:', uploadError);
        toast.error('Erro ao fazer upload da imagem');
        return null;
      }

      // Obter URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('produtos-fotos')
        .getPublicUrl(filePath);

      console.log('✅ [UPLOAD] Sucesso! URL:', publicUrl);
      return publicUrl;
    } catch (error) {
      console.error('❌ [UPLOAD] Erro ao processar imagem:', error);
      toast.error('Erro ao processar imagem');
      return null;
    }
  };

  const deleteImagemProduto = async (produtoId: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const filePath = `${user.id}/${produtoId}.jpg`;
      
      const { error } = await supabase.storage
        .from('produtos-fotos')
        .remove([filePath]);

      if (error) {
        console.error('Erro ao deletar imagem:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Erro ao deletar imagem:', error);
      return false;
    }
  };

  const fetchHistoricoProduto = async (produtoId: string) => {
    if (!user) return [];

    const { data, error } = await supabase
      .from('movimentacoes')
      .select('*, comprovantes(numero)')
      .eq('produto_id', produtoId)
      .eq('user_id', user.id)
      .order('data_hora', { ascending: false});

    if (error) {
      console.error(error);
      return [];
    }

    return data || [];
  };

  return {
    gerarCodigoInterno,
    fetchProdutos,
    createProduto,
    updateProduto,
    deleteProduto,
    fetchHistoricoProduto,
    uploadImagemProduto,
    deleteImagemProduto,
  };
}
