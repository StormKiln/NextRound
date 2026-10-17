import { FAVORITES_KEY, readFavorites } from '../exercises/favorites';
import { type PersonalDocument, parsePersonalDocument } from '../exercises/repository';
import { type HistoryDocument, parseHistoryDocument } from '../history/repository';
import { object, parseTrainingDocument, type TrainingDocument } from '../sessions/model';
import { EQUIPMENT_KEY, readEquipment } from '../settings/equipment-preferences';
import { parseTemplateDocument, type TemplateDocument } from '../templates/repository';
export const preferenceKeys = [FAVORITES_KEY, EQUIPMENT_KEY, 'nextround.preferences.v1'] as const;
export type BackupData = {
  templates: TemplateDocument;
  history: HistoryDocument;
  personal: PersonalDocument;
  training: TrainingDocument;
  window: { version: 1; closeBehavior: 'minimize' | 'quit' };
  preferences: Record<string, string>;
};
export type Backup = {
  format: 'nextround-backup';
  version: 1;
  createdAt: number;
  data: BackupData;
};
export function preferencesFrom(storage: Pick<Storage, 'getItem'>): Record<string, string> {
  const result: Record<string, string> = {};
  for (const key of preferenceKeys) {
    const value = storage.getItem(key);
    if (value !== null) result[key] = value;
  }
  return validatePreferences(result);
}
export function validatePreferences(input: unknown): Record<string, string> {
  const v = object(input);
  if (Object.keys(v).some((k) => !preferenceKeys.includes(k as (typeof preferenceKeys)[number])))
    throw new Error('Unsupported preference in backup.');
  for (const value of Object.values(v))
    if (typeof value !== 'string' || value.length > 1048576)
      throw new Error('Invalid backup preference.');
  const result = v as Record<string, string>;
  const storage = { getItem: (key: string) => result[key] ?? null };
  readFavorites(storage);
  readEquipment(storage);
  if (result['nextround.preferences.v1']) {
    const p = object(JSON.parse(result['nextround.preferences.v1']));
    if (
      typeof p.automatic !== 'boolean' ||
      !(p.dismissed === null || typeof p.dismissed === 'string') ||
      Object.keys(p).some((k) => !['automatic', 'dismissed'].includes(k))
    )
      throw new Error('Invalid update preferences.');
  }
  return structuredClone(result);
}
export function parseData(input: unknown): BackupData {
  const v = object(input);
  if (
    Object.keys(v).some(
      (k) => !['templates', 'history', 'personal', 'training', 'window', 'preferences'].includes(k),
    )
  )
    throw new Error('Unsupported backup data fields.');
  const window = object(v.window);
  if (
    window.version !== 1 ||
    !['minimize', 'quit'].includes(String(window.closeBehavior)) ||
    Object.keys(window).some((k) => !['version', 'closeBehavior'].includes(k))
  )
    throw new Error('Unsupported window preferences.');
  const training = parseTrainingDocument(v.training);
  if (training.recovery)
    throw new Error('Resolve the active or interrupted session before backing up or restoring.');
  return {
    templates: parseTemplateDocument(v.templates),
    history: parseHistoryDocument(v.history),
    personal: parsePersonalDocument(v.personal),
    training,
    window: window as BackupData['window'],
    preferences: validatePreferences(v.preferences),
  };
}
export function createBackup(data: unknown): Backup {
  return { format: 'nextround-backup', version: 1, createdAt: Date.now(), data: parseData(data) };
}
export function parseBackup(raw: string): Backup {
  if (new TextEncoder().encode(raw).length > 32 * 1024 * 1024)
    throw new Error('Backup files must be at most 32 MiB.');
  const v = object(JSON.parse(raw));
  if (
    v.format !== 'nextround-backup' ||
    v.version !== 1 ||
    Object.keys(v).some((k) => !['format', 'version', 'createdAt', 'data'].includes(k)) ||
    typeof v.createdAt !== 'number' ||
    !Number.isSafeInteger(v.createdAt) ||
    v.createdAt <= 0 ||
    v.createdAt > 8640000000000000
  )
    throw new Error('Unsupported backup format, version or date.');
  return {
    format: 'nextround-backup',
    version: 1,
    createdAt: v.createdAt,
    data: parseData(v.data),
  };
}
