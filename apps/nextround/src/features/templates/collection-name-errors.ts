import { normalizeSearch } from '@/lib/search';
export function validateImportNames(name: string, names: string[]) {
  const counts = new Map<string, number>();
  for (const value of names) {
    const key = normalizeSearch(value);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return {
    collection:
      !name.trim() || name.trim().length > 80
        ? 'Enter a collection name from 1 to 80 characters.'
        : '',
    workouts: names.map((value) =>
      !value.trim() || value.trim().length > 120
        ? 'Enter a workout name from 1 to 120 characters.'
        : (counts.get(normalizeSearch(value)) ?? 0) > 1
          ? 'Each imported workout needs a distinct name.'
          : '',
    ),
  };
}
