import { invoke, isTauri } from '@tauri-apps/api/core';
import { useWorkout } from '@/state/workout';
import { PERSONAL_STORAGE_KEY, readPersonalExercises } from '../exercises/repository';
import { useNoteGuard } from '../history/note-guard';
import { HISTORY_STORAGE_KEY, readHistory } from '../history/repository';
import { useTrainingOwnership } from '../sessions/ownership';
import { readTraining, TRAINING_KEY } from '../sessions/repository';
import { readTemplates, TEMPLATE_STORAGE_KEY } from '../templates/repository';
import { blockRestore } from './gate';
import {
  type Backup,
  type BackupData,
  createBackup,
  parseData,
  preferenceKeys,
  preferencesFrom,
  validatePreferences,
} from './model';

const journalKey = 'nextround.restore-journal.v1';
const rollbackKey = 'nextround.restore-rollback.v1';
function guard() {
  const w = useWorkout.getState();
  if (
    useTrainingOwnership.getState().owned ||
    w.pendingResult ||
    w.busy ||
    (w.snapshot && ['running', 'leadIn'].includes(w.snapshot.phase)) ||
    useNoteGuard.getState().onQuit
  )
    throw new Error(
      'Finish your workout and resolve unsaved results or notes before backup/restore.',
    );
}
export async function exportBackup(): Promise<Backup> {
  guard();
  const preferences = preferencesFrom(localStorage);
  if (isTauri()) return createBackup(await invoke('backup_snapshot', { preferences }));
  const [templates, history, personal, training] = await Promise.all([
    readTemplates(),
    readHistory(),
    readPersonalExercises(),
    readTraining(),
  ]);
  return createBackup({
    templates,
    history,
    personal,
    training,
    window: { version: 1, closeBehavior: 'minimize' },
    preferences,
  });
}
function applyPreferences(preferences: unknown) {
  const valid = validatePreferences(preferences);
  for (const key of preferenceKeys) {
    if (valid[key] !== undefined) localStorage.setItem(key, valid[key]);
    else localStorage.removeItem(key);
  }
}
function applyBrowser(data: BackupData) {
  for (const [key, value] of [
    [TEMPLATE_STORAGE_KEY, data.templates],
    [HISTORY_STORAGE_KEY, data.history],
    [PERSONAL_STORAGE_KEY, data.personal],
    [TRAINING_KEY, data.training],
  ] as const)
    localStorage.setItem(key, JSON.stringify(value));
  applyPreferences(data.preferences);
}
export async function recoverRestore() {
  if (isTauri()) {
    const pending = await invoke<unknown | null>('pending_restore_preferences');
    if (pending !== null) {
      applyPreferences(pending);
      await invoke('acknowledge_restore');
    }
    return;
  }
  const raw = localStorage.getItem(journalKey);
  if (raw === null) return;
  const journal = JSON.parse(raw);
  if (journal.version !== 1 || typeof journal.committed !== 'boolean')
    throw new Error('Unsupported restore journal. Existing data is preserved.');
  applyBrowser(parseData(journal.committed ? journal.next : journal.previous));
  localStorage.removeItem(journalKey);
}
export async function restoreBackup(backup: Backup) {
  guard();
  const next = parseData(backup.data);
  const previous = await exportBackup();
  if (isTauri()) {
    try {
      await invoke('restore_backup', { next, preferences: previous.data.preferences });
      await recoverRestore();
    } catch (error) {
      if (await invoke<boolean>('has_pending_restore').catch(() => true)) blockRestore(error);
      throw error;
    }
  } else {
    localStorage.setItem(rollbackKey, JSON.stringify(previous));
    const journal = { version: 1, committed: false, previous: previous.data, next };
    localStorage.setItem(journalKey, JSON.stringify(journal));
    try {
      applyBrowser(next);
      localStorage.setItem(journalKey, JSON.stringify({ ...journal, committed: true }));
      localStorage.removeItem(journalKey);
    } catch (error) {
      try {
        applyBrowser(previous.data);
        localStorage.removeItem(journalKey);
      } catch {
        blockRestore(error);
        throw new Error(
          `Restore interrupted. Restart NextRound to recover before continuing: ${String(error)}`,
        );
      }
      throw error;
    }
  }
  sessionStorage.removeItem('nextround.screen-reload-drafts.v1');
  location.assign('/');
}
export async function rollbackBackup(): Promise<Backup> {
  guard();
  if (isTauri()) return createBackup(await invoke('read_backup_rollback'));
  const raw = localStorage.getItem(rollbackKey);
  if (!raw) throw new Error('No previous restore copy is available.');
  const value = JSON.parse(raw);
  return createBackup(value.data);
}

export async function commitLibrary(
  expected: Pick<BackupData, 'templates' | 'training'>,
  next: Pick<BackupData, 'templates' | 'training'>,
) {
  return commitDocuments('templates', expected, next);
}

export async function commitHistory(
  expected: Pick<BackupData, 'history' | 'training'>,
  next: Pick<BackupData, 'history' | 'training'>,
) {
  return commitDocuments('history', expected, next);
}

async function commitDocuments<K extends 'templates' | 'history'>(
  key: K,
  expected: Pick<BackupData, K | 'training'>,
  next: Pick<BackupData, K | 'training'>,
) {
  guard();
  const snapshot = (await exportBackup()).data;
  const canonical = (value: unknown): string =>
    JSON.stringify(value, (_key, v) =>
      v && typeof v === 'object' && !Array.isArray(v)
        ? Object.fromEntries(
            Object.keys(v)
              .sort()
              .map((k) => [k, v[k]]),
          )
        : v,
    );
  if (
    canonical(snapshot[key]) !== canonical(expected[key]) ||
    canonical(snapshot.training) !== canonical(expected.training)
  )
    throw new Error('Library changed. Refresh and retry import.');
  const data = parseData({ ...snapshot, ...next });
  if (isTauri()) {
    try {
      await invoke(key === 'templates' ? 'write_library_batch' : 'write_history_batch', {
        expected,
        next: { [key]: data[key], training: data.training },
        preferences: snapshot.preferences,
      });
      await recoverRestore();
    } catch (error) {
      if (await invoke<boolean>('has_pending_restore').catch(() => true)) blockRestore(error);
      throw error;
    }
    return;
  }
  const journal = { version: 1, committed: false, previous: snapshot, next: data };
  localStorage.setItem(journalKey, JSON.stringify(journal));
  try {
    applyBrowser(data);
    localStorage.setItem(journalKey, JSON.stringify({ ...journal, committed: true }));
    localStorage.removeItem(journalKey);
  } catch (e) {
    try {
      await recoverRestore();
    } catch (error) {
      blockRestore(error);
      throw error;
    }
    throw e;
  }
}
