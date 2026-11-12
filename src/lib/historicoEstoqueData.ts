import { fromZonedTime } from 'date-fns-tz';
import { supabase } from '@/integrations/supabase/client';
import { getBusinessRegion } from '@/lib/business-region';
import type { GeladeiraMovimentacao } from '@/lib/geladeiraData';
import type { Tables } from '@/integrations/supabase/types';

type ComprovanteNumero = { comprovantes?: { numero: number } | null };
type MovimentoProduto = Tables<'movimentacoes'> & ComprovanteNumero & { produtos: { nome: string } | null };
type MovimentoGeladeira = GeladeiraMovimentacao & ComprovanteNumero;
export type MovimentoHistorico = (MovimentoProduto & { origem_estoque: 'produto' }) | ReturnType<typeof normalizarMovimentacaoGeladeira>;

export interface FiltrosHistoricoEstoque {
  dataInicio?: string;
  dataFim?: string;
  tipo?: 'entrada' | 'saida';
  produtoId?: string;
  responsavel?: string;
  origemEstoque?: 'produto' | 'geladeira';
  comprovanteId?: string;
}
export function normalizarMovimentacaoGeladeira(row: MovimentoGeladeira) {
  const quantidade = Math.abs(Number(row.quantidade));
  return { ...row, data_hora: row.created_at, produtos: { nome: row.receita_nome },
    produto_id: row.item_id, tipo: Number(row.quantidade) > 0 ? 'entrada' : 'saida', quantidade,
    custo_aplicado: row.custo_unitario, subtotal: row.custo_unitario === null ? null : quantidade * Number(row.custo_unitario),
    origem: 'Geladeira', origem_estoque: 'geladeira' as const, responsavel: row.responsavel || 'Sistema',
    motivo: row.motivo || (row.tipo === 'ajuste' ? 'Ajuste de saldo' : row.tipo === 'entrada' ? 'Entrada na Geladeira' : 'Saída da Geladeira'),
  };
}
// The ledgers stay separate; the stock history and receipts show both sources.
export async function fetchHistoricoEstoque(userId: string, filters: FiltrosHistoricoEstoque = {}) {
  async function fetchSource(fridge: boolean) {
    const rows: MovimentoHistorico[] = [];
    const timeZone = getBusinessRegion().timeZone;
    const inicio = filters.dataInicio ? fromZonedTime(`${filters.dataInicio}T00:00:00`, timeZone).toISOString() : null;
    const fim = filters.dataFim ? fromZonedTime(`${filters.dataFim}T23:59:59.999`, timeZone).toISOString() : null;
    for (let offset = 0; ; offset += 500) {
      let count: number;
      if (fridge) {
        let query = supabase.from('geladeira_movimentacoes').select('*, comprovantes(numero)').neq('quantidade', 0)
          .eq('user_id', userId).order('created_at', { ascending: false }).order('id').range(offset, offset + 499);
        if (inicio) query = query.gte('created_at', inicio);
        if (fim) query = query.lte('created_at', fim);
        if (filters.tipo) query = filters.tipo === 'entrada' ? query.gt('quantidade', 0) : query.lt('quantidade', 0);
        if (filters.produtoId) query = query.eq('item_id', filters.produtoId);
        if (filters.comprovanteId) query = query.eq('comprovante_id', filters.comprovanteId);
        const { data, error } = await query;
        if (error) throw error;
        rows.push(...(data || []).map(normalizarMovimentacaoGeladeira));
        count = data?.length || 0;
      } else {
        let query = supabase.from('movimentacoes').select('*, produtos(nome), comprovantes(numero)')
          .eq('user_id', userId).order('data_hora', { ascending: false }).order('id').range(offset, offset + 499);
        if (inicio) query = query.gte('data_hora', inicio);
        if (fim) query = query.lte('data_hora', fim);
        if (filters.tipo) query = query.eq('tipo', filters.tipo);
        if (filters.produtoId) query = query.eq('produto_id', filters.produtoId);
        if (filters.comprovanteId) query = query.eq('comprovante_id', filters.comprovanteId);
        const { data, error } = await query;
        if (error) throw error;
        rows.push(...(data || []).map(row => ({ ...row, origem_estoque: 'produto' as const })));
        count = data?.length || 0;
      }
      if (count < 500) return rows;
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
