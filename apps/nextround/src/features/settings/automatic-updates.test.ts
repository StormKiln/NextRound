import { afterEach, expect, test, vi } from 'vitest';
import { scheduleAutomaticUpdates } from './automatic-updates';

afterEach(() => vi.useRealTimers());
test('checks on launch, focus, reconnect, visibility and every fifteen minutes, then cleans up', () => {
  vi.useFakeTimers();
  const window = new EventTarget();
  const document = new EventTarget();
  let visible = true;
  let checks = 0;
  const stop = scheduleAutomaticUpdates(() => checks++, {
    window,
    document,
    visible: () => visible,
  });
  expect(checks).toBe(1);
  window.dispatchEvent(new Event('focus'));
  window.dispatchEvent(new Event('online'));
  expect(checks).toBe(3);
  visible = false;
  document.dispatchEvent(new Event('visibilitychange'));
  vi.advanceTimersByTime(15 * 60_000);
  expect(checks).toBe(3);
  visible = true;
  document.dispatchEvent(new Event('visibilitychange'));
  vi.advanceTimersByTime(15 * 60_000);
  expect(checks).toBe(5);
  stop();
  window.dispatchEvent(new Event('focus'));
  window.dispatchEvent(new Event('online'));
  document.dispatchEvent(new Event('visibilitychange'));
  vi.advanceTimersByTime(30 * 60_000);
  expect(checks).toBe(5);
});
