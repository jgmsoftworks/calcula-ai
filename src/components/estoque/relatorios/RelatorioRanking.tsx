import { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileSpreadsheet, FileText, Trophy } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useMovimentacoes } from '@/hooks/useMovimentacoes';
import { formatBRL, formatNumber } from '@/lib/formatters';
import {
  exportarRelatorioExcel,
  exportarRelatorioPDF,
  ColunaExport,
} from '@/hooks/useExportRelatorioEstoque';

function firstDayOfMonth() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}
function today() {
  return new Date().toISOString().slice(0, 10);
}

const COLORS = ['#0483e4', '#1c93d8', '#36a3cc', '#50b3c0', '#6ac3b4', '#84d3a8', '#9ee39c', '#b8f390', '#d2ff84', '#f96e0c'];

export function RelatorioRanking() {
  const { fetchHistoricoGeral } = useMovimentacoes();
  const [dataInicio, setDataInicio] = useState(firstDayOfMonth());
  const [dataFim, setDataFim] = useState(today());
  const [tipo, setTipo] = useState<string>('saida');
  const [topN, setTopN] = useState<string>('10');
  const [movs, setMovs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const filters: any = {
      dataInicio: dataInicio ? `${dataInicio}T00:00:00` : undefined,
      dataFim: dataFim ? `${dataFim}T23:59:59` : undefined,
    };
    if (tipo !== 'todos') filters.tipo = tipo;
    const data = await fetchHistoricoGeral(filters);
    setMovs(data);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const rows = useMemo(() => {
    const map = new Map<string, { produto: string; qtd: number; vezes: number; valor: number }>();
    movs.forEach((m: any) => {
      const key = m.produto_id || m.produtos?.nome || 'sem-id';
      const cur = map.get(key) || { produto: m.produtos?.nome || '-', qtd: 0, vezes: 0, valor: 0 };
      cur.qtd += m.quantidade || 0;
      cur.vezes += 1;
      cur.valor += m.subtotal || 0;
      map.set(key, cur);
    });
    const limit = parseInt(topN);
    return Array.from(map.values())
      .sort((a, b) => b.qtd - a.qtd)
      .slice(0, limit)
      .map((r, i) => ({ posicao: i + 1, ...r }));
  }, [movs, topN]);

  const colunas: ColunaExport[] = [
    { key: 'posicao', header: '#', width: 0.6, format: 'int', align: 'center' },
    { key: 'produto', header: 'Produto', width: 4 },
    { key: 'qtd', header: 'Quantidade', width: 1.6, format: 'number' },
    { key: 'vezes', header: 'Movimentações', width: 1.6, format: 'int' },
    { key: 'valor', header: 'Valor Total', width: 2, format: 'currency' },
  ];

  const filtrosTxt = [
    `Período: ${dataInicio} a ${dataFim}`,
    `Tipo: ${tipo === 'todos' ? 'Todos' : tipo}`,
    `Top ${topN}`,
  ];

  const chartData = rows.slice(0, 10).map((r) => ({ name: r.produto.length > 22 ? r.produto.slice(0, 22) + '…' : r.produto, qtd: r.qtd }));

  return (
    <div className="space-y-4">
      <Card className="p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Data início</Label>
            <Input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Data fim</Label>
            <Input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Tipo</Label>
            <Select value={tipo} onValueChange={setTipo}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="entrada">Entradas</SelectItem>
                <SelectItem value="saida">Saídas</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Top</Label>
            <Select value={topN} onValueChange={setTopN}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="10">Top 10</SelectItem>
                <SelectItem value="25">Top 25</SelectItem>
                <SelectItem value="50">Top 50</SelectItem>
                <SelectItem value="100">Top 100</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button onClick={load} className="w-full">Aplicar filtros</Button>
          </div>
        </div>
        <div className="flex gap-2 justify-end">
          <Button variant="outline" size="sm" className="gap-2" onClick={() => exportarRelatorioExcel({ titulo: 'Produtos Mais Movimentados', filtros: filtrosTxt }, colunas, rows)}>
            <FileSpreadsheet className="h-4 w-4" /> Excel
          </Button>
          <Button variant="outline" size="sm" className="gap-2" onClick={() => exportarRelatorioPDF({ titulo: 'Produtos Mais Movimentados', filtros: filtrosTxt }, colunas, rows)}>
            <FileText className="h-4 w-4" /> PDF
          </Button>
        </div>
      </Card>

      {chartData.length > 0 && (
        <Card className="p-4">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><Trophy className="h-4 w-4 text-amber-500" />Top 10 — visualização</h3>
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 20 }}>
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={160} />
                <Tooltip formatter={(v: any) => formatNumber(Number(v), 2)} />
                <Bar dataKey="qtd" radius={[0, 6, 6, 0]}>
                  {chartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      <Card className="overflow-hidden">
        <div className="overflow-x-auto max-h-[600px]">
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10">
              <TableRow>
                <TableHead className="w-12 text-center">#</TableHead>
                <TableHead>Produto</TableHead>
                <TableHead className="text-right">Quantidade</TableHead>
                <TableHead className="text-right">Movimentações</TableHead>
                <TableHead className="text-right">Valor Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>}
              {!loading && rows.length === 0 && <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Sem dados para o período</TableCell></TableRow>}
              {rows.map((r) => (
                <TableRow key={r.posicao}>
                  <TableCell className="text-center font-bold text-muted-foreground">{r.posicao}</TableCell>
                  <TableCell className="font-medium">{r.produto}</TableCell>
                  <TableCell className="text-right font-semibold">{formatNumber(r.qtd, 2)}</TableCell>
                  <TableCell className="text-right text-muted-foreground">{r.vezes}</TableCell>
                  <TableCell className="text-right">R$ {formatBRL(r.valor)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
