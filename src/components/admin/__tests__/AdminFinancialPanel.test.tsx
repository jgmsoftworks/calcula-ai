import { cleanup, render, screen, fireEvent } from '@testing-library/react';
import { afterEach, it, expect } from 'vitest';
import { AdminFinancialPanel } from '../AdminFinancialPanel';
import { calculateFinancialMetrics } from '../../../../supabase/functions/_shared/financialMetrics';
afterEach(cleanup);
const report = calculateFinancialMetrics({ now: Date.parse('2026-11-03T12:00:00Z')/1000, subscriptions:[], invoices:[], invoicePayments:[], charges:[], refunds:[], events:[] });
const data = { current: { label:'Atual', financial:report }, legacy:null, legacyEnabled:false, scopeNote:'Conta atual; legado não incluído.' };
it('distinguishes real zeros from unavailable churn/LTV and explains the scope', () => {
  render(<AdminFinancialPanel data={data} />);
  expect(screen.getByText('Conta atual; legado não incluído.')).toBeInTheDocument();
  expect(screen.getAllByText('Indisponível')).toHaveLength(3);
  expect(screen.getByText('MRR adimplente')).toBeInTheDocument();
  expect(screen.getAllByText('R$ 0,00').length).toBeGreaterThan(1);
});
it('does not show stale money when the provider fails', () => {
  render(<AdminFinancialPanel data={data} error="Falha na consulta" />);
  expect(screen.getByRole('alert')).toHaveTextContent('Falha na consulta');
  expect(screen.queryByText('MRR adimplente')).not.toBeInTheDocument();
});
it('shows legacy separately instead of summing distinct customer identities', () => {
  render(<AdminFinancialPanel data={{...data,legacy:{label:'Legada',financial:null,error:'Legado indisponível'}}} />);
  fireEvent.change(screen.getByLabelText('Conta financeira'), { target:{value:'legacy'} });
  expect(screen.getByRole('alert')).toHaveTextContent('Legado indisponível');
  expect(screen.queryByText('MRR adimplente')).not.toBeInTheDocument();
});
