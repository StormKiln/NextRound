import { create } from 'zustand';

const defaults = () => ({ search: '', workoutType: 'all', favouritesOnly: false });
// Session UI only: independent of persistent templates and workout drafts.
export const useTemplateFilters = create<ReturnType<typeof defaults> & { reset: () => void }>(
  (set) => ({ ...defaults(), reset: () => set(defaults()) }),
);
export function copyName(name: string): string {
  let value = 'Copy of ';
  for (const character of name) {
    if (value.length + character.length > 120) break;
    value += character;
  }
  return value.trimEnd();
}
