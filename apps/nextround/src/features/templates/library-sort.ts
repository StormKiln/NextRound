export type LibrarySort = 'recent' | 'name' | 'duration';
/** Both stores append new records. Never rewrite storage order to sort a view. */
export function sortLibrary<T extends { id: string; name: string }>(
  items: T[],
  sort: LibrarySort,
  seconds: (item: T) => number | null,
): T[] {
  if (sort === 'recent') return [...items].reverse();
  return [...items].sort((a, b) => {
    if (sort === 'name')
      return a.name.localeCompare(b.name, undefined, { sensitivity: 'base', numeric: true });
    const left = seconds(a);
    const right = seconds(b);
    const x = left !== null && Number.isFinite(left) ? left : Infinity;
    const y = right !== null && Number.isFinite(right) ? right : Infinity;
    return x === y ? 0 : x < y ? -1 : 1;
  });
}
