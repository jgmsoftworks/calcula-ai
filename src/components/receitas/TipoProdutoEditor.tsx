import { CatalogoFotoEditor } from '@/components/catalogo/CatalogoFotoEditor';
import type { TipoProduto } from '@/lib/tiposProdutoData';

export function TipoProdutoEditor({ tipo, ...props }: {
  tipo?: TipoProduto;
  saving: boolean;
  onSave: (input: Pick<TipoProduto, 'nome' | 'imagem_url'>) => void;
  onCancel: () => void;
}) {
  return <CatalogoFotoEditor item={tipo} {...props} labels={{ name: tipo ? 'Nome do tipo' : 'Novo Tipo de Produto', photo: 'Foto do tipo de produto', preview: 'Foto do tipo', save: tipo ? 'Salvar tipo de produto' : 'Criar tipo de produto', action: tipo ? 'Salvar alterações' : 'Criar tipo', placeholder: 'Ex.: Bolos no pote' }} />;
}
