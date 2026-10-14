export const FAVORITES_KEY = 'nextround.exercise-favorites.v1';
type StorageAccess = Pick<Storage, 'getItem' | 'setItem'>;
const invalid =
  'Exercise favourites could not be read or use an unsupported format. Existing data has been preserved.';
function validId(id: unknown): id is string {
  return typeof id === 'string' && id.length <= 120 && /^[A-Za-z0-9][A-Za-z0-9:-]*$/.test(id);
}
export function readFavorites(storage: Pick<Storage, 'getItem'>): string[] {
  const raw = storage.getItem(FAVORITES_KEY);
  if (raw === null) return [];
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    throw Error(invalid);
  }
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    !('version' in value) ||
    !('ids' in value) ||
    Object.keys(value).some((key) => !['version', 'ids'].includes(key)) ||
    value.version !== 1 ||
    !Array.isArray(value.ids) ||
    value.ids.length > 5000 ||
    !value.ids.every(validId) ||
    new Set(value.ids).size !== value.ids.length
  )
    throw Error(invalid);
  return [...value.ids];
}
export function toggleFavorite(storage: StorageAccess, id: string): string[] {
  if (!validId(id)) throw Error('Choose a valid library exercise.');
  const current = readFavorites(storage);
  const ids = current.includes(id) ? current.filter((value) => value !== id) : [...current, id];
  if (ids.length > 5000) throw Error('The exercise favourites limit is 5000.');
  storage.setItem(FAVORITES_KEY, JSON.stringify({ version: 1, ids }));
  return ids;
}
