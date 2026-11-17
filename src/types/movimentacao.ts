import type { Produto } from '@/hooks/useEstoque';
import type { ItemCarrinho } from '@/hooks/useMovimentacoes';

export type ProdutoMovimentacao = Produto & {
  origem_estoque?: 'produto' | 'geladeira';
  custo_indisponivel?: boolean;
  tipo_produto_nome?: string | null;
};

export interface ItemCarrinhoVisual extends ItemCarrinho {
  imagem_url?: string | null;
  unidade_compra?: string;
}
