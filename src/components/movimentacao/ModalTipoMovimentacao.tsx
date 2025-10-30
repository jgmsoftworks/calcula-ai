import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ArrowDown, ArrowUp } from 'lucide-react';

interface ModalTipoMovimentacaoProps {
  open: boolean;
  nomeProduto: string;
  onSelectTipo: (tipo: 'entrada' | 'saida') => void;
  onClose: () => void;
}

export function ModalTipoMovimentacao({
  open,
  nomeProduto,
  onSelectTipo,
  onClose,
}: ModalTipoMovimentacaoProps) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <DialogContent className="sm:max-w-[400px]" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="text-center">Movimentação: {nomeProduto}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 py-6">
          <Button
            variant="outline"
            className="h-32 flex flex-col gap-3"
            onClick={() => onSelectTipo('entrada')}
          >
            <ArrowDown className="h-12 w-12 text-green-600" />
            <span className="text-lg font-bold">ENTRADA</span>
          </Button>

          <Button
            variant="outline"
            className="h-32 flex flex-col gap-3"
            onClick={() => onSelectTipo('saida')}
          >
            <ArrowUp className="h-12 w-12 text-red-600" />
            <span className="text-lg font-bold">SAÍDA</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
