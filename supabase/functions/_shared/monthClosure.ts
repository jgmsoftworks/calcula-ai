/** Hourly cron: close only during the first local hour of a new month. */
export function dueMonthClosure(now: Date, country: 'BR' | 'PT'): string | null {
  const timeZone = country === 'PT' ? 'Europe/Lisbon' : 'America/Sao_Paulo';
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23',
  }).formatToParts(now);
  const value = (type: string) => Number(parts.find(p => p.type === type)?.value);
  if (value('day') !== 1 || value('hour') !== 0) return null;
  const month = value('month');
  return `${month === 1 ? value('year') - 1 : value('year')}-${String(month === 1 ? 12 : month - 1).padStart(2, '0')}`;
}
