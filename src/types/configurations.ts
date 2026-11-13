import type { Tables } from '@/integrations/supabase/types';

export type Markup = Tables<'markups'>;
export type MarkupDetalhado = {
  periodo?: string;
  gastoSobreFaturamento?: number;
  impostos?: number;
  taxas?: number;
  comissoes?: number;
  outros?: number;
  valorEmReal?: number;
  lucroDesejado?: number;
  markupIdeal?: number;
};
export type MarkupBlock = {
  id: string; nome: string; gastoSobreFaturamento: number; impostos: number;
  taxasMeiosPagamento: number; comissoesPlataformas: number; outros: number;
  valorEmReal: number; lucroDesejado: number; periodo: string;
};
export type FaturamentoPersistido = { id: string; valor: number; mes: string };
export type FaturamentoParaSalvar = Omit<FaturamentoPersistido, 'mes'> & { mes: string | Date };
