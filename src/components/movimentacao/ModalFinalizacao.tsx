import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { Printer, Save } from 'lucide-react';
import { format } from 'date-fns';

interface Funcionario {
  id: string;
  nome: string;
}

const MOTIVOS = [
  'Compra/Reposição',
  'Venda',
  'Consumo interno',
  'Ajuste',
  'Perda/Quebra',
  'Devolução',
  'Produção',
];

interface ModalFinalizacaoProps {
  open: boolean;
  funcionarios: Funcionario[];
  tipoMovimentacao: 'entrada' | 'saida';
  totalItens: number;
  onConfirm: (data: {
    funcionario_id: string;
    funcionario_nome: string;
    motivo: string;
    data_movimentacao: Date;
    observacao?: string;
    imprimir: boolean;
  }) => void;
  onClose: () => void;
}

export function ModalFinalizacao({
  open,
  funcionarios,
  tipoMovimentacao,
  totalItens,
  onConfirm,
  onClose,
}: ModalFinalizacaoProps) {
  const { toast } = useToast();
  const [funcionarioId, setFuncionarioId] = useState('');
  const [motivo, setMotivo] = useState('');
  const [motivoOutro, setMotivoOutro] = useState('');
  const [dataMovimentacao, setDataMovimentacao] = useState(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
  const [observacao, setObservacao] = useState('');

  useEffect(() => {
    if (open) {
      setFuncionarioId('');
      setMotivo('');
      setMotivoOutro('');
      setDataMovimentacao(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
      setObservacao('');
    }
  }, [open]);

  const handleConfirm = (imprimir: boolean) => {
    if (!funcionarioId) {
      toast({
        title: 'Funcionário obrigatório',
        description: 'Selecione quem realizou a movimentação',
        variant: 'destructive',
      });
      return;
    }

    if (!motivo) {
      toast({
        title: 'Motivo obrigatório',
        description: 'Selecione o motivo da movimentação',
        variant: 'destructive',
      });
      return;
    }

    if (motivo === 'Outro' && !motivoOutro.trim()) {
      toast({
        title: 'Especifique o motivo',
        description: 'Preencha o campo "Outro motivo"',
        variant: 'destructive',
      });
      return;
    }

    const funcionario = funcionarios.find((f) => f.id === funcionarioId);
    if (!funcionario) return;

    onConfirm({
      funcionario_id: funcionarioId,
      funcionario_nome: funcionario.nome,
      motivo: motivo === 'Outro' ? motivoOutro : motivo,
      data_movimentacao: new Date(dataMovimentacao),
      observacao: observacao || undefined,
      imprimir,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Finalizar Movimentação</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Quem realizou? *</Label>
            <Select value={funcionarioId} onValueChange={setFuncionarioId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o funcionário..." />
              </SelectTrigger>
              <SelectContent>
                {funcionarios.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="p-3 bg-muted rounded-lg">
            <p className="text-sm font-medium">Tipo de Movimentação</p>
            <p className="text-sm text-muted-foreground">
              • {totalItens} {totalItens === 1 ? 'item' : 'itens'} de{' '}
              {tipoMovimentacao === 'entrada' ? 'Entrada' : 'Saída'}
            </p>
          </div>

          <div className="space-y-2">
            <Label>Motivo *</Label>
            <RadioGroup value={motivo} onValueChange={setMotivo}>
              <div className="space-y-2">
                {MOTIVOS.map((m) => (
                  <div key={m} className="flex items-center space-x-2">
                    <RadioGroupItem value={m} id={`motivo-${m}`} />
                    <Label htmlFor={`motivo-${m}`} className="font-normal cursor-pointer">
                      {m}
                    </Label>
                  </div>
                ))}
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Outro" id="motivo-outro" />
                  <Label htmlFor="motivo-outro" className="font-normal cursor-pointer">
                    Outro
                  </Label>
                </div>
              </div>
            </RadioGroup>

            {motivo === 'Outro' && (
              <Input
                value={motivoOutro}
                onChange={(e) => setMotivoOutro(e.target.value)}
                placeholder="Especifique o motivo..."
                className="mt-2"
              />
            )}
          </div>

          <div className="space-y-2">
            <Label>Data/Hora</Label>
            <Input
              type="datetime-local"
              value={dataMovimentacao}
              onChange={(e) => setDataMovimentacao(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Observação geral</Label>
            <Textarea
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              placeholder="Observações gerais sobre esta movimentação..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">
            Cancelar
          </Button>
          <Button
            variant="outline"
            onClick={() => handleConfirm(false)}
            className="w-full sm:w-auto"
          >
            <Save className="h-4 w-4 mr-2" />
            Somente Salvar
          </Button>
          <Button onClick={() => handleConfirm(true)} className="w-full sm:w-auto">
            <Printer className="h-4 w-4 mr-2" />
            Emitir Comanda e Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
