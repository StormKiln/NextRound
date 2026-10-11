import { create } from 'zustand';
import type { DateFilter, DatePreset } from './date-filters';
import type { HistoryMode } from './filters';

const defaults = () => ({
  mode: 'all' as HistoryMode,
  search: '',
  date: { preset: 'all' } as DateFilter,
  draftPreset: 'all' as DatePreset,
  start: '',
  end: '',
});
// Session-only UI state: never persisted with workout records or shared with picker filters.
export const useHistoryFilters = create<ReturnType<typeof defaults> & { reset: () => void }>(
  (set) => ({
    ...defaults(),
    reset: () => set(defaults()),
  }),
);
