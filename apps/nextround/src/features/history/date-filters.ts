export type DatePreset = 'all' | 'today' | '7days' | '30days' | 'custom';
export type DateFilter =
  | { preset: Exclude<DatePreset, 'custom'> }
  | { preset: 'custom'; start: string; end: string };
export type DateBounds = { start: number; end: number };
export type DateError = { field: 'start' | 'end'; message: string };

function calendarDate(year: number, month: number, day: number): Date {
  const date = new Date(0);
  date.setHours(0, 0, 0, 0);
  date.setFullYear(year, month, day);
  return date;
}
function localDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  if (year < 1) return null;
  const date = calendarDate(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
    ? date
    : null;
}
export function validateDateRange(start: string, end: string): DateError | null {
  const first = localDate(start);
  if (!first) return { field: 'start', message: 'Enter a valid From date.' };
  const last = localDate(end);
  if (!last) return { field: 'end', message: 'Enter a valid Through date.' };
  if (last < first) return { field: 'end', message: 'Through date must be on or after From date.' };
  return null;
}
export function dateBounds(filter: DateFilter, now: number): DateBounds | null {
  if (filter.preset === 'all') return null;
  let start: Date;
  let end: Date;
  if (filter.preset === 'custom') {
    if (validateDateRange(filter.start, filter.end)) throw new Error('Invalid applied date range.');
    start = localDate(filter.start) as Date;
    end = localDate(filter.end) as Date;
  } else {
    const today = new Date(now);
    const days = filter.preset === '7days' ? 6 : filter.preset === '30days' ? 29 : 0;
    start = calendarDate(today.getFullYear(), today.getMonth(), today.getDate() - days);
    end = calendarDate(today.getFullYear(), today.getMonth(), today.getDate());
  }
  // Rebuild at midnight: a skipped midnight may normalize the prior boundary to 01:00.
  end = calendarDate(end.getFullYear(), end.getMonth(), end.getDate() + 1);
  return { start: start.getTime(), end: end.getTime() };
}
export function describeDateFilter(filter: DateFilter, now: number): string {
  const bounds = dateBounds(filter, now);
  if (!bounds) return 'All dates';
  const format = (time: number) => new Date(time).toLocaleDateString();
  return `${format(bounds.start)} – ${format(bounds.end - 1)}`;
}
