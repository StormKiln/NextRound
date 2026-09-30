import { expect, test } from 'vitest';
import { readPreferences, savePreferences } from './preferences';

test('corrupt or unavailable storage returns safe defaults', () => {
  expect(readPreferences({ getItem: () => '{bad' })).toEqual({ automatic: true, dismissed: null });
  expect(
    readPreferences({
      getItem: () => {
        throw Error('denied');
      },
    }),
  ).toEqual({ automatic: true, dismissed: null });
});
test('valid preferences survive serialization, unknown fields do not', () => {
  let stored = '';
  expect(
    savePreferences(
      {
        setItem: (_key, value) => {
          stored = value;
        },
      },
      { automatic: false, dismissed: '0.3.0' },
    ),
  ).toBe(true);
  expect(readPreferences({ getItem: () => stored })).toEqual({
    automatic: false,
    dismissed: '0.3.0',
  });
  expect(
    savePreferences(
      {
        setItem: () => {
          throw Error('full');
        },
      },
      { automatic: true, dismissed: null },
    ),
  ).toBe(false);
});
