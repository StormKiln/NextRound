import type { WorkoutConfig } from '@nextround/core';
import { expect, it } from 'vitest';
import { matchesTemplate } from './matching';

const base = { leadInSeconds: 10, warningSeconds: 3, exercises: [] };
const modes: [WorkoutConfig, number][] = [
  [{ ...base, minutes: 3 }, 190],
  [{ ...base, type: 'countdown', durationSeconds: 110 }, 120],
  [{ ...base, type: 'amrap', durationSeconds: 110 }, 120],
  [{ ...base, type: 'intervals', workSeconds: 30, restSeconds: 10, rounds: 3 }, 120],
  [{ ...base, type: 'forTime', timeCapSeconds: 110 }, 120],
  [{ ...base, type: 'forTime' }, Infinity],
  [
    {
      ...base,
      type: 'ladder',
      timeCapSeconds: 110,
      ladder: { direction: 'ascending', startReps: 1, increment: 1, rungs: 3 },
    },
    120,
  ],
  [
    {
      ...base,
      type: 'ladder',
      ladder: { direction: 'ascending', startReps: 1, increment: 1, rungs: 3 },
    },
    Infinity,
  ],
];
for (const [config, seconds] of modes) {
  it(`filters ${config.type ?? 'legacy EMOM'} with ${seconds} total seconds including lead-in`, () => {
    const t = { id: 'a', name: 'Session', config };
    const doc = { version: 2 as const, templates: [t], collections: [] };
    const filters = {
      search: '',
      workoutType: 'all',
      favouritesOnly: false,
      collection: 'all',
      budgetMinutes: 2,
    };
    expect(matchesTemplate(t, filters, doc)).toBe(seconds <= 120);
    expect(matchesTemplate(t, { ...filters, budgetMinutes: null }, doc)).toBe(true);
    if (seconds === 120)
      expect(
        matchesTemplate({ ...t, config: { ...config, leadInSeconds: 11 } }, filters, doc),
      ).toBe(false);
  });
}
it('combines budget with search, favourite, collection and type', () => {
  const t = { id: 'a', name: 'Morning', favourite: true, config: modes[1][0] };
  const doc = {
    version: 2 as const,
    templates: [t],
    collections: [{ id: 'c', name: 'Training', workoutIds: ['a'] }],
  };
  const filters = {
    search: 'morning',
    workoutType: 'countdown',
    favouritesOnly: true,
    collection: 'c',
    budgetMinutes: 2,
  };
  expect(matchesTemplate(t, filters, doc)).toBe(true);
  for (const changed of [
    { search: 'evening' },
    { workoutType: 'emom' },
    { collection: 'unfiled' },
    { budgetMinutes: 1 },
  ])
    expect(matchesTemplate(t, { ...filters, ...changed }, doc)).toBe(false);
});

import { budgetTimeLabel, parseBudgetMinutes } from './time-budget';

it('rejects invalid drafts instead of accepting partial numbers', () => {
  for (const input of ['', '0', '-1', '1.5', '2e2', 'two', 'Infinity', '9007199254740991'])
    expect(parseBudgetMinutes(input)).toBeNull();
  expect(parseBudgetMinutes(' 15 ')).toBe(15);
});
it('distinguishes caps and unknown duration from scheduled time', () => {
  expect(budgetTimeLabel(modes[1][0])).toBe('Duration + lead-in: 02:00');
  expect(budgetTimeLabel(modes[4][0])).toBe('Time cap + lead-in: 02:00');
  expect(budgetTimeLabel(modes[5][0])).toBe('No time cap — duration unknown');
});
