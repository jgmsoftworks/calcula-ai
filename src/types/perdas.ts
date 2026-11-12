export interface Perda {
  id: string;
  user_id: string;
  tipo: 'produto' | 'receita';
  produto_id: string | null;
  receita_id: string | null;
  nome_item: string;
  quantidade: number;
  custo_unitario: number;
  custo_total: number;
  motivo: string;
  motivo_outro: string | null;
  observacao: string | null;
  responsavel: string | null;
  data_perda: string;
  created_at: string;
  updated_at: string;
  origem_estoque?: string | null;
  unidade?: string | null;
  geladeira_item_id?: string | null;
}

