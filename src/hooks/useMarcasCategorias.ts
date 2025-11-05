import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Marca {
  id: string;
  nome: string;
  ativo: boolean;
}

export interface Categoria {
  id: string;
  nome: string;
  ativo: boolean;
}

export function useMarcasCategorias() {
  const { user } = useAuth();

  // ============ MARCAS ============
  const fetchMarcas = async () => {
    if (!user) return [];

    const { data, error } = await supabase
      .from('marcas')
      .select('*')
      .eq('user_id', user.id)
      .eq('ativo', true)
      .order('nome');

    if (error) {
      console.error(error);
      return [];
    }

    return data || [];
  };

  const createMarca = async (nome: string) => {
    if (!user) {
      toast.error('Usuário não autenticado');
      return null;
    }

    const { data, error } = await supabase
      .from('marcas')
      .insert({
        user_id: user.id,
        nome: nome.trim(),
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        toast.error('Marca já existe');
      } else {
        toast.error('Erro ao criar marca');
      }
      console.error(error);
      return null;
    }

    toast.success('Marca criada com sucesso');
    return data;
  };

  const updateMarca = async (id: string, nome: string) => {
    if (!user) {
      toast.error('Usuário não autenticado');
      return null;
    }

    const { data, error } = await supabase
      .from('marcas')
      .update({ nome: nome.trim() })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        toast.error('Marca já existe');
      } else {
        toast.error('Erro ao atualizar marca');
      }
      console.error(error);
      return null;
    }

    toast.success('Marca atualizada com sucesso');
    return data;
  };

  const deleteMarca = async (id: string) => {
    if (!user) {
      toast.error('Usuário não autenticado');
      return false;
    }

    // Verificar se há produtos usando esta marca
    const { data: produtos } = await supabase
      .from('produtos')
      .select('id')
      .contains('marcas', [id])
      .eq('user_id', user.id)
      .limit(1);

    if (produtos && produtos.length > 0) {
      toast.error('Não é possível remover marca em uso');
      return false;
    }

    const { error } = await supabase
      .from('marcas')
      .update({ ativo: false })
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      toast.error('Erro ao remover marca');
      console.error(error);
      return false;
    }

    toast.success('Marca removida com sucesso');
    return true;
  };

  // ============ CATEGORIAS ============
  const fetchCategorias = async () => {
    if (!user) return [];

    const { data, error } = await supabase
      .from('categorias')
      .select('*')
      .eq('user_id', user.id)
      .eq('ativo', true)
      .order('nome');

    if (error) {
      console.error(error);
      return [];
    }

    return data || [];
  };

  const createCategoria = async (nome: string) => {
    if (!user) {
      toast.error('Usuário não autenticado');
      return null;
    }

    const { data, error } = await supabase
      .from('categorias')
      .insert({
        user_id: user.id,
        nome: nome.trim(),
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        toast.error('Categoria já existe');
      } else {
        toast.error('Erro ao criar categoria');
      }
      console.error(error);
      return null;
    }

    toast.success('Categoria criada com sucesso');
    return data;
  };

  const updateCategoria = async (id: string, nome: string) => {
    if (!user) {
      toast.error('Usuário não autenticado');
      return null;
    }

    const { data, error } = await supabase
      .from('categorias')
      .update({ nome: nome.trim() })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        toast.error('Categoria já existe');
      } else {
        toast.error('Erro ao atualizar categoria');
      }
      console.error(error);
      return null;
    }

    toast.success('Categoria atualizada com sucesso');
    return data;
  };

  const deleteCategoria = async (id: string) => {
    if (!user) {
      toast.error('Usuário não autenticado');
      return false;
    }

    // Verificar se há produtos usando esta categoria
    const { data: produtos } = await supabase
      .from('produtos')
      .select('id')
      .contains('categorias', [id])
      .eq('user_id', user.id)
      .limit(1);

    if (produtos && produtos.length > 0) {
      toast.error('Não é possível remover categoria em uso');
      return false;
    }

    const { error } = await supabase
      .from('categorias')
      .update({ ativo: false })
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      toast.error('Erro ao remover categoria');
      console.error(error);
      return false;
    }

    toast.success('Categoria removida com sucesso');
    return true;
  };

  return {
    // Marcas
    fetchMarcas,
    createMarca,
    updateMarca,
    deleteMarca,
    // Categorias
    fetchCategorias,
    createCategoria,
    updateCategoria,
    deleteCategoria,
  };
}
