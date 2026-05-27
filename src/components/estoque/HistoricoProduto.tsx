import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useEstoque } from '@/hooks/useEstoque';
import { formatters } from '@/lib/formatters';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface HistoricoProdutoProps {
  produtoId: string;
}

export function HistoricoProduto({ produtoId }: HistoricoProdutoProps) {
  const { fetchHistoricoProduto } = useEstoque();
  const [movimentacoes, setMovimentacoes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      const data = await fetchHistoricoProduto(produtoId);
      if (mounted) {
        setMovimentacoes(data);
        setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [produtoId]);

  if (loading) {
    return (
      <Card className="p-8 text-center text-muted-foreground">
        Carregando histórico...
      </Card>
    );
  }

  if (movimentacoes.length === 0) {
    return (
      <Card className="p-8 text-center text-muted-foreground">
        Nenhuma movimentação registrada para este produto.
      </Card>
    );
  }

  return (
    <>
      {/* Desktop */}
      <Card className="overflow-hidden hidden md:block">
        <div className="max-h-[400px] overflow-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10">
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Motivo</TableHead>
                <TableHead className="text-right">Qtd</TableHead>
                <TableHead className="text-right">Custo unit.</TableHead>
                <TableHead className="text-right">Subtotal</TableHead>
                <TableHead>Responsável</TableHead>
                <TableHead>Comprovante</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {movimentacoes.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="text-sm">
                    {format(new Date(m.data_hora), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                  </TableCell>
                  <TableCell>
                    <Badge variant={m.tipo === 'entrada' ? 'default' : 'destructive'}>
                      {m.tipo === 'entrada' ? 'Entrada' : 'Saída'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{m.motivo || '-'}</TableCell>
                  <TableCell className="text-right">{formatters.quantidadeContinua(m.quantidade)}</TableCell>
                  <TableCell className="text-right">{formatters.valor(m.custo_aplicado || 0)}</TableCell>
                  <TableCell className="text-right">{formatters.valor(m.subtotal || 0)}</TableCell>
                  <TableCell className="text-sm">{m.responsavel || '-'}</TableCell>
                  <TableCell className="text-sm">
                    {m.comprovantes?.numero ? `#${m.comprovantes.numero}` : '-'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Mobile cards */}
      <div className="md:hidden space-y-2 max-h-[400px] overflow-auto pr-1">
        {movimentacoes.map((m) => (
          <Card key={m.id} className="p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Badge variant={m.tipo === 'entrada' ? 'default' : 'destructive'} className="text-[10px] h-5">
                {m.tipo === 'entrada' ? 'Entrada' : 'Saída'}
              </Badge>
              <span className="text-[11px] text-muted-foreground">
                {format(new Date(m.data_hora), "dd/MM/yy HH:mm", { locale: ptBR })}
              </span>
            </div>
            {m.motivo && <p className="text-xs text-muted-foreground">{m.motivo}</p>}
            <div className="grid grid-cols-3 gap-2 pt-2 border-t text-xs">
              <div>
                <p className="text-muted-foreground">Qtd</p>
                <p className="font-medium">{formatters.quantidadeContinua(m.quantidade)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Custo</p>
                <p className="font-medium">{formatters.valor(m.custo_aplicado || 0)}</p>
              </div>
              <div className="text-right">
                <p className="text-muted-foreground">Subtotal</p>
                <p className="font-semibold text-primary">{formatters.valor(m.subtotal || 0)}</p>
              </div>
            </div>
            {(m.responsavel || m.comprovantes?.numero) && (
              <div className="flex items-center justify-between gap-2 pt-2 border-t text-[11px] text-muted-foreground">
                <span className="truncate">{m.responsavel || '-'}</span>
                {m.comprovantes?.numero && <span>#{m.comprovantes.numero}</span>}
              </div>
            )}
          </Card>
        ))}
      </div>
    </>
  );
}
