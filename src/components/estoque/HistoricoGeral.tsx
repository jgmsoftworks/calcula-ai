// Fixed: All SelectItem values are non-empty - verified 2025-01-05
import { useState, useEffect } from 'react';
import { Calendar, FileText, SlidersHorizontal } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { useMovimentacoes } from '@/hooks/useMovimentacoes';
import { formatters } from '@/lib/formatters';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function HistoricoGeral() {
  const { fetchHistoricoGeral } = useMovimentacoes();
  const [movimentacoes, setMovimentacoes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [tipoFiltro, setTipoFiltro] = useState<string>('todos');
  const [responsavelFiltro, setResponsavelFiltro] = useState('');

  const loadHistorico = async () => {
    setLoading(true);
    const data = await fetchHistoricoGeral({
      dataInicio: dataInicio || undefined,
      dataFim: dataFim || undefined,
      tipo: tipoFiltro !== 'todos' ? (tipoFiltro as 'entrada' | 'saida') : undefined,
      responsavel: responsavelFiltro || undefined,
    });
    setMovimentacoes(data);
    setLoading(false);
  };

  useEffect(() => {
    loadHistorico();
  }, [dataInicio, dataFim, tipoFiltro, responsavelFiltro]);

  const activeFiltersCount = (tipoFiltro !== 'todos' ? 1 : 0) + (responsavelFiltro ? 1 : 0);
  const [filtersOpen, setFiltersOpen] = useState(false);

  return (
    <div className="space-y-4">
      {/* Filtros Desktop */}
      <Card className="p-4 hidden md:block">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <Label>Data Início</Label>
            <Input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
          </div>
          <div>
            <Label>Data Fim</Label>
            <Input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
          </div>
          <div>
            <Label>Tipo</Label>
            <Select value={tipoFiltro} onValueChange={setTipoFiltro}>
              <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="entrada">Entrada</SelectItem>
                <SelectItem value="saida">Saída</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Responsável</Label>
            <Input placeholder="Nome do responsável..." value={responsavelFiltro} onChange={(e) => setResponsavelFiltro(e.target.value)} />
          </div>
        </div>
      </Card>

      {/* Filtros Mobile */}
      <Card className="p-3 md:hidden space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs">Início</Label>
            <Input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Fim</Label>
            <Input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
          </div>
        </div>
        <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" className="w-full relative">
              <SlidersHorizontal className="h-4 w-4 mr-2" />
              Mais filtros
              {activeFiltersCount > 0 && (
                <Badge className="ml-2 h-5 min-w-5 px-1.5">{activeFiltersCount}</Badge>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[85vw] sm:max-w-sm">
            <SheetHeader><SheetTitle>Filtros</SheetTitle></SheetHeader>
            <div className="mt-6 space-y-4">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={tipoFiltro} onValueChange={setTipoFiltro}>
                  <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="entrada">Entrada</SelectItem>
                    <SelectItem value="saida">Saída</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Responsável</Label>
                <Input placeholder="Nome do responsável..." value={responsavelFiltro} onChange={(e) => setResponsavelFiltro(e.target.value)} />
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </Card>

      {/* Tabela Desktop */}
      <Card className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data/Hora</TableHead>
              <TableHead>Produto</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="text-right">Quantidade</TableHead>
              <TableHead className="text-right">Custo Aplicado</TableHead>
              <TableHead className="text-right">Subtotal</TableHead>
              <TableHead>Responsável</TableHead>
              <TableHead>Origem</TableHead>
              <TableHead className="text-center">Comprovante</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={9} className="text-center py-8">Carregando histórico...</TableCell></TableRow>
            ) : movimentacoes.length === 0 ? (
              <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Nenhuma movimentação encontrada</TableCell></TableRow>
            ) : (
              movimentacoes.map((mov: any) => (
                <TableRow key={mov.id}>
                  <TableCell>{format(new Date(mov.data_hora), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</TableCell>
                  <TableCell>{mov.produtos?.nome || 'N/A'}</TableCell>
                  <TableCell>
                    <Badge variant={mov.tipo === 'entrada' ? 'default' : 'destructive'}>
                      {mov.tipo === 'entrada' ? 'Entrada' : 'Saída'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">{formatters.quantidadeContinua(mov.quantidade)}</TableCell>
                  <TableCell className="text-right">{formatters.valor(mov.custo_aplicado)}</TableCell>
                  <TableCell className="text-right font-semibold">{formatters.valor(mov.subtotal)}</TableCell>
                  <TableCell>{mov.responsavel}</TableCell>
                  <TableCell className="capitalize">{mov.origem}</TableCell>
                  <TableCell className="text-center">
                    {mov.comprovantes?.numero ? (
                      <Badge variant="outline" className="gap-1">
                        <FileText className="h-3 w-3" />
                        #{mov.comprovantes.numero}
                      </Badge>
                    ) : ('-')}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Lista Mobile (cards) */}
      <div className="md:hidden space-y-2">
        {loading ? (
          <Card className="p-6 text-center text-sm text-muted-foreground">Carregando histórico...</Card>
        ) : movimentacoes.length === 0 ? (
          <Card className="p-6 text-center text-sm text-muted-foreground">Nenhuma movimentação encontrada</Card>
        ) : (
          movimentacoes.map((mov: any) => (
            <Card key={mov.id} className="p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Badge variant={mov.tipo === 'entrada' ? 'default' : 'destructive'} className="text-[10px] h-5">
                  {mov.tipo === 'entrada' ? 'Entrada' : 'Saída'}
                </Badge>
                <span className="text-[11px] text-muted-foreground">
                  {format(new Date(mov.data_hora), "dd/MM/yy HH:mm", { locale: ptBR })}
                </span>
              </div>
              <h4 className="font-semibold text-sm leading-tight">{mov.produtos?.nome || 'N/A'}</h4>
              <div className="grid grid-cols-3 gap-2 pt-2 border-t text-xs">
                <div>
                  <p className="text-muted-foreground">Qtd</p>
                  <p className="font-medium">{formatters.quantidadeContinua(mov.quantidade)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Custo</p>
                  <p className="font-medium">{formatters.valor(mov.custo_aplicado)}</p>
                </div>
                <div className="text-right">
                  <p className="text-muted-foreground">Subtotal</p>
                  <p className="font-semibold text-primary">{formatters.valor(mov.subtotal)}</p>
                </div>
              </div>
              <div className="flex items-center justify-between gap-2 pt-2 border-t text-[11px] text-muted-foreground">
                <span className="truncate">{mov.responsavel} · <span className="capitalize">{mov.origem}</span></span>
                {mov.comprovantes?.numero && (
                  <Badge variant="outline" className="gap-1 text-[10px] h-5 flex-shrink-0">
                    <FileText className="h-3 w-3" />#{mov.comprovantes.numero}
                  </Badge>
                )}
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
