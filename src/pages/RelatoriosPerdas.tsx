import { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { AlertOctagon, BarChart3, Calendar, Package, ChefHat, TrendingDown, FileDown } from 'lucide-react';
import { usePerdas, Perda } from '@/hooks/usePerdas';
import { formatBRL, formatNumber } from '@/lib/formatters';

function groupBy<T>(arr: T[], key: (it: T) => string) {
  const m = new Map<string, T[]>();
  arr.forEach((it) => {
    const k = key(it);
    if (!m.has(k)) m.set(k, []);
    m.get(k)!.push(it);
  });
  return m;
}

function exportCSV(perdas: Perda[]) {
  const headers = ['Data', 'Tipo', 'Item', 'Quantidade', 'Custo unitário', 'Custo total', 'Motivo', 'Responsável', 'Observação'];
  const rows = perdas.map((p) => [
    new Date(p.data_perda).toLocaleString('pt-BR'),
    p.tipo,
    p.nome_item,
    String(p.quantidade).replace('.', ','),
    String(p.custo_unitario).replace('.', ','),
    String(p.custo_total).replace('.', ','),
    p.motivo === 'Outro' && p.motivo_outro ? `Outro (${p.motivo_outro})` : p.motivo,
    p.responsavel || '',
    (p.observacao || '').replace(/\n/g, ' '),
  ]);
  const csv = [headers, ...rows]
    .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(';'))
    .join('\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `relatorio-perdas-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function RelatoriosPerdas() {
  const { fetchPerdas, loading } = usePerdas();
  const [perdas, setPerdas] = useState<Perda[]>([]);
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');

  const load = async () => {
    const filters: any = {};
    if (dataInicio) filters.dataInicio = new Date(dataInicio).toISOString();
    if (dataFim) {
      const d = new Date(dataFim);
      d.setHours(23, 59, 59, 999);
      filters.dataFim = d.toISOString();
    }
    setPerdas(await fetchPerdas(filters));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totals = useMemo(() => {
    const total = perdas.reduce((s, p) => s + Number(p.custo_total || 0), 0);
    const qtdRegistros = perdas.length;
    const produtos = perdas.filter((p) => p.tipo === 'produto');
    const receitas = perdas.filter((p) => p.tipo === 'receita');
    const custoProdutos = produtos.reduce((s, p) => s + Number(p.custo_total || 0), 0);
    const custoReceitas = receitas.reduce((s, p) => s + Number(p.custo_total || 0), 0);
    return { total, qtdRegistros, produtos: produtos.length, receitas: receitas.length, custoProdutos, custoReceitas };
  }, [perdas]);

  const porMotivo = useMemo(() => {
    const g = groupBy(perdas, (p) => (p.motivo === 'Outro' && p.motivo_outro ? `Outro (${p.motivo_outro})` : p.motivo));
    return Array.from(g.entries())
      .map(([motivo, items]) => ({
        motivo,
        quantidade: items.length,
        custo: items.reduce((s, p) => s + Number(p.custo_total || 0), 0),
      }))
      .sort((a, b) => b.custo - a.custo);
  }, [perdas]);

  const porItem = useMemo(() => {
    const g = groupBy(perdas, (p) => `${p.tipo}::${p.nome_item}`);
    return Array.from(g.entries())
      .map(([k, items]) => {
        const [tipo, nome] = k.split('::');
        return {
          tipo: tipo as 'produto' | 'receita',
          nome,
          quantidade: items.reduce((s, p) => s + Number(p.quantidade || 0), 0),
          ocorrencias: items.length,
          custo: items.reduce((s, p) => s + Number(p.custo_total || 0), 0),
        };
      })
      .sort((a, b) => b.custo - a.custo)
      .slice(0, 20);
  }, [perdas]);

  const maxCustoMotivo = Math.max(1, ...porMotivo.map((m) => m.custo));
  const maxCustoItem = Math.max(1, ...porItem.map((m) => m.custo));

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Filtros */}
      <Card className="p-4 glass-card">
        <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-end">
          <div className="space-y-1.5 w-full sm:w-auto">
            <Label htmlFor="di" className="text-xs">Data inicial</Label>
            <Input id="di" type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} className="w-full sm:w-44" />
          </div>
          <div className="space-y-1.5 w-full sm:w-auto">
            <Label htmlFor="df" className="text-xs">Data final</Label>
            <Input id="df" type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} className="w-full sm:w-44" />
          </div>
          <Button onClick={load} disabled={loading} className="w-full gap-2 sm:w-auto">
            <Calendar className="h-4 w-4" /> Aplicar
          </Button>
          <Button variant="outline" className="w-full sm:w-auto" onClick={() => { setDataInicio(''); setDataFim(''); setTimeout(load, 0); }}>Limpar</Button>
          <div className="flex-1" />
          <Button variant="outline" onClick={() => exportCSV(perdas)} disabled={perdas.length === 0} className="w-full gap-2 sm:w-auto">
            <FileDown className="h-4 w-4" /> Exportar CSV
          </Button>
        </div>
      </Card>

      {/* Cards de resumo */}
      <div className="grid grid-cols-1 gap-3 min-[400px]:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4 glass-card">
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><TrendingDown className="h-3.5 w-3.5" /> Prejuízo total</div>
          <p className="text-2xl font-bold text-destructive mt-1">{formatBRL(totals.total)}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">{totals.qtdRegistros} registros</p>
        </Card>
        <Card className="p-4 glass-card">
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><Package className="h-3.5 w-3.5" /> Perdas de produtos</div>
          <p className="text-2xl font-bold mt-1">{totals.produtos}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">{formatBRL(totals.custoProdutos)}</p>
        </Card>
        <Card className="p-4 glass-card">
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><ChefHat className="h-3.5 w-3.5" /> Perdas de receitas</div>
          <p className="text-2xl font-bold mt-1">{totals.receitas}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">{formatBRL(totals.custoReceitas)}</p>
        </Card>
        <Card className="p-4 glass-card">
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><AlertOctagon className="h-3.5 w-3.5" /> Custo médio / perda</div>
          <p className="text-2xl font-bold mt-1">{formatBRL(totals.qtdRegistros ? totals.total / totals.qtdRegistros : 0)}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">média por ocorrência</p>
        </Card>
      </div>

      <Tabs defaultValue="motivo" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 h-auto">
          <TabsTrigger value="motivo" className="gap-1 py-2.5 sm:gap-2">
            <BarChart3 className="h-4 w-4" /> <span>Motivos</span>
          </TabsTrigger>
          <TabsTrigger value="itens" className="gap-1 py-2.5 sm:gap-2">
            <Package className="h-4 w-4" /> <span className="hidden sm:inline">Itens mais perdidos</span><span className="sm:hidden">Itens</span>
          </TabsTrigger>
          <TabsTrigger value="detalhado" className="gap-1 py-2.5 sm:gap-2">
            <AlertOctagon className="h-4 w-4" /> Detalhado
          </TabsTrigger>
        </TabsList>

        <TabsContent value="motivo">
          <Card className="p-4 glass-card">
            {porMotivo.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Sem perdas no período.</p>
            ) : (
              <div className="space-y-3">
                {porMotivo.map((m) => (
                  <div key={m.motivo} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{m.motivo}</span>
                        <Badge variant="outline" className="text-[10px]">{m.quantidade}</Badge>
                      </div>
                      <span className="font-semibold text-destructive">{formatBRL(m.custo)}</span>
                    </div>
                    <div className="h-2 bg-muted/40 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-orange-500 to-destructive rounded-full" style={{ width: `${(m.custo / maxCustoMotivo) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="itens">
          <Card className="p-4 glass-card">
            {porItem.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Sem perdas no período.</p>
            ) : (
              <div className="space-y-3">
                {porItem.map((it, i) => (
                  <div key={i} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {it.tipo === 'produto' ? <Package className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" /> : <ChefHat className="h-3.5 w-3.5 text-orange-500 flex-shrink-0" />}
                        <span className="font-medium truncate">{it.nome}</span>
                        <Badge variant="outline" className="text-[10px] flex-shrink-0">{it.ocorrencias}x</Badge>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="font-semibold text-destructive text-sm">{formatBRL(it.custo)}</p>
                        <p className="text-[10px] text-muted-foreground">Qtd: {formatNumber(it.quantidade)}</p>
                      </div>
                    </div>
                    <div className="h-2 bg-muted/40 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${it.tipo === 'produto' ? 'bg-blue-500' : 'bg-orange-500'}`} style={{ width: `${(it.custo / maxCustoItem) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="detalhado">
          <div className="space-y-2 md:hidden">
            {perdas.length === 0 ? (
              <Card className="p-8 text-center text-sm text-muted-foreground">Nenhuma perda no período.</Card>
            ) : perdas.map((p) => {
              const motivo = p.motivo === 'Outro' && p.motivo_outro ? `Outro (${p.motivo_outro})` : p.motivo;
              return (
                <Card key={p.id} className="min-w-0 p-4 glass-card">
                  <div className="flex min-w-0 items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="break-words font-semibold leading-snug">{p.nome_item}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{new Date(p.data_perda).toLocaleString('pt-BR')}</p>
                    </div>
                    <p className="shrink-0 font-semibold text-destructive">{formatBRL(Number(p.custo_total))}</p>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="text-[10px]">{p.tipo === 'produto' ? 'Produto' : 'Receita'}</Badge>
                    <Badge variant="secondary" className="text-[10px]">Qtd: {formatNumber(Number(p.quantidade))}</Badge>
                  </div>

                  <div className="mt-3 grid grid-cols-1 gap-2 border-t border-border/40 pt-3 text-xs min-[400px]:grid-cols-2">
                    <div className="min-w-0">
                      <p className="text-muted-foreground">Motivo</p>
                      <p className="break-words font-medium">{motivo}</p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-muted-foreground">Responsável</p>
                      <p className="break-words font-medium">{p.responsavel || '-'}</p>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          <Card className="hidden overflow-hidden p-0 glass-card md:block">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/30 text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="text-left p-3">Data</th>
                    <th className="text-left p-3">Tipo</th>
                    <th className="text-left p-3">Item</th>
                    <th className="text-right p-3">Qtd</th>
                    <th className="text-left p-3">Motivo</th>
                    <th className="text-left p-3">Responsável</th>
                    <th className="text-right p-3">Custo</th>
                  </tr>
                </thead>
                <tbody>
                  {perdas.length === 0 ? (
                    <tr><td colSpan={7} className="text-center text-muted-foreground p-8">Nenhuma perda no período.</td></tr>
                  ) : perdas.map((p) => (
                    <tr key={p.id} className="border-t border-border/30 hover:bg-muted/20">
                      <td className="p-3 text-xs text-muted-foreground whitespace-nowrap">{new Date(p.data_perda).toLocaleString('pt-BR')}</td>
                      <td className="p-3">
                        <Badge variant="outline" className="text-[10px]">{p.tipo === 'produto' ? 'Produto' : 'Receita'}</Badge>
                      </td>
                      <td className="p-3 font-medium">{p.nome_item}</td>
                      <td className="p-3 text-right">{formatNumber(Number(p.quantidade))}</td>
                      <td className="p-3 text-xs">{p.motivo === 'Outro' && p.motivo_outro ? `Outro (${p.motivo_outro})` : p.motivo}</td>
                      <td className="p-3 text-xs text-muted-foreground">{p.responsavel || '-'}</td>
                      <td className="p-3 text-right font-semibold text-destructive whitespace-nowrap">{formatBRL(Number(p.custo_total))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
