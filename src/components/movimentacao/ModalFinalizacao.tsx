import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { Printer, Save } from 'lucide-react';

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
  const [funcionarioId, setFuncionarioId] = useState<string>();
  const [motivo, setMotivo] = useState('');
  const [motivoOutro, setMotivoOutro] = useState('');
  const [observacao, setObservacao] = useState('');

  useEffect(() => {
    if (open) {
      setFuncionarioId(undefined);
      setMotivo('');
      setMotivoOutro('');
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
      data_movimentacao: new Date(),
      observacao: observacao || undefined,
      imprimir,
    });
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <DialogContent className="sm:max-w-[500px]" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Finalizar Movimentação</DialogTitle>
        </DialogHeader>

        <div className="space-y-2 py-2">
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

          <div className="space-y-1">
            <Label>Motivo da Movimentação *</Label>
            <RadioGroup value={motivo} onValueChange={setMotivo}>
              {MOTIVOS.map((m) => (
                <div key={m} className="flex items-center space-x-2">
                  <RadioGroupItem value={m} id={m} />
                  <Label htmlFor={m} className="cursor-pointer">{m}</Label>
                </div>
              ))}
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="Outro" id="outro" />
                <Label htmlFor="outro" className="cursor-pointer">Outro</Label>
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
            <Label>Data e Hora</Label>
            <Input
              type="text"
              value={format(new Date(), "dd/MM/yyyy HH:mm")}
              readOnly
              className="bg-muted"
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

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="outline" onClick={() => handleConfirm(false)}>
            Somente Salvar
          </Button>
          <Button onClick={() => handleConfirm(true)}>
            Emitir Comanda e Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
