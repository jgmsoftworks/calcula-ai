import type { Tables } from '@/integrations/supabase/types';

export type ConservacaoReceita = Partial<Record<'congelado' | 'refrigerado' | 'ambiente', {
  temperatura: number; tempo: number; unidade: string;
}>>;
export type ProdutoReceita = Pick<Tables<'produtos'>, 'id' | 'nome' | 'custo_unitario' | 'unidade_compra' | 'unidade_uso' | 'fator_conversao'>
  & Partial<Pick<Tables<'produtos'>, 'marcas' | 'codigo_interno' | 'imagem_url'>>;
export type SubReceitaSelecionavel = Pick<Tables<'receitas'>, 'id' | 'nome' | 'preco_venda' | 'rendimento_valor' | 'rendimento_unidade'>
  & Partial<Pick<Tables<'receitas'>, 'numero_sequencial' | 'imagem_url'>>;

export interface Receita {
  id: string;
  user_id: string;
  numero_sequencial: number;
  nome: string;
  tipo_produto?: { id: string; nome: string } | null;
  tipo_produto_id?: string | null;
  rendimento_valor: number | null;
  rendimento_unidade: string | null;
  tempo_preparo_total: number;
  tempo_preparo_unidade?: string | null;
  tempo_preparo_mao_obra: number;
  conservacao: ConservacaoReceita | null;
  observacoes: string | null;
  imagem_url: string | null;
  markup_id: string | null;
  preco_venda: number;
  status: 'rascunho' | 'finalizada';
  peso_unitario: number | null;
  created_at: string;
  updated_at: string;
}

export interface ReceitaIngrediente {
  updated_at?: string;
  id: string;
  receita_id: string;
  produto_id: string;
  quantidade: number;
  produto?: {
    id: string;
    nome: string;
    marcas?: string[] | null;
    custo_unitario: number;
    unidade_compra: string;
    unidade_uso: string | null;
    fator_conversao: number | null;
  };
}

export interface ReceitaEmbalagem {
  updated_at?: string;
  id: string;
  receita_id: string;
  produto_id: string;
  quantidade: number;
  produto?: {
    id: string;
    nome: string;
    custo_unitario: number;
    unidade_compra: string;
    unidade_uso: string | null;
    fator_conversao: number | null;
  };
}

export interface ReceitaPasso {
  updated_at?: string;
  id: string;
  receita_id: string;
  ordem: number;
  descricao: string;
  imagem_url: string | null;
}

export interface ReceitaSubReceita {
  updated_at?: string;
  id: string;
  receita_id: string;
  sub_receita_id: string;
  quantidade: number;
  sub_receita?: {
    id: string;
    nome: string;
    preco_venda: number;
    rendimento_unidade: string | null;
    rendimento_valor: number | null;
  };
}

export interface ReceitaMaoObra {
  id: string;
  receita_id: string;
  funcionario_id: string;
  funcionario_nome: string;
  funcionario_cargo: string;
  tempo: number;
  unidade_tempo: string;
  custo_por_hora: number;
  valor_total: number;
  created_at: string;
  updated_at: string;
}

export interface ReceitaCompleta extends Receita {
  ingredientes: ReceitaIngrediente[];
  embalagens: ReceitaEmbalagem[];
  passos: ReceitaPasso[];
  sub_receitas: ReceitaSubReceita[];
  mao_obra: ReceitaMaoObra[];
  markup?: Pick<Tables<'markups'>, 'id' | 'nome' | 'tipo'> | null;
}

export interface ReceitaComDados extends Receita {
  total_ingredientes?: number;
  total_embalagens?: number;
  total_sub_receitas?: number;
  custo_ingredientes?: number;
  custo_embalagens?: number;
  custo_mao_obra?: number;
  custo_sub_receitas?: number;
  markup?: {
    id: string;
    nome: string;
    tipo: string;
  };
}

export type ReceitaFormData = Pick<Receita, 'nome' | 'tipo_produto_id' | 'rendimento_valor' | 'rendimento_unidade' |
  'observacoes' | 'status' | 'preco_venda' | 'markup_id' | 'peso_unitario' | 'tempo_preparo_total' |
  'tempo_preparo_unidade' | 'tempo_preparo_mao_obra' | 'conservacao'> & { markup_tipo: string | null };
export type AlterarReceitaForm = <K extends keyof ReceitaFormData>(field: K, value: ReceitaFormData[K]) => void;
export type ComponentesEmEdicao = {
  ingredientes: Omit<ReceitaIngrediente, 'receita_id'>[];
  embalagens: Omit<ReceitaEmbalagem, 'receita_id'>[];
  sub_receitas: Omit<ReceitaSubReceita, 'receita_id'>[];
  mao_obra: Omit<ReceitaMaoObra, 'receita_id' | 'created_at' | 'updated_at'>[];
};
export type ReceitaEmEdicao = Partial<Omit<ReceitaCompleta, keyof ComponentesEmEdicao>> & Partial<ComponentesEmEdicao>;
