import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useHistoricoMovimentacoes } from '@/hooks/useHistoricoMovimentacoes';
import { formatDateBrasilia, formatTimeBrasilia } from '@/lib/dateUtils';
import { ArrowUpCircle, ArrowDownCircle, Loader2 } from 'lucide-react';

interface HistoricoMovimentacoesProps {
  produtoId: string;
}

export const HistoricoMovimentacoes = ({ produtoId }: HistoricoMovimentacoesProps) => {
  const [filtros, setFiltros] = useState({
    tipo: 'todos',
    data_inicial: '',
    data_final: ''
  });

  const { movimentacoes, loading, loadMore, hasMore, refresh } = useHistoricoMovimentacoes({
    origem: 'estoque',
    produtoId,
  });

  const handleFiltrar = () => {
    const filtrosAtivos: any = {};
    
    if (filtros.tipo && filtros.tipo !== 'todos') filtrosAtivos.tipo = filtros.tipo;
    if (filtros.data_inicial) filtrosAtivos.data_inicial = filtros.data_inicial;
    if (filtros.data_final) filtrosAtivos.data_final = filtros.data_final;
    
    refresh(filtrosAtivos);
  };

  const getTipoBadge = (tipo: string) => {
    if (tipo === 'entrada') {
      return (
        <Badge variant="default" className="gap-1 text-xs">
          <ArrowUpCircle className="w-3 h-3" />
          ENT
        </Badge>
      );
    }
    return (
      <Badge variant="destructive" className="gap-1 text-xs">
        <ArrowDownCircle className="w-3 h-3" />
        SAI
      </Badge>
    );
  };

  return (
    <div className="space-y-4">
      {/* Filtros compactos */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 p-3 bg-muted/50 rounded-lg">
        <div>
          <Label className="text-xs">Tipo</Label>
          <Select value={filtros.tipo} onValueChange={(v) => setFiltros(prev => ({ ...prev, tipo: v }))}>
            <SelectTrigger className="h-8 text-xs">
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
          <Label className="text-xs">Data Inicial</Label>
          <Input
            type="date"
            className="h-8 text-xs"
            value={filtros.data_inicial}
            onChange={(e) => setFiltros(prev => ({ ...prev, data_inicial: e.target.value }))}
          />
        </div>

        <div>
          <Label className="text-xs">Data Final</Label>
          <Input
            type="date"
            className="h-8 text-xs"
            value={filtros.data_final}
            onChange={(e) => setFiltros(prev => ({ ...prev, data_final: e.target.value }))}
          />
        </div>

        <div className="flex items-end">
          <Button size="sm" onClick={handleFiltrar} disabled={loading} className="h-8 text-xs">
            {loading ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : null}
            Filtrar
          </Button>
        </div>
      </div>

      {/* Tabela compacta */}
      <div className="rounded-md border max-h-96 overflow-auto">
        <Table>
          <TableHeader className="sticky top-0 bg-background">
            <TableRow>
              <TableHead className="text-xs">Data</TableHead>
              <TableHead className="text-xs">Hora</TableHead>
              <TableHead className="text-xs">Tipo</TableHead>
              <TableHead className="text-xs">Qtd</TableHead>
              <TableHead className="text-xs">Custo Unit.</TableHead>
              <TableHead className="text-xs">Total</TableHead>
              <TableHead className="text-xs">Fornecedor</TableHead>
              <TableHead className="text-xs">Obs</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && movimentacoes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center h-20">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                </TableCell>
              </TableRow>
            ) : movimentacoes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground text-xs h-20">
                  Nenhuma movimentação encontrada
                </TableCell>
              </TableRow>
            ) : (
              movimentacoes.map((mov) => (
                <TableRow key={mov.id}>
                  <TableCell className="text-xs whitespace-nowrap">
                    {formatDateBrasilia(mov.created_at)}
                  </TableCell>
                  <TableCell className="text-xs whitespace-nowrap">
                    {formatTimeBrasilia(mov.created_at)}
                  </TableCell>
                  <TableCell>{getTipoBadge(mov.tipo)}</TableCell>
                  <TableCell className="text-xs">{mov.quantidade.toFixed(3)}</TableCell>
                  <TableCell className="text-xs">R$ {mov.custo_unitario.toFixed(2)}</TableCell>
                  <TableCell className="text-xs">R$ {(mov.quantidade * mov.custo_unitario).toFixed(2)}</TableCell>
                  <TableCell className="text-xs">{mov.fornecedores?.nome || '-'}</TableCell>
                  <TableCell className="text-xs max-w-[150px] truncate">{mov.observacao || '-'}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Carregar Mais */}
      {hasMore && !loading && (
        <div className="text-center">
          <Button variant="outline" size="sm" onClick={loadMore} className="text-xs">
            Carregar mais
          </Button>
        </div>
      )}
    </div>
  );
};
