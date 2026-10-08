import { expect, it } from 'vitest';
import { filterHistory } from './filters';
import type { WorkoutResult } from './repository';

it('combines modes and normalized snapshot search without mutating stored order or IDs', () => {
  const modes = [undefined, 'countdown', 'intervals', 'amrap', 'forTime', 'ladder'] as const;
  const results = modes.map((type, index) => ({
    id: String(index),
    completedAt: index + 1,
    config: { type, exercises: [{ id: 'a', name: 'Café Squat', description: '  Slow   tempo ' }] },
  })) as WorkoutResult[];
  expect(filterHistory(results, 'all', ' CAFÉ   squat ').map((r) => r.id)).toEqual([
    '5',
    '4',
    '3',
    '2',
    '1',
    '0',
  ]);
  expect(filterHistory(results, 'emom', 'slow tempo').map((r) => r.id)).toEqual(['0']);
  for (const [index, mode] of modes.entries())
    expect(filterHistory(results, mode ?? 'emom', '').map((r) => r.id)).toEqual([String(index)]);
  expect(filterHistory(results, 'ladder', 'cafe\u0301')).toHaveLength(1);
  expect(filterHistory(results, 'all', 'missing')).toEqual([]);
  expect(results.map((r) => r.id)).toEqual(['0', '1', '2', '3', '4', '5']);
});

it('finds picker spelling aliases in historical snapshots and retains description searches', () => {
  const results = [
    {
      id: 'a',
      completedAt: 1,
      config: {
        minutes: 1,
        exercises: [{ id: 'old', catalogId: 'pushup', name: 'Push-up', description: 'Slow tempo' }],
      },
    },
  ] as WorkoutResult[];
  expect(filterHistory(results, 'all', 'pushups')).toHaveLength(1);
  expect(filterHistory(results, 'emom', 'slow tempo')).toHaveLength(1);
  expect(filterHistory(results, 'ladder', 'pushups')).toHaveLength(0);
});
