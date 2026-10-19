import { expect, it } from 'vitest';
import { result220 } from '../../../../../tests/fixtures/training-220';
import { applyReplacements, previewReplacements, sessionOccurrences } from './exercise-replacement';

const replacement = {
  id: 'squat',
  name: 'Air squat',
  supportedUnits: ['reps', 'seconds'] as ('reps' | 'seconds')[],
};
function session() {
  const s = result220().session;
  s.blocks.push({ ...structuredClone(s.blocks[0]), id: 'second' });
  return s;
}
it('groups catalog identities but isolates same-name custom occurrences', () => {
  const s = session();
  expect(sessionOccurrences(s).map((o) => o.identity)).toEqual([
    'catalog:pushup',
    'catalog:pushup',
  ]);
  for (const b of s.blocks) delete b.config.exercises![0].catalogId;
  const rows = sessionOccurrences(s);
  expect(rows[0].identity).not.toBe(rows[1].identity);
  expect(rows[0].key).not.toBe(rows[1].key);
});
it('replaces only reviewed occurrences without altering source, timing or slot IDs', () => {
  const s = session();
  const before = structuredClone(s);
  const keys = [sessionOccurrences(s)[1].key];
  const changes = previewReplacements(s, keys, replacement);
  const updated = applyReplacements(s, s, changes);
  expect(s).toEqual(before);
  expect(updated.blocks[0]).toEqual(s.blocks[0]);
  expect(updated.blocks[1].config.exercises![0]).toMatchObject({
    id: 'exercise-a',
    catalogId: 'squat',
    target: { unit: 'reps', value: 8 },
  });
  expect(updated.blocks[1].restSeconds).toBe(s.blocks[1].restSeconds);
  expect(updated.blocks[1].config).toMatchObject({
    durationSeconds: 30,
    leadInSeconds: 0,
    warningSeconds: 3,
  });
});
it('requires current draft and a nonempty unique selection', () => {
  const s = session();
  const key = sessionOccurrences(s)[0].key;
  expect(() => previewReplacements(s, [], replacement)).toThrow();
  expect(() => previewReplacements(s, [key, key], replacement)).toThrow();
  expect(() => previewReplacements(s, ['missing'], replacement)).toThrow();
  const changes = previewReplacements(s, [key], replacement);
  expect(() => applyReplacements(s, { ...s, name: 'Changed' }, changes)).toThrow(/changed/);
  changes[0].entry.target = { unit: 'metres', value: 500 };
  expect(() => applyReplacements(s, s, changes)).toThrow();
});
it('reviews incompatible targets and preserves ladder scheduling', () => {
  const s = session();
  const key = sessionOccurrences(s)[0].key;
  const row = {
    id: 'rowing',
    name: 'Rowing',
    supportedUnits: ['metres', 'calories', 'seconds'] as ('metres' | 'calories' | 'seconds')[],
  };
  const changes = previewReplacements(s, [key], row);
  expect(changes[0].entry.target?.unit).not.toBe('reps');
  expect(changes[0].notice).toContain('changed');
  s.blocks[0].config = {
    type: 'ladder',
    ladder: { direction: 'ascending', startReps: 2, increment: 2, rungs: 3 },
    leadInSeconds: 0,
    warningSeconds: 0,
    exercises: s.blocks[0].config.exercises!,
  };
  expect(() => previewReplacements(s, [key], row)).toThrow(/reps/);
  expect(previewReplacements(s, [key], replacement)[0].entry.target).toBeUndefined();
});
it('preserves all six workout schedules while replacing repeated slots independently', () => {
  const s = session();
  const common = {
    leadInSeconds: 5,
    warningSeconds: 3,
    exercises: [
      {
        id: 'one',
        catalogId: 'pushup',
        name: 'Push-up',
        supportedUnits: ['reps', 'seconds'] as ('reps' | 'seconds')[],
        target: { unit: 'reps' as const, value: 8 },
      },
    ],
  };
  const configs: import('@nextround/core').WorkoutConfig[] = [
    { ...common, type: 'emom', minutes: 3 },
    { ...common, type: 'countdown', durationSeconds: 90 },
    { ...common, type: 'intervals', workSeconds: 30, restSeconds: 10, rounds: 3 },
    { ...common, type: 'amrap', durationSeconds: 90 },
    { ...common, type: 'forTime', timeCapSeconds: 90 },
    {
      ...common,
      type: 'ladder',
      ladder: { direction: 'pyramid', startReps: 2, increment: 2, rungs: 3 },
      exercises: [{ ...common.exercises[0], target: undefined }],
    },
  ];
  s.blocks = configs.map((config, i) => ({
    id: String(i),
    name: `Block ${i}`,
    config,
    restSeconds: 20,
    advance: 'ready',
  }));
  s.blocks[0].config.exercises!.push({ ...common.exercises[0], id: 'two' });
  const before = structuredClone(s);
  const all = sessionOccurrences(s);
  const changes = previewReplacements(
    s,
    all.filter((r) => r.entry.id !== 'two').map((r) => r.key),
    replacement,
  );
  const updated = applyReplacements(s, s, changes);
  expect(s).toEqual(before);
  for (let i = 0; i < 6; i++) {
    const { exercises: _e, ...timing } = updated.blocks[i].config;
    const { exercises: _old, ...oldTiming } = before.blocks[i].config;
    expect(timing).toEqual(oldTiming);
    expect(updated.blocks[i].config.exercises![0].catalogId).toBe('squat');
    expect(updated.blocks[i].restSeconds).toBe(20);
    expect(updated.blocks[i].advance).toBe('ready');
  }
  expect(updated.blocks[0].config.exercises![1].catalogId).toBe('pushup');
});
