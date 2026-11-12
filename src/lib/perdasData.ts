import { fromZonedTime } from 'date-fns-tz';
import { supabase } from '@/integrations/supabase/client';
import { getBusinessRegion } from './business-region';
import type { Perda } from '@/types/perdas';

export interface FiltrosPerdas {
  tipo?: 'produto' | 'receita';
  // Calendar dates (YYYY-MM-DD) in the business timezone.
  dataInicio?: string;
  dataFim?: string;
}

export async function fetchPerdasData(userId: string, filters: FiltrosPerdas = {}): Promise<Perda[]> {
  const timeZone = getBusinessRegion().timeZone;
  const inicio = filters.dataInicio ? fromZonedTime(`${filters.dataInicio}T00:00:00`, timeZone).toISOString() : null;
  const fim = filters.dataFim ? fromZonedTime(`${filters.dataFim}T23:59:59.999`, timeZone).toISOString() : null;
  const rows: Perda[] = [];
  for (let offset = 0; ; offset += 500) {
    let query = supabase.from('perdas').select('*').eq('user_id', userId)
      .order('data_perda', { ascending: false }).order('id').range(offset, offset + 499);
    if (filters.tipo) query = query.eq('tipo', filters.tipo);
    if (inicio) query = query.gte('data_perda', inicio);
    if (fim) query = query.lte('data_perda', fim);
    const { data, error } = await query;
    if (error) throw error;
    rows.push(...(data as Perda[] || []));
    if (!data || data.length < 500) return rows;
  }
}
