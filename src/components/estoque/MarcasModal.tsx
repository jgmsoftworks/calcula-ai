import { CatalogoEstoqueModal } from './CatalogoEstoqueModal';

export function MarcasModal(props: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return <CatalogoEstoqueModal tabela="marcas" {...props} />;
}
