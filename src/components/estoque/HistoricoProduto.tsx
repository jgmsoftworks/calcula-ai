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
    <Card className="overflow-hidden">
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
                <TableCell className="text-right">{formatters.number(m.quantidade)}</TableCell>
                <TableCell className="text-right">{formatters.currency(m.custo_aplicado || 0)}</TableCell>
                <TableCell className="text-right">{formatters.currency(m.subtotal || 0)}</TableCell>
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
  );
}
