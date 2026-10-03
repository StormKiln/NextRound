import { expect, it } from 'vitest';
import { exercises } from '@/data/exercises';
import { defaultEmomTarget, rotationNotice } from './emom-defaults';

it('assigns valid exercise-appropriate defaults throughout the catalog without inferring custom reps', () => {
  for (const e of exercises) {
    const target = defaultEmomTarget(e);
    expect(target.value).toBeGreaterThan(0);
    expect(e.supportedUnits).toContain(target.unit);
    if (target.unit === 'seconds') expect(target.value).toBeLessThan(60);
  }
  expect(defaultEmomTarget(exercises[0])).toEqual({ unit: 'reps', value: 10 });
  expect(defaultEmomTarget({ id: 'custom', name: 'Push-up' })).toEqual({
    unit: 'seconds',
    value: 30,
  });
  expect(
    defaultEmomTarget(
      exercises.find((e) => e.id === 'rowing-machine') ?? { id: 'missing', name: 'Missing' },
    ),
  ).toEqual({
    unit: 'seconds',
    value: 30,
  });
});
it('explains uneven slot counts, including movements that will never run', () => {
  const slots = Array.from({ length: 6 }, (_, i) => ({ id: String(i), name: `Move ${i + 1}` }));
  expect(rotationNotice(16, slots)).toContain('first 4');
  expect(rotationNotice(16, slots)).toContain('3 times');
  expect(rotationNotice(15, slots.slice(0, 3))).toBeNull();
  expect(rotationNotice(2, slots)).toContain('Move 3');
  expect(rotationNotice(2, slots)).toContain('will not run');
  expect(rotationNotice(Number.NaN, slots)).toBeNull();
  expect(rotationNotice(15, [])).toBeNull();
});
