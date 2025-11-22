import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';

interface ExportMarkupModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (markupId: string | null, markupNome: string | null) => void;
  markups: Array<{ id: string; nome: string }>;
  loading?: boolean;
}

export function ExportMarkupModal({ open, onClose, onConfirm, markups, loading }: ExportMarkupModalProps) {
  const [selectedMarkup, setSelectedMarkup] = useState<string>('sem-markup');

  const handleConfirm = () => {
    if (selectedMarkup === 'sem-markup') {
      onConfirm(null, null);
    } else {
      const markup = markups.find(m => m.id === selectedMarkup);
      if (markup) {
        onConfirm(markup.id, markup.nome);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Exportar Receitas para Excel</DialogTitle>
          <DialogDescription>
            Selecione um bloco de markup para simular preços e lucros na exportação.
            Esta simulação não afetará os valores cadastrados no sistema.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <RadioGroup value={selectedMarkup} onValueChange={setSelectedMarkup}>
            <div className="flex items-center space-x-2 mb-3">
              <RadioGroupItem value="sem-markup" id="sem-markup" />
              <Label htmlFor="sem-markup" className="cursor-pointer">
                Sem markup (apenas custos diretos)
              </Label>
            </div>
            
            {markups.length === 0 ? (
              <p className="text-sm text-muted-foreground ml-6">
                Nenhum bloco de markup cadastrado
              </p>
            ) : (
              markups.map((markup) => (
                <div key={markup.id} className="flex items-center space-x-2 mb-3">
                  <RadioGroupItem value={markup.id} id={markup.id} />
                  <Label htmlFor={markup.id} className="cursor-pointer">
                    {markup.nome}
                  </Label>
                </div>
              ))
            )}
          </RadioGroup>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Exportando...
              </>
            ) : (
              'Exportar'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
