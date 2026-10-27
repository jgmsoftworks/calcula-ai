import { getBusinessRegion } from '@/lib/business-region';
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { ptBR } from 'date-fns/locale';

// Historical function names retained for callers; timestamps use the account timezone.

/**
 * Formata data e hora completa no timezone de Brasília
 * Exemplo: "03/11/2025 14:35"
 */
export function formatDateTimeBrasilia(dateString: string | Date): string {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  const zonedDate = toZonedTime(date, getBusinessRegion().timeZone);
  return format(zonedDate, 'dd/MM/yyyy HH:mm', { locale: ptBR });
}

/**
 * Formata apenas a data no timezone de Brasília
 * Exemplo: "03/11/2025"
 */
export function formatDateBrasilia(dateString: string | Date): string {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  const zonedDate = toZonedTime(date, getBusinessRegion().timeZone);
  return format(zonedDate, 'dd/MM/yyyy', { locale: ptBR });
}

/**
 * Formata apenas o horário no timezone de Brasília
 * Exemplo: "14:35"
 */
export function formatTimeBrasilia(dateString: string | Date): string {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  const zonedDate = toZonedTime(date, getBusinessRegion().timeZone);
  return format(zonedDate, 'HH:mm', { locale: ptBR });
}

/**
 * Formata data e hora com "às" no meio
 * Exemplo: "03/11/2025 às 14:35"
 */
export function formatDateTimeWithLabel(dateString: string | Date): string {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  const zonedDate = toZonedTime(date, getBusinessRegion().timeZone);
  return format(zonedDate, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
}
