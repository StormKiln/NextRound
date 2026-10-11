import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  type DateError,
  type DatePreset,
  describeDateFilter,
  validateDateRange,
} from './date-filters';
import { useHistoryFilters } from './filter-state';

export function useCalendarNow() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const update = () => setNow(Date.now());
    const timer = window.setInterval(update, 30000);
    window.addEventListener('focus', update);
    window.addEventListener('pageshow', update);
    document.addEventListener('visibilitychange', update);
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', update);
      window.removeEventListener('pageshow', update);
      document.removeEventListener('visibilitychange', update);
    };
  }, []);
  return now;
}
export function DateControls({ now }: { now: number }) {
  const { date, draftPreset, start, end } = useHistoryFilters();
  const [error, setError] = useState<DateError | null>(null);
  const startRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLInputElement>(null);
  const pending =
    draftPreset === 'custom' &&
    (date.preset !== 'custom' || date.start !== start || date.end !== end);
  useEffect(() => {
    if (draftPreset !== 'custom') setError(null);
  }, [draftPreset]);
  return (
    <div className="history-dates">
      <div>
        <label htmlFor="history-dates">Date range</label>
        <select
          id="history-dates"
          value={draftPreset}
          onChange={(e) => {
            const preset = e.target.value as DatePreset;
            useHistoryFilters.setState({
              draftPreset: preset,
              ...(preset !== 'custom' ? { date: { preset } } : {}),
            });
            setError(null);
          }}
        >
          <option value="all">All dates</option>
          <option value="today">Today</option>
          <option value="7days">Last 7 days</option>
          <option value="30days">Last 30 days</option>
          <option value="custom">Custom range</option>
        </select>
      </div>
      {draftPreset === 'custom' && (
        <form
          className="history-date-inputs"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            const invalid = validateDateRange(start, end);
            setError(invalid);
            if (invalid) {
              (invalid.field === 'start' ? startRef : endRef).current?.focus();
              return;
            }
            useHistoryFilters.setState({ date: { preset: 'custom', start, end } });
          }}
        >
          <div>
            <label htmlFor="history-from">From date</label>
            <input
              ref={startRef}
              id="history-from"
              type="date"
              min="0001-01-01"
              max="9999-12-31"
              value={start}
              aria-invalid={error?.field === 'start'}
              aria-describedby={error?.field === 'start' ? 'history-date-error' : undefined}
              onChange={(e) => {
                useHistoryFilters.setState({ start: e.target.value });
                setError(null);
              }}
            />
          </div>
          <div>
            <label htmlFor="history-through">Through date</label>
            <input
              ref={endRef}
              id="history-through"
              type="date"
              min="0001-01-01"
              max="9999-12-31"
              value={end}
              aria-invalid={error?.field === 'end'}
              aria-describedby={error?.field === 'end' ? 'history-date-error' : undefined}
              onChange={(e) => {
                useHistoryFilters.setState({ end: e.target.value });
                setError(null);
              }}
            />
          </div>
          <Button type="submit" variant="secondary">
            Apply dates
          </Button>
          {error && (
            <p id="history-date-error" role="alert">
              {error.message}
            </p>
          )}
        </form>
      )}
      <p className="hint">
        Applied dates: {describeDateFilter(date, now)} (local time).
        {pending && ' Custom dates are not applied yet.'}
      </p>
    </div>
  );
}
