import { afterEach, expect, it } from 'vitest';
import { dateBounds, validateDateRange } from './date-filters';

const originalTZ = process.env.TZ;
afterEach(() => {
  process.env.TZ = originalTZ;
});
const local = (y: number, m: number, d: number, hour = 0) => new Date(y, m - 1, d, hour).getTime();
it('uses inclusive calendar days and next-day exclusive bounds across DST', () => {
  process.env.TZ = 'America/Toronto';
  const spring = dateBounds({ preset: 'today' }, local(2026, 3, 8, 12));
  expect(spring).toEqual({ start: local(2026, 3, 8), end: local(2026, 3, 9) });
  if (!spring) throw new Error('Expected today bounds');
  expect(spring.end - spring.start).toBe(23 * 3600000);
  const fall = dateBounds({ preset: 'today' }, local(2026, 11, 1, 12));
  if (!fall) throw new Error('Expected today bounds');
  expect(fall.end - fall.start).toBe(25 * 3600000);
  expect(dateBounds({ preset: '7days' }, local(2026, 3, 8, 12))).toEqual({
    start: local(2026, 3, 2),
    end: local(2026, 3, 9),
  });
  expect(dateBounds({ preset: '30days' }, local(2026, 3, 8, 12))).toEqual({
    start: local(2026, 2, 7),
    end: local(2026, 3, 9),
  });
});
it('validates real dates and preserves leap days and inclusive custom endpoints', () => {
  process.env.TZ = 'America/Toronto';
  expect(validateDateRange('', '2026-01-01')?.field).toBe('start');
  expect(validateDateRange('2026-01-01', '')?.field).toBe('end');
  expect(validateDateRange('2026-02-29', '2026-03-01')?.field).toBe('start');
  expect(validateDateRange('2028-02-29', '2028-03-01')).toBeNull();
  expect(validateDateRange('2026-10-12', '2026-10-11')?.field).toBe('end');
  expect(dateBounds({ preset: 'custom', start: '2028-02-29', end: '2028-02-29' }, 0)).toEqual({
    start: local(2028, 2, 29),
    end: local(2028, 3, 1),
  });
  expect(dateBounds({ preset: 'all' }, 0)).toBeNull();
});
it('recomputes presets at midnight and under a changed local time zone', () => {
  process.env.TZ = 'America/Toronto';
  expect(dateBounds({ preset: 'today' }, local(2026, 10, 12))).toEqual({
    start: local(2026, 10, 12),
    end: local(2026, 10, 13),
  });
  const now = Date.UTC(2026, 9, 12, 2);
  const toronto = dateBounds({ preset: 'today' }, now);
  process.env.TZ = 'Asia/Tokyo';
  expect(dateBounds({ preset: 'today' }, now)).not.toEqual(toronto);
});

it('constructs each calendar boundary independently when a DST transition skips midnight', () => {
  process.env.TZ = 'America/Santiago';
  const now = local(2026, 9, 6, 12);
  expect(dateBounds({ preset: 'today' }, now)).toEqual({
    start: local(2026, 9, 6),
    end: local(2026, 9, 7),
  });
  expect(dateBounds({ preset: '7days' }, now)).toEqual({
    start: local(2026, 8, 31),
    end: local(2026, 9, 7),
  });
  expect(dateBounds({ preset: 'custom', start: '2026-09-06', end: '2026-09-06' }, now)).toEqual({
    start: local(2026, 9, 6),
    end: local(2026, 9, 7),
  });
});
