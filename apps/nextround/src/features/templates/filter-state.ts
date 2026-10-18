import { create } from 'zustand';
import type { LibrarySort } from './library-sort';

const defaults = () => ({
  search: '',
  budgetMinutes: null as number | null,
  budgetDraft: '',
  budgetError: '',
  workoutType: 'all',
  favouritesOnly: false,
  collection: 'all',
});
// Session UI only: independent of persistent templates and workout drafts.
export const useTemplateFilters = create<
  ReturnType<typeof defaults> & { sort: LibrarySort; reset: () => void }
>((set) => ({ ...defaults(), sort: 'recent', reset: () => set(defaults()) }));
export function copyName(name: string): string {
  let value = 'Copy of ';
  for (const character of name) {
    if (value.length + character.length > 120) break;
    value += character;
  }
  return value.trimEnd();
}
