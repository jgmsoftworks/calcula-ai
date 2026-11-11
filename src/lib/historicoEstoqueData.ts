import { fromZonedTime } from 'date-fns-tz';
import { supabase } from '@/integrations/supabase/client';
import { getBusinessRegion } from '@/lib/business-region';
import type { GeladeiraMovimentacao } from '@/lib/geladeiraData';

export interface FiltrosHistoricoEstoque {
  dataInicio?: string;
  dataFim?: string;
  tipo?: 'entrada' | 'saida';
  produtoId?: string;
  responsavel?: string;
  origemEstoque?: 'produto' | 'geladeira';
  comprovanteId?: string;
}
export function normalizarMovimentacaoGeladeira(row: GeladeiraMovimentacao & { comprovantes?: { numero: number } | null }) {
  const quantidade = Math.abs(Number(row.quantidade));
  return { ...row, data_hora: row.created_at, produtos: { nome: row.receita_nome },
    produto_id: row.item_id, tipo: Number(row.quantidade) > 0 ? 'entrada' : 'saida', quantidade,
    custo_aplicado: row.custo_unitario, subtotal: row.custo_unitario === null ? null : quantidade * Number(row.custo_unitario),
    origem: 'Geladeira', origem_estoque: 'geladeira', responsavel: row.responsavel || 'Sistema',
    motivo: row.motivo || (row.tipo === 'ajuste' ? 'Ajuste de saldo' : row.tipo === 'entrada' ? 'Entrada na Geladeira' : 'Saída da Geladeira'),
  };
}
// The ledgers stay separate; the stock history and receipts show both sources.
export async function fetchHistoricoEstoque(userId: string, filters: FiltrosHistoricoEstoque = {}) {
  async function fetchSource(fridge: boolean) {
    const rows = [];
    const dateField = fridge ? 'created_at' : 'data_hora';
    const timeZone = getBusinessRegion().timeZone;
    for (let offset = 0; ; offset += 500) {
      // Both tables have their own typed select. The common filters below apply to both ledgers.
      let query: any = fridge
        ? supabase.from('geladeira_movimentacoes').select('*, comprovantes(numero)').neq('quantidade', 0)
        : supabase.from('movimentacoes').select('*, produtos(nome), comprovantes(numero)');
      query = query.eq('user_id', userId).order(dateField, { ascending: false }).order('id').range(offset, offset + 499);
      if (filters.dataInicio) query = query.gte(dateField, fromZonedTime(`${filters.dataInicio}T00:00:00`, timeZone).toISOString());
      if (filters.dataFim) query = query.lte(dateField, fromZonedTime(`${filters.dataFim}T23:59:59.999`, timeZone).toISOString());
      if (filters.tipo) query = fridge ? (filters.tipo === 'entrada' ? query.gt('quantidade', 0) : query.lt('quantidade', 0)) : query.eq('tipo', filters.tipo);
      if (filters.produtoId) query = query.eq(fridge ? 'item_id' : 'produto_id', filters.produtoId);
      if (filters.comprovanteId) query = query.eq('comprovante_id', filters.comprovanteId);
      const { data, error } = await query;
      if (error) throw error;
      rows.push(...(data || []).map((row: any) => fridge ? normalizarMovimentacaoGeladeira(row) : { ...row, origem_estoque: 'produto' }));
      if (!data || data.length < 500) return rows;
    }
  }
  const [produtos, geladeira] = await Promise.all([
    filters.origemEstoque === 'geladeira' ? [] : fetchSource(false),
    filters.origemEstoque === 'produto' ? [] : fetchSource(true),
  ]);
  return [...produtos, ...geladeira]
    .filter(row => !filters.responsavel || (row.responsavel || '').toLocaleLowerCase().includes(filters.responsavel.toLocaleLowerCase()))
    .sort((a, b) => b.data_hora.localeCompare(a.data_hora) || a.id.localeCompare(b.id));
}
