import { CatalogoEstoqueModal } from './CatalogoEstoqueModal';

export function CategoriasModal(props: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return <CatalogoEstoqueModal tabela="categorias" {...props} />;
}
