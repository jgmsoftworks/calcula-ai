import { useState, useEffect } from 'react';
import { Calendar, FileText } from 'lucide-react';
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

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <Label>Data Início</Label>
            <Input
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
            />
          </div>

          <div>
            <Label>Data Fim</Label>
            <Input
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
            />
          </div>

          <div>
            <Label>Tipo</Label>
            <Select value={tipoFiltro} onValueChange={setTipoFiltro}>
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="entrada">Entrada</SelectItem>
                <SelectItem value="saida">Saída</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Responsável</Label>
            <Input
              placeholder="Nome do responsável..."
              value={responsavelFiltro}
              onChange={(e) => setResponsavelFiltro(e.target.value)}
            />
          </div>
        </div>
      </Card>

      {/* Tabela */}
      <Card>
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
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8">
                  Carregando histórico...
                </TableCell>
              </TableRow>
            ) : movimentacoes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                  Nenhuma movimentação encontrada
                </TableCell>
              </TableRow>
            ) : (
              movimentacoes.map((mov: any) => (
                <TableRow key={mov.id}>
                  <TableCell>
                    {format(new Date(mov.data_hora), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </TableCell>
                  <TableCell>{mov.produtos?.nome || 'N/A'}</TableCell>
                  <TableCell>
                    <Badge variant={mov.tipo === 'entrada' ? 'default' : 'destructive'}>
                      {mov.tipo === 'entrada' ? 'Entrada' : 'Saída'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {formatters.quantidadeContinua(mov.quantidade)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatters.valor(mov.custo_aplicado)}
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {formatters.valor(mov.subtotal)}
                  </TableCell>
                  <TableCell>{mov.responsavel}</TableCell>
                  <TableCell className="capitalize">{mov.origem}</TableCell>
                  <TableCell className="text-center">
                    {mov.comprovantes?.numero ? (
                      <Badge variant="outline" className="gap-1">
                        <FileText className="h-3 w-3" />
                        #{mov.comprovantes.numero}
                      </Badge>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
