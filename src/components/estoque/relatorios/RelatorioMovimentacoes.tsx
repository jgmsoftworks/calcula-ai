import { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileSpreadsheet, FileText, ArrowDown, ArrowUp } from 'lucide-react';
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

export function RelatorioMovimentacoes() {
  const { fetchHistoricoGeral } = useMovimentacoes();
  const [dataInicio, setDataInicio] = useState(firstDayOfMonth());
  const [dataFim, setDataFim] = useState(today());
  const [tipo, setTipo] = useState<string>('todos');
  const [responsavel, setResponsavel] = useState('');
  const [movs, setMovs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const filters: any = {
      dataInicio: dataInicio ? `${dataInicio}T00:00:00` : undefined,
      dataFim: dataFim ? `${dataFim}T23:59:59` : undefined,
    };
    if (tipo !== 'todos') filters.tipo = tipo;
    if (responsavel.trim()) filters.responsavel = responsavel.trim();
    const data = await fetchHistoricoGeral(filters);
    setMovs(data);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const rows = useMemo(() => movs.map((m: any) => ({
    data: new Date(m.data_hora).toLocaleString('pt-BR'),
    produto: m.produtos?.nome || '-',
    tipo: m.tipo,
    quantidade: m.quantidade || 0,
    custo: m.custo_aplicado || 0,
    valor: m.subtotal || 0,
    motivo: m.motivo || '-',
    responsavel: m.responsavel || '-',
  })), [movs]);

  const resumo = useMemo(() => {
    const r = { qtdEntrada: 0, qtdSaida: 0, valEntrada: 0, valSaida: 0 };
    rows.forEach((x) => {
      if (x.tipo === 'entrada') { r.qtdEntrada += x.quantidade; r.valEntrada += x.valor; }
      else if (x.tipo === 'saida') { r.qtdSaida += x.quantidade; r.valSaida += x.valor; }
    });
    return r;
  }, [rows]);

  const colunas: ColunaExport[] = [
    { key: 'data', header: 'Data', width: 2.4 },
    { key: 'produto', header: 'Produto', width: 3.5 },
    { key: 'tipo', header: 'Tipo', width: 1, align: 'center' },
    { key: 'quantidade', header: 'Qtd.', width: 1.2, format: 'number' },
    { key: 'custo', header: 'Custo Un.', width: 1.6, format: 'currency' },
    { key: 'valor', header: 'Valor Total', width: 1.8, format: 'currency' },
    { key: 'motivo', header: 'Motivo', width: 2 },
    { key: 'responsavel', header: 'Responsável', width: 2 },
  ];

  const filtrosTxt = [
    `Período: ${dataInicio} a ${dataFim}`,
    `Tipo: ${tipo === 'todos' ? 'Todos' : tipo}`,
    responsavel ? `Responsável: ${responsavel}` : '',
  ].filter(Boolean);

  const totaisExport = {
    'Entradas (qtd)': formatNumber(resumo.qtdEntrada, 2),
    'Entradas (R$)': `R$ ${formatBRL(resumo.valEntrada)}`,
    'Saídas (qtd)': formatNumber(resumo.qtdSaida, 2),
    'Saídas (R$)': `R$ ${formatBRL(resumo.valSaida)}`,
    'Saldo líquido (R$)': `R$ ${formatBRL(resumo.valEntrada - resumo.valSaida)}`,
  };

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
            <Label className="text-xs text-muted-foreground mb-1.5 block">Responsável</Label>
            <Input value={responsavel} onChange={(e) => setResponsavel(e.target.value)} placeholder="Nome" />
          </div>
          <div className="flex items-end">
            <Button onClick={load} className="w-full">Aplicar filtros</Button>
          </div>
        </div>
        <div className="flex gap-2 justify-end">
          <Button variant="outline" size="sm" className="gap-2" onClick={() => exportarRelatorioExcel({ titulo: 'Movimentações por Período', filtros: filtrosTxt }, colunas, rows, totaisExport)}>
            <FileSpreadsheet className="h-4 w-4" /> Excel
          </Button>
          <Button variant="outline" size="sm" className="gap-2" onClick={() => exportarRelatorioPDF({ titulo: 'Movimentações por Período', filtros: filtrosTxt }, colunas, rows, totaisExport)}>
            <FileText className="h-4 w-4" /> PDF
          </Button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="rounded-xl bg-emerald-500/10 p-3">
            <p className="text-xs text-muted-foreground flex items-center gap-1"><ArrowDown className="h-3 w-3 text-emerald-600" />Entradas</p>
            <p className="text-base font-bold text-emerald-700 dark:text-emerald-400">R$ {formatBRL(resumo.valEntrada)}</p>
            <p className="text-xs text-muted-foreground">{formatNumber(resumo.qtdEntrada, 2)} un.</p>
          </div>
          <div className="rounded-xl bg-rose-500/10 p-3">
            <p className="text-xs text-muted-foreground flex items-center gap-1"><ArrowUp className="h-3 w-3 text-rose-600" />Saídas</p>
            <p className="text-base font-bold text-rose-700 dark:text-rose-400">R$ {formatBRL(resumo.valSaida)}</p>
            <p className="text-xs text-muted-foreground">{formatNumber(resumo.qtdSaida, 2)} un.</p>
          </div>
          <div className="rounded-xl bg-primary/5 p-3 col-span-2 lg:col-span-1">
            <p className="text-xs text-muted-foreground">Saldo líquido</p>
            <p className="text-base font-bold">R$ {formatBRL(resumo.valEntrada - resumo.valSaida)}</p>
          </div>
          <div className="rounded-xl bg-muted/40 p-3 col-span-2 lg:col-span-1">
            <p className="text-xs text-muted-foreground">Total de movimentações</p>
            <p className="text-base font-bold">{formatNumber(rows.length, 0)}</p>
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto max-h-[600px]">
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10">
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Produto</TableHead>
                <TableHead className="text-center">Tipo</TableHead>
                <TableHead className="text-right">Qtd.</TableHead>
                <TableHead className="text-right">Custo Un.</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Motivo</TableHead>
                <TableHead>Responsável</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>}
              {!loading && rows.length === 0 && <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Nenhuma movimentação encontrada</TableCell></TableRow>}
              {rows.map((r, i) => (
                <TableRow key={i}>
                  <TableCell className="text-sm whitespace-nowrap">{r.data}</TableCell>
                  <TableCell className="font-medium">{r.produto}</TableCell>
                  <TableCell className="text-center">
                    {r.tipo === 'entrada'
                      ? <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-0">Entrada</Badge>
                      : <Badge className="bg-rose-500/15 text-rose-700 dark:text-rose-400 border-0">Saída</Badge>}
                  </TableCell>
                  <TableCell className="text-right">{formatNumber(r.quantidade, 2)}</TableCell>
                  <TableCell className="text-right">R$ {formatBRL(r.custo)}</TableCell>
                  <TableCell className="text-right font-semibold">R$ {formatBRL(r.valor)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{r.motivo}</TableCell>
                  <TableCell className="text-sm">{r.responsavel}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
