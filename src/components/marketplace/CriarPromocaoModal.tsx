import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NumericInputPtBr } from '@/components/ui/numeric-input-ptbr';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { CalendarIcon, Percent } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { z } from 'zod';

const promocaoSchema = z.object({
  titulo: z.string().trim().min(3, 'Título deve ter no mínimo 3 caracteres').max(100, 'Título muito longo'),
  descricao: z.string().trim().max(500, 'Descrição muito longa').optional(),
  desconto_percentual: z.number().min(1, 'Desconto deve ser maior que 0').max(100, 'Desconto não pode ser maior que 100%').optional(),
  desconto_fixo: z.number().min(0.01, 'Desconto deve ser maior que 0').optional(),
  data_inicio: z.date(),
  data_fim: z.date(),
  max_uso: z.number().min(1, 'Mínimo 1 uso').optional(),
  codigo_promocional: z.string().trim().max(20, 'Código muito longo').optional(),
}).refine(data => data.desconto_percentual || data.desconto_fixo, {
  message: 'Defina um desconto percentual ou fixo',
  path: ['desconto_percentual'],
}).refine(data => data.data_fim > data.data_inicio, {
  message: 'Data final deve ser posterior à data inicial',
  path: ['data_fim'],
});

interface CriarPromocaoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fornecedorId: string;
  onSuccess?: () => void;
}

export default function CriarPromocaoModal({ 
  open, 
  onOpenChange, 
  fornecedorId,
  onSuccess 
}: CriarPromocaoModalProps) {
  const [loading, setLoading] = useState(false);
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [tipoDesconto, setTipoDesconto] = useState<'percentual' | 'fixo'>('percentual');
  const [descontoPercentual, setDescontoPercentual] = useState<number>(10);
  const [descontoFixo, setDescontoFixo] = useState<number>(0);
  const [dataInicio, setDataInicio] = useState<Date>(new Date());
  const [dataFim, setDataFim] = useState<Date>();
  const [maxUso, setMaxUso] = useState<number | undefined>();
  const [codigoPromocional, setCodigoPromocional] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const data = {
        titulo,
        descricao: descricao || undefined,
        desconto_percentual: tipoDesconto === 'percentual' ? descontoPercentual : undefined,
        desconto_fixo: tipoDesconto === 'fixo' ? descontoFixo : undefined,
        data_inicio: dataInicio,
        data_fim: dataFim!,
        max_uso: maxUso,
        codigo_promocional: codigoPromocional || undefined,
      };

      const validated = promocaoSchema.parse(data);
      
      setLoading(true);

      const { error } = await supabase
        .from('promocoes_fornecedores')
        .insert({
          fornecedor_id: fornecedorId,
          titulo: validated.titulo,
          descricao: validated.descricao,
          desconto_percentual: validated.desconto_percentual,
          desconto_fixo: validated.desconto_fixo,
          data_inicio: validated.data_inicio.toISOString(),
          data_fim: validated.data_fim.toISOString(),
          max_uso: validated.max_uso,
          codigo_promocional: validated.codigo_promocional,
          ativa: true,
        });

      if (error) throw error;

      toast.success('Promoção criada com sucesso!');
      onOpenChange(false);
      onSuccess?.();
      
      // Reset form
      setTitulo('');
      setDescricao('');
      setDescontoPercentual(10);
      setDescontoFixo(0);
      setDataInicio(new Date());
      setDataFim(undefined);
      setMaxUso(undefined);
      setCodigoPromocional('');
      
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        console.error('Erro ao criar promoção:', error);
        toast.error('Erro ao criar promoção');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Criar Nova Promoção</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="titulo">Título da Promoção *</Label>
            <Input
              id="titulo"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ex: Desconto especial para novos clientes"
              maxLength={100}
              required
            />
          </div>

          <div>
            <Label htmlFor="descricao">Descrição</Label>
            <Textarea
              id="descricao"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Detalhes da promoção..."
              maxLength={500}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Tipo de Desconto *</Label>
              <div className="flex gap-2 mt-2">
                <Button
                  type="button"
                  variant={tipoDesconto === 'percentual' ? 'default' : 'outline'}
                  onClick={() => setTipoDesconto('percentual')}
                  className="flex-1"
                >
                  <Percent className="h-4 w-4 mr-1" />
                  Percentual
                </Button>
                <Button
                  type="button"
                  variant={tipoDesconto === 'fixo' ? 'default' : 'outline'}
                  onClick={() => setTipoDesconto('fixo')}
                  className="flex-1"
                >
                  R$ Fixo
                </Button>
              </div>
            </div>

            <div>
              <Label htmlFor="desconto">Valor do Desconto *</Label>
              <NumericInputPtBr
                tipo={tipoDesconto === 'percentual' ? 'percentual' : 'valor'}
                min={0}
                max={tipoDesconto === 'percentual' ? 100 : undefined}
                value={tipoDesconto === 'percentual' ? descontoPercentual : descontoFixo}
                onChange={(valor) => {
                  if (tipoDesconto === 'percentual') {
                    setDescontoPercentual(valor);
                  } else {
                    setDescontoFixo(valor);
                  }
                }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Data de Início *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !dataInicio && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dataInicio ? format(dataInicio, 'dd/MM/yyyy') : 'Selecione'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dataInicio}
                    onSelect={(date) => date && setDataInicio(date)}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <Label>Data de Fim *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !dataFim && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dataFim ? format(dataFim, 'dd/MM/yyyy') : 'Selecione'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dataFim}
                    onSelect={setDataFim}
                    disabled={(date) => date < dataInicio}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="maxUso">Limite de Usos (opcional)</Label>
              <NumericInputPtBr
                tipo="quantidade_un"
                min={1}
                value={maxUso || 0}
                onChange={(valor) => setMaxUso(valor > 0 ? valor : undefined)}
                placeholder="Ilimitado"
              />
            </div>

            <div>
              <Label htmlFor="codigo">Código Promocional (opcional)</Label>
              <Input
                id="codigo"
                value={codigoPromocional}
                onChange={(e) => setCodigoPromocional(e.target.value.toUpperCase())}
                placeholder="Ex: PROMO2025"
                maxLength={20}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || !dataFim}>
              {loading ? 'Criando...' : 'Criar Promoção'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
