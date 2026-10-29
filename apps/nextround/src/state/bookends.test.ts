import { type ExerciseEntry, validateConfig } from '@nextround/core';
import { expect, it, vi } from 'vitest';

vi.mock('@/data/phases', () => ({
  matchesPhase: (entry: ExerciseEntry, phase: string) => entry.description === phase,
}));

import {
  BOOKENDS_STORAGE_KEY,
  bookendConfig,
  bookendSeconds,
  defaultBookends,
  parseBookends,
  pickBookend,
  readBookends,
  saveBookends,
} from './bookends';

const entry = (id: string, description: string, units?: ExerciseEntry['supportedUnits']) => ({
  id,
  name: id,
  description,
  ...(units ? { supportedUnits: units } : {}),
});
const library = [
  entry('circles', 'warmup', ['seconds']),
  entry('swings', 'warmup', ['reps', 'seconds']),
  entry('reps-only', 'warmup', ['reps']),
  entry('hips', 'warmup'),
  entry('pose', 'cooldown', ['seconds']),
];

it('defaults both options off at five minutes and tolerates unreadable preferences', () => {
  expect(defaultBookends()).toEqual({
    warmup: { enabled: false, minutes: 5 },
    cooldown: { enabled: false, minutes: 5 },
  });
  expect(parseBookends({ warmup: { enabled: true, minutes: 0 }, cooldown: 'x' })).toEqual({
    warmup: { enabled: true, minutes: 5 },
    cooldown: { enabled: false, minutes: 5 },
  });
  expect(parseBookends({ warmup: { enabled: 'yes', minutes: 15 } }).warmup).toEqual({
    enabled: false,
    minutes: 15,
  });
  expect(parseBookends({ cooldown: { enabled: true, minutes: 16 } }).cooldown.minutes).toBe(5);
  expect(readBookends({ getItem: () => '{not json' })).toEqual(defaultBookends());
  expect(
    readBookends({
      getItem: () => {
        throw new Error('blocked');
      },
    }),
  ).toEqual(defaultBookends());
});

it('round-trips preferences through storage', () => {
  const store = new Map<string, string>();
  const settings = { ...defaultBookends(), cooldown: { enabled: true, minutes: 12 } };
  saveBookends({ setItem: (key, value) => store.set(key, value) }, settings);
  expect(readBookends({ getItem: (key) => store.get(key) ?? null })).toEqual(settings);
  expect([...store.keys()]).toEqual([BOOKENDS_STORAGE_KEY]);
  expect(() =>
    saveBookends(
      {
        setItem: () => {
          throw new Error('full');
        },
      },
      settings,
    ),
  ).not.toThrow();
});

it('picks one distinct timed movement per minute from the phase pool', () => {
  const picked = pickBookend(library, 'warmup', 2, () => 0);
  expect(picked).toHaveLength(2);
  expect(new Set(picked.map((e) => e.catalogId)).size).toBe(2);
  for (const e of picked) {
    expect(['circles', 'swings', 'hips']).toContain(e.catalogId);
    expect(e.target).toEqual({ unit: 'seconds', value: 45 });
    expect(e.id).not.toBe(e.catalogId);
  }
  expect(pickBookend(library, 'warmup', 15)).toHaveLength(3);
  expect(pickBookend(library, 'cooldown', 5).map((e) => e.catalogId)).toEqual(['pose']);
  expect(pickBookend([], 'cooldown', 5)).toEqual([]);
});

it('builds a valid one-movement-per-minute config and totals enabled time', () => {
  const exercises = pickBookend(library, 'warmup', 3);
  const config = bookendConfig(5, exercises, 10);
  expect(validateConfig(config)).toEqual({});
  expect(config).toMatchObject({ type: 'emom', minutes: 5, leadInSeconds: 10 });
  config.exercises[0].name = 'changed';
  expect(exercises[0].name).not.toBe('changed');
  expect(bookendSeconds(defaultBookends())).toBe(0);
  expect(
    bookendSeconds({
      warmup: { enabled: true, minutes: 5 },
      cooldown: { enabled: true, minutes: 3 },
    }),
  ).toBe(480);
});
