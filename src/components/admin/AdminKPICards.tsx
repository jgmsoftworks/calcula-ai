import type { AdminMetrics } from '@/hooks/useAdminDashboardMetrics';
import { AdminFinancialPanel } from './AdminFinancialPanel';
export const AdminKPICards = ({ metrics }: { metrics: AdminMetrics }) =>
  <AdminFinancialPanel data={metrics.financial} error={metrics.financialError} />;
