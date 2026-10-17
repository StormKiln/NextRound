import { expect, it } from 'vitest';
import { emptyTraining } from '../sessions/model';
import { createBackup, parseBackup } from './model';

const dataset = {
  templates: { version: 2, templates: [], collections: [] },
  history: { version: 1, results: [] },
  personal: { version: 1, exercises: [] },
  training: emptyTraining(),
  window: { version: 1, closeBehavior: 'minimize' },
  preferences: {},
};
it('round trips the whole empty inventory and preserves zero-results state', () => {
  const backup = createBackup(dataset);
  expect(parseBackup(JSON.stringify(backup)).data).toEqual(dataset);
});
it('rejects a future version and inconsistent collections before restore', () => {
  const backup = createBackup(dataset);
  expect(() => parseBackup(JSON.stringify({ ...backup, version: 99 }))).toThrow();
  backup.data.templates.collections.push({ id: 'c', name: 'Bad', workoutIds: ['missing'] });
  expect(() => parseBackup(JSON.stringify(backup))).toThrow();
});
it('does not silently back up an unresolved training session as completed', () => {
  expect(() =>
    createBackup({ ...dataset, training: { ...emptyTraining(), recovery: { id: 'unfinished' } } }),
  ).toThrow();
});
