export type Preferences = { automatic: boolean; dismissed: string | null };
const key = 'nextround.preferences.v1';
export function readPreferences(storage: Pick<Storage, 'getItem'>): Preferences {
  try {
    const value = JSON.parse(storage.getItem(key) ?? '{}');
    return {
      automatic: typeof value?.automatic === 'boolean' ? value.automatic : true,
      dismissed: typeof value?.dismissed === 'string' ? value.dismissed : null,
    };
  } catch {
    return { automatic: true, dismissed: null };
  }
}
export function savePreferences(storage: Pick<Storage, 'setItem'>, preferences: Preferences) {
  try {
    storage.setItem(key, JSON.stringify(preferences));
    return true;
  } catch {
    return false;
  }
}
