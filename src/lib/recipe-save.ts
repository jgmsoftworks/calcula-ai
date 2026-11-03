import type { Json } from '@/integrations/supabase/types';
import type { Receita, ReceitaCompleta } from '@/types/receitas';

export type RecipeSaveComponents = {
  ingredientes: { id: string; produto_id: string; quantidade: number }[];
  sub_receitas: { id: string; sub_receita_id: string; quantidade: number }[];
  embalagens: { id: string; produto_id: string; quantidade: number }[];
  passos: { id: string; ordem: number; descricao: string }[];
  mao_obra: { id: string; funcionario_id: string; funcionario_nome: string; funcionario_cargo: string;
    custo_por_hora: number; tempo: number; unidade_tempo: string; valor_total: number }[];
};

export type RecipeSavePayload = {
  p_receita_id: string;
  p_criar: boolean;
  p_expected_updated_at: string | null;
  p_expected_components: Json;
  p_receita: Json;
  p_componentes: Json;
};
export type RecipeSaveRequest = RecipeSavePayload & { p_request_id: string };
export type SavedRecipe = { id: string; numero_sequencial: number; updated_at: string };

// Whitelist writable fields; joined products and client-supplied owner/sequence never leave the form.
export function recipeSavePayload(id: string, creating: boolean, expectedUpdatedAt: string | null,
  recipe: Partial<Receita>, components: RecipeSaveComponents, original: ReceitaCompleta | null = null): RecipeSavePayload {
  const versions = (items: { id: string; updated_at?: string }[] = []) =>
    items.map(({ id, updated_at }) => ({ id, updated_at: updated_at ?? null }));
  return {
    p_receita_id: id,
    p_criar: creating,
    p_expected_updated_at: expectedUpdatedAt,
    p_expected_components: original ? {
      ingredientes: versions(original.ingredientes), sub_receitas: versions(original.sub_receitas),
      embalagens: versions(original.embalagens), passos: versions(original.passos), mao_obra: versions(original.mao_obra),
    } : null,
    p_receita: {
      nome: recipe.nome?.trim() || '', tipo_produto_id: recipe.tipo_produto_id || null,
      rendimento_valor: recipe.rendimento_valor ?? null, rendimento_unidade: recipe.rendimento_unidade || 'un',
      observacoes: recipe.observacoes ?? '', status: recipe.status || 'finalizada',
      preco_venda: recipe.preco_venda ?? 0, tempo_preparo_total: recipe.tempo_preparo_total ?? 0,
      tempo_preparo_unidade: recipe.tempo_preparo_unidade || 'minutos',
      tempo_preparo_mao_obra: recipe.tempo_preparo_mao_obra ?? 0,
      peso_unitario: recipe.peso_unitario ?? null, conservacao: recipe.conservacao ?? null,
      markup_id: recipe.markup_id || null,
    },
    p_componentes: {
      ingredientes: components.ingredientes.map(({id,produto_id,quantidade})=>({id,produto_id,quantidade})),
      sub_receitas: components.sub_receitas.map(({id,sub_receita_id,quantidade})=>({id,sub_receita_id,quantidade})),
      embalagens: components.embalagens.map(({id,produto_id,quantidade})=>({id,produto_id,quantidade})),
      passos: components.passos.map(({id,ordem,descricao})=>({id,ordem,descricao})),
      mao_obra: components.mao_obra.map(({id,funcionario_id,funcionario_nome,funcionario_cargo,custo_por_hora,tempo,unidade_tempo,valor_total})=>
        ({id,funcionario_id,funcionario_nome,funcionario_cargo,custo_por_hora,tempo,unidade_tempo,valor_total})),
    },
  };
}

export function savedRecipeResponse(value: Json, expectedId: string): SavedRecipe {
  if (!value || typeof value !== 'object' || Array.isArray(value) || value.id !== expectedId ||
      typeof value.numero_sequencial !== 'number' || typeof value.updated_at !== 'string') {
    throw new Error('Confirmação de salvamento indisponível.');
  }
  return value as SavedRecipe;
}

export function recipeSaveError(error: unknown): string {
  if (error && typeof error === 'object' && 'code' in error && error.code === '40001') {
    return 'Esta receita mudou desde que você abriu o editor. Suas alterações continuam aqui. Confira a versão salva antes de tentar novamente.';
  }
  return 'Não foi possível confirmar o salvamento completo. Suas alterações continuam aqui. Tente novamente.';
}
