import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Package, Cake } from 'lucide-react';

interface ModalOrigemSelecaoProps {
  open: boolean;
  onSelect: (origem: 'estoque' | 'vitrine') => void;
}

export function ModalOrigemSelecao({ open, onSelect }: ModalOrigemSelecaoProps) {
  return (
    <Dialog open={open} modal>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl">O que você quer movimentar?</DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-2 gap-6 py-6">
          <Card
            className="flex flex-col items-center justify-center p-8 cursor-pointer hover:bg-accent transition-colors border-2"
            onClick={() => onSelect('estoque')}
          >
            <Package className="w-16 h-16 mb-4 text-primary" />
            <h3 className="text-xl font-bold mb-2">ESTOQUE</h3>
            <p className="text-sm text-center text-muted-foreground">
              Matéria-prima e insumos
            </p>
          </Card>

          <Card
            className="flex flex-col items-center justify-center p-8 cursor-pointer hover:bg-accent transition-colors border-2"
            onClick={() => onSelect('vitrine')}
          >
            <Cake className="w-16 h-16 mb-4 text-primary" />
            <h3 className="text-xl font-bold mb-2">VITRINE</h3>
            <p className="text-sm text-center text-muted-foreground">
              Produtos finalizados e receitas
            </p>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
