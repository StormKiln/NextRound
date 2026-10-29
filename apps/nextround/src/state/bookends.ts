import type { EmomConfig, ExerciseEntry } from '@nextround/core';
import { matchesPhase, type Phase } from '@/data/phases';
import { toWorkoutEntry } from '@/features/exercises/library';

export type BookendSetting = { enabled: boolean; minutes: number };
export type BookendSettings = Record<Phase, BookendSetting>;
export const BOOKEND_MINUTES = { min: 1, max: 15, default: 5 } as const;
// Each minute holds one movement for 45 s, leaving 15 s to change position before the next beep.
export const BOOKEND_HOLD_SECONDS = 45;
export const BOOKENDS_STORAGE_KEY = 'nextround.bookends.v1';
export const defaultBookends = (): BookendSettings => ({
  warmup: { enabled: false, minutes: BOOKEND_MINUTES.default },
  cooldown: { enabled: false, minutes: BOOKEND_MINUTES.default },
});

function validMinutes(value: unknown) {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= BOOKEND_MINUTES.min &&
    value <= BOOKEND_MINUTES.max
  );
}
// Preferences are conveniences: anything unreadable falls back to the defaults.
export function parseBookends(value: unknown): BookendSettings {
  const settings = defaultBookends();
  if (!value || typeof value !== 'object') return settings;
  for (const phase of ['warmup', 'cooldown'] as const) {
    const entry = (value as Record<string, unknown>)[phase];
    if (!entry || typeof entry !== 'object') continue;
    const { enabled, minutes } = entry as Record<string, unknown>;
    settings[phase] = {
      enabled: enabled === true,
      minutes: validMinutes(minutes) ? (minutes as number) : BOOKEND_MINUTES.default,
    };
  }
  return settings;
}
export function readBookends(storage: Pick<Storage, 'getItem'>): BookendSettings {
  try {
    const raw = storage.getItem(BOOKENDS_STORAGE_KEY);
    return parseBookends(raw === null ? null : JSON.parse(raw));
  } catch {
    return defaultBookends();
  }
}
export function saveBookends(storage: Pick<Storage, 'setItem'>, settings: BookendSettings) {
  try {
    storage.setItem(BOOKENDS_STORAGE_KEY, JSON.stringify(settings));
  } catch {}
}

export function bookendPool(library: ExerciseEntry[], phase: Phase) {
  return library.filter(
    (entry) =>
      matchesPhase(entry, phase) &&
      (!entry.supportedUnits || entry.supportedUnits.includes('seconds')),
  );
}
// One distinct movement per minute; shorter pools rotate in order like any EMOM.
export function pickBookend(
  library: ExerciseEntry[],
  phase: Phase,
  minutes: number,
  random = Math.random,
): ExerciseEntry[] {
  const pool = [...bookendPool(library, phase)];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, minutes).map((entry) => ({
    ...toWorkoutEntry(entry, 'emom'),
    target: { unit: 'seconds' as const, value: BOOKEND_HOLD_SECONDS },
  }));
}
export function bookendConfig(
  minutes: number,
  exercises: ExerciseEntry[],
  leadInSeconds: number,
): EmomConfig {
  return {
    type: 'emom',
    minutes,
    leadInSeconds,
    warningSeconds: 3,
    exercises: structuredClone(exercises),
  };
}
export function bookendSeconds(settings: BookendSettings) {
  return (['warmup', 'cooldown'] as const).reduce(
    (total, phase) => total + (settings[phase].enabled ? settings[phase].minutes * 60 : 0),
    0,
  );
}
