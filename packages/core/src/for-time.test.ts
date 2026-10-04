import { expect, it } from 'vitest';
import { cueAt, type ForTimeConfig, formatElapsed, snapshotAt, validateConfig } from './index';

const config: ForTimeConfig = { type: 'forTime', leadInSeconds: 2, warningSeconds: 3 };
it('runs uncapped beyond an hour without counting lead-in or inventing round cues', () => {
  expect(validateConfig(config)).toEqual({});
  expect(snapshotAt(config, 1000)).toMatchObject({
    phase: 'leadIn',
    elapsedMs: 0,
    roundRemainingMs: 1000,
  });
  expect(snapshotAt(config, 7202500)).toMatchObject({
    phase: 'running',
    elapsedMs: 7200500,
    remainingMs: 0,
  });
  expect([
    cueAt(config, 0),
    cueAt(config, 2000),
    cueAt(config, 62000),
    cueAt(config, 7202500),
  ]).toEqual(['tock', 'beep', null, null]);
  expect(formatElapsed(59999)).toBe('00:59');
  expect(formatElapsed(3600500)).toBe('1:00:00');
});
it('caps active elapsed precisely and records a distinct outcome', () => {
  const capped = { ...config, timeCapSeconds: 5 };
  expect(snapshotAt(capped, 6000)).toMatchObject({
    phase: 'running',
    elapsedMs: 4000,
    remainingMs: 1000,
  });
  expect(snapshotAt(capped, 8000)).toMatchObject({
    phase: 'completed',
    elapsedMs: 5000,
    outcome: 'timeCapReached',
  });
  expect(cueAt(capped, 6000)).toBe('tock');
  expect(cueAt(capped, 7000)).toBe('complete');
  expect(cueAt(capped, 8000)).toBe(null);
  for (const timeCapSeconds of [0, -1, 1.5, 86401, NaN])
    expect(validateConfig({ ...config, timeCapSeconds }).timeCapSeconds).toBeTruthy();
});
