import { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Search, FileSpreadsheet, FileText, Package, AlertTriangle } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useEstoque } from '@/hooks/useEstoque';
import { formatBRL, formatNumber } from '@/lib/formatters';
import {
  exportarRelatorioExcel,
  exportarRelatorioPDF,
  ColunaExport,
} from '@/hooks/useExportRelatorioEstoque';

export function RelatorioPosicao() {
  const { fetchProdutos } = useEstoque();
  const [produtos, setProdutos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [soAbaixoMin, setSoAbaixoMin] = useState(false);
  const [ocultarZero, setOcultarZero] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const data = await fetchProdutos();
      setProdutos(data);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return produtos
      .filter((p) => {
        if (term && !(`${p.codigo_interno} ${p.nome}`.toLowerCase().includes(term))) return false;
        if (ocultarZero && (p.estoque_atual || 0) <= 0) return false;
        if (soAbaixoMin && !(p.estoque_minimo > 0 && p.estoque_atual < p.estoque_minimo)) return false;
        return true;
      })
      .map((p) => {
        const valor = (p.estoque_atual || 0) * (p.custo_unitario || 0);
        let status: 'OK' | 'Abaixo' | 'Zerado' = 'OK';
        if ((p.estoque_atual || 0) <= 0) status = 'Zerado';
        else if (p.estoque_minimo > 0 && p.estoque_atual < p.estoque_minimo) status = 'Abaixo';
        return {
          codigo_interno: p.codigo_interno,
          nome: p.nome,
          categoria: (p.categorias || []).join(', '),
          unidade: p.unidade_compra,
          estoque_atual: p.estoque_atual || 0,
          custo_unitario: p.custo_unitario || 0,
          valor_estoque: valor,
          estoque_minimo: p.estoque_minimo || 0,
          status,
        };
      });
  }, [produtos, search, soAbaixoMin, ocultarZero]);

  const totais = useMemo(() => {
    const valorTotal = rows.reduce((s, r) => s + r.valor_estoque, 0);
    return { skus: rows.length, valorTotal };
  }, [rows]);

  const colunas: ColunaExport[] = [
    { key: 'codigo_interno', header: 'Código', width: 1, format: 'int' },
    { key: 'nome', header: 'Produto', width: 4 },
    { key: 'categoria', header: 'Categoria', width: 2.5 },
    { key: 'unidade', header: 'Un.', width: 1, align: 'center' },
    { key: 'estoque_atual', header: 'Saldo', width: 1.4, format: 'number' },
    { key: 'estoque_minimo', header: 'Mínimo', width: 1.4, format: 'number' },
    { key: 'custo_unitario', header: 'Custo Un.', width: 1.8, format: 'currency' },
    { key: 'valor_estoque', header: 'Valor Estoque', width: 2.2, format: 'currency' },
    { key: 'status', header: 'Status', width: 1.4, align: 'center' },
  ];

  const filtros: string[] = [];
  if (search) filtros.push(`Busca: "${search}"`);
  if (soAbaixoMin) filtros.push('Apenas abaixo do mínimo');
  if (ocultarZero) filtros.push('Ocultar saldo zero');

  const totaisExport = {
    'Total de SKUs': totais.skus,
    'Valor total em estoque': `R$ ${formatBRL(totais.valorTotal)}`,
  };

  const handleExcel = () => exportarRelatorioExcel(
    { titulo: 'Posição de Estoque', filtros },
    colunas, rows, totaisExport,
  );
  const handlePDF = () => exportarRelatorioPDF(
    { titulo: 'Posição de Estoque', filtros },
    colunas, rows, totaisExport,
  );

  return (
    <div className="space-y-4">
      <Card className="p-4 space-y-4">
        <div className="flex flex-col lg:flex-row gap-3 lg:items-end">
          <div className="flex-1 min-w-[200px]">
            <Label className="text-xs text-muted-foreground mb-1.5 block">Buscar produto</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Nome ou código"
                className="pl-9"
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Switch id="abaixo" checked={soAbaixoMin} onCheckedChange={setSoAbaixoMin} />
              <Label htmlFor="abaixo" className="text-sm cursor-pointer">Abaixo do mínimo</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch id="zero" checked={ocultarZero} onCheckedChange={setOcultarZero} />
              <Label htmlFor="zero" className="text-sm cursor-pointer">Ocultar zero</Label>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleExcel} className="gap-2">
              <FileSpreadsheet className="h-4 w-4" /> Excel
            </Button>
            <Button variant="outline" size="sm" onClick={handlePDF} className="gap-2">
              <FileText className="h-4 w-4" /> PDF
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-primary/5 p-3 flex items-center gap-3">
            <Package className="h-5 w-5 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">SKUs ativos</p>
              <p className="text-lg font-bold">{formatNumber(totais.skus, 0)}</p>
            </div>
          </div>
          <div className="rounded-xl bg-emerald-500/10 p-3">
            <p className="text-xs text-muted-foreground">Valor total em estoque</p>
            <p className="text-lg font-bold text-emerald-700 dark:text-emerald-400">R$ {formatBRL(totais.valorTotal)}</p>
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto max-h-[600px]">
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10">
              <TableRow>
                <TableHead className="w-20">Código</TableHead>
                <TableHead>Produto</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead className="text-center">Un.</TableHead>
                <TableHead className="text-right">Saldo</TableHead>
                <TableHead className="text-right">Mínimo</TableHead>
                <TableHead className="text-right">Custo Un.</TableHead>
                <TableHead className="text-right">Valor Estoque</TableHead>
                <TableHead className="text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (
                <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
              )}
              {!loading && rows.length === 0 && (
                <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Nenhum produto encontrado</TableCell></TableRow>
              )}
              {rows.map((r) => (
                <TableRow key={r.codigo_interno}>
                  <TableCell className="font-mono text-xs">{r.codigo_interno}</TableCell>
                  <TableCell className="font-medium">{r.nome}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{r.categoria || '-'}</TableCell>
                  <TableCell className="text-center text-sm uppercase">{r.unidade}</TableCell>
                  <TableCell className="text-right">{formatNumber(r.estoque_atual, 2)}</TableCell>
                  <TableCell className="text-right text-muted-foreground">{formatNumber(r.estoque_minimo, 2)}</TableCell>
                  <TableCell className="text-right">R$ {formatBRL(r.custo_unitario)}</TableCell>
                  <TableCell className="text-right font-semibold">R$ {formatBRL(r.valor_estoque)}</TableCell>
                  <TableCell className="text-center">
                    {r.status === 'OK' && <Badge variant="secondary" className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-0">OK</Badge>}
                    {r.status === 'Abaixo' && <Badge variant="secondary" className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-0 gap-1"><AlertTriangle className="h-3 w-3" />Abaixo</Badge>}
                    {r.status === 'Zerado' && <Badge variant="secondary" className="bg-rose-500/15 text-rose-700 dark:text-rose-400 border-0">Zerado</Badge>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
