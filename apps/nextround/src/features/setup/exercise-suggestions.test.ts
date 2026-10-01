import type { ExerciseEntry } from '@nextround/core';
import { describe, expect, it } from 'vitest';
import { parseHistoryDocument } from '../history/repository';
import { deriveUsage, matchesExercise, suggestExercises } from './exercise-suggestions';

const library: ExerciseEntry[] = ['A', 'B', 'C', 'D', 'E'].map((name) => ({ id: name, name }));
const result = (id: string, ids: (string | undefined)[]) => ({
  id,
  completedAt: 1000,
  elapsedMs: 10000,
  checkedExerciseIds: [],
  config: {
    type: 'countdown',
    durationSeconds: 10,
    leadInSeconds: 0,
    warningSeconds: 0,
    exercises: ids.map((catalogId, i) => ({
      id: `${i}`,
      name: 'Renamed movement',
      ...(catalogId ? { catalogId } : {}),
    })),
  },
});
describe('exercise usage and suggestions', () => {
  it('retains partial literal matches while accepting aliases', () => {
    expect(matchesExercise({ id: 'p', name: 'Push-up' }, 'push-u')).toBe(true);
  });
  it('counts distinct saved sessions per catalog identity, not entries or names', () => {
    const doc = parseHistoryDocument({
      version: 1,
      results: [result('1', ['A', 'A', undefined]), result('2', ['A', 'B'])],
    });
    const usage = deriveUsage(doc);
    expect(usage.counts.get('A')).toBe(2);
    expect(usage.counts.get('B')).toBe(1);
    expect(usage.unattributedEntries).toBe(1);
    expect(deriveUsage({ ...doc, results: doc.results.slice(1) }).counts.get('A')).toBe(1);
  });
  it('matches deliberate common spellings without changing display identities', () => {
    for (const query of ['pushup', 'pushups', 'push ups', ' PUSH-UP '])
      expect(matchesExercise({ id: 'p', name: 'Push-up' }, query)).toBe(true);
    expect(matchesExercise({ id: 'k', name: 'Kettlebell swing' }, 'kettle bell')).toBe(true);
    expect(matchesExercise({ id: 'p', name: 'Push-up' }, 'pullup')).toBe(false);
  });
  it('ranks favorites, rare and mixed pools deterministically', () => {
    const counts = new Map([
      ['A', 10],
      ['B', 5],
      ['C', 2],
    ]);
    expect(suggestExercises(library, counts, 'favorites').map((e) => e.id)).toEqual([
      'A',
      'B',
      'C',
    ]);
    expect(suggestExercises(library, counts, 'new').map((e) => e.id)).toEqual(['D', 'E', 'C']);
    expect(suggestExercises(library, counts, 'mix').map((e) => e.id)).toEqual(['A', 'D', 'B']);
  });
  it('handles ties and tiny/empty libraries without duplicates', () => {
    expect(suggestExercises([...library].reverse(), new Map(), 'mix').map((e) => e.id)).toEqual([
      'A',
      'B',
      'C',
    ]);
    expect(suggestExercises(library.slice(0, 1), new Map(), 'mix').map((e) => e.id)).toEqual(['A']);
    expect(suggestExercises([], new Map(), 'favorites')).toEqual([]);
    expect(suggestExercises([library[0], library[0]], new Map(), 'new')).toHaveLength(1);
  });
});

it('counts each saved mode once per exercise', () => {
  const base = result('countdown', ['A', 'A']);
  const emom = {
    ...result('emom', ['A']),
    elapsedMs: 120000,
    config: { ...base.config, type: 'emom', minutes: 2 },
  };
  delete (emom.config as { durationSeconds?: number }).durationSeconds;
  const intervals = {
    ...result('intervals', ['A']),
    elapsedMs: 13000,
    config: { ...base.config, type: 'intervals', workSeconds: 5, restSeconds: 3, rounds: 2 },
  };
  delete (intervals.config as { durationSeconds?: number }).durationSeconds;
  expect(
    deriveUsage(parseHistoryDocument({ version: 1, results: [base, emom, intervals] })).counts.get(
      'A',
    ),
  ).toBe(3);
});
