import { type ExerciseEntry, validateConfig } from '@nextround/core';
import { expect, it, vi } from 'vitest';

// The description stands in for the phase tag; a "mobility" name prefix marks mobility work.
vi.mock('@/data/phases', () => ({
  matchesPhase: (entry: ExerciseEntry, phase: string) => entry.description === phase,
  isMobility: (entry: ExerciseEntry) => entry.id.startsWith('mobility'),
}));

import {
  BOOKEND_HOLD_SECONDS,
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
    expect(e.target).toEqual({ unit: 'seconds', value: BOOKEND_HOLD_SECONDS.warmup });
    expect(e.id).not.toBe(e.catalogId);
  }
  expect(pickBookend(library, 'warmup', 15)).toHaveLength(3);
  const cooldown = pickBookend(library, 'cooldown', 5);
  expect(cooldown.map((e) => e.catalogId)).toEqual(['pose']);
  expect(cooldown[0].target).toEqual({ unit: 'seconds', value: BOOKEND_HOLD_SECONDS.cooldown });
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

it('holds cool-down stretches longer than warm-up efforts, inside the minute', () => {
  expect(BOOKEND_HOLD_SECONDS).toEqual({ warmup: 45, cooldown: 50 });
});

const ramp = [
  ...['mobility-a', 'mobility-b', 'mobility-c', 'mobility-d'].map((id) => entry(id, 'warmup')),
  ...['jacks', 'squats', 'shuffle', 'lunges', 'kicks', 'bridges'].map((id) => entry(id, 'warmup')),
];
const isMobilityId = (id?: string) => !!id?.startsWith('mobility');

it('opens a warm-up with about a third mobility, then active movement', () => {
  for (const [minutes, opening] of [
    [1, 1],
    [3, 1],
    [5, 2],
    [6, 2],
    [9, 3],
  ] as const) {
    const ids = pickBookend(ramp, 'warmup', minutes).map((e) => e.catalogId);
    expect(ids).toHaveLength(minutes);
    expect(ids.slice(0, opening).every(isMobilityId), `${minutes}: ${ids}`).toBe(true);
    expect(ids.slice(opening).some(isMobilityId), `${minutes}: ${ids}`).toBe(false);
  }
});

it('fills a warm-up from the other group when one runs short', () => {
  // Six active movements cannot fill ten minutes, so mobility covers the rest up front.
  const ten = pickBookend(ramp, 'warmup', 10).map((e) => e.catalogId);
  expect(ten.slice(0, 4).every(isMobilityId)).toBe(true);
  expect(ten.slice(4).some(isMobilityId)).toBe(false);
  // Without mobility the warm-up is all active; without active work it is all mobility.
  const active = ramp.filter((e) => !isMobilityId(e.id));
  expect(pickBookend(active, 'warmup', 4)).toHaveLength(4);
  const mobility = ramp.filter((e) => isMobilityId(e.id));
  expect(
    pickBookend(mobility, 'warmup', 3)
      .map((e) => e.catalogId)
      .every(isMobilityId),
  ).toBe(true);
  expect(pickBookend(mobility, 'warmup', 3)).toHaveLength(3);
});

it('does not reorder cool-downs by training type', () => {
  const stretches = ['mobility-x', 'deep', 'mobility-y'].map((id) => entry(id, 'cooldown'));
  expect(pickBookend(stretches, 'cooldown', 3, () => 0.99).map((e) => e.catalogId)).toEqual([
    'mobility-x',
    'deep',
    'mobility-y',
  ]);
});
