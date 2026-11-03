import type { FinancialReport } from '../../supabase/functions/_shared/financialMetrics';
export type { FinancialReport, CurrencyMetrics } from '../../supabase/functions/_shared/financialMetrics';
export interface FinancialAccount {
  label: string;
  account?: { id: string; name: string; country: string };
  financial: FinancialReport | null;
  error?: string;
  balances?: Array<{ currency: string; available: number; pending: number }>;
  recent_charges?: Array<{ id: string; amount: number; currency: string; created: number; customer_email: string | null; status: string }>;
}
export interface StripeDashboardData {
  current: FinancialAccount;
  legacy: FinancialAccount | null;
  legacyEnabled: boolean;
  scopeNote: string;
}
export const financialMoney = (value: number | null, currency: string) => value == null ? 'Indisponível'
  : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: currency.toUpperCase() }).format(value);
