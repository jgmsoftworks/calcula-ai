export interface Receita {
  id: string;
  user_id: string;
  numero_sequencial: number;
  nome: string;
  tipo_produto: string | null;
  rendimento_valor: number | null;
  rendimento_unidade: string | null;
  tempo_preparo_total: number;
  tempo_preparo_mao_obra: number;
  conservacao: any;
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
  id: string;
  receita_id: string;
  produto_id: string;
  quantidade: number;
  produto?: {
    id: string;
    nome: string;
    marcas: string[] | null;
    custo_unitario: number;
    unidade_compra: string;
    unidade_uso: string | null;
    fator_conversao: number | null;
  };
}

export interface ReceitaEmbalagem {
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
  id: string;
  receita_id: string;
  ordem: number;
  descricao: string;
  imagem_url: string | null;
}

export interface ReceitaSubReceita {
  id: string;
  receita_id: string;
  sub_receita_id: string;
  quantidade: number;
  sub_receita?: {
    id: string;
    nome: string;
    preco_venda: number;
    rendimento_unidade: string | null;
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
  markup?: any;
}

export interface ReceitaComDados extends Receita {
  total_ingredientes?: number;
  total_embalagens?: number;
  total_sub_receitas?: number;
  custo_ingredientes?: number;
  custo_embalagens?: number;
  custo_mao_obra?: number;
  custo_sub_receitas?: number;
}