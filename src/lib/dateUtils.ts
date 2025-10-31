import { format, parseISO } from 'date-fns';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';
import { ptBR } from 'date-fns/locale';

const TIMEZONE = 'America/Sao_Paulo'; // Brasília, Brasil

export const getBrasiliaDate = () => {
  return toZonedTime(new Date(), TIMEZONE);
};

export const formatBrasiliaDate = (date: Date | string, pattern: string = 'dd/MM/yyyy HH:mm') => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  const brasiliaDate = toZonedTime(dateObj, TIMEZONE);
  return format(brasiliaDate, pattern, { locale: ptBR });
};

export const toBrasiliaDateString = (date: Date) => {
  const brasiliaDate = toZonedTime(date, TIMEZONE);
  return format(brasiliaDate, 'yyyy-MM-dd');
};

export const toUTCFromBrasilia = (dateString: string) => {
  // Converte data no formato 'yyyy-MM-dd' de Brasília para UTC
  const [year, month, day] = dateString.split('-').map(Number);
  const brasiliaDate = new Date(year, month - 1, day, 12, 0, 0); // Meio-dia para evitar mudanças de dia
  return fromZonedTime(brasiliaDate, TIMEZONE);
};
