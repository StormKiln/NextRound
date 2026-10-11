import { beforeEach, expect, it, vi } from 'vitest';

const mocked = vi.hoisted(() => ({ invoke: vi.fn(), isTauri: vi.fn(() => true) }));
vi.mock('@tauri-apps/api/core', () => mocked);

import { setNativeNoteGuard } from './note-guard';

beforeEach(() => {
  vi.clearAllMocks();
});
it('serializes guard transitions and recovers after a failed command', async () => {
  let finish!: () => void;
  mocked.invoke.mockImplementationOnce(
    () =>
      new Promise<void>((resolve) => {
        finish = resolve;
      }),
  );
  const start = setNativeNoteGuard(true);
  const stop = setNativeNoteGuard(false);
  await Promise.resolve();
  expect(mocked.invoke).toHaveBeenCalledTimes(1);
  finish();
  await start;
  await stop;
  expect(mocked.invoke).toHaveBeenNthCalledWith(2, 'set_history_note_editing', { editing: false });
  mocked.invoke.mockRejectedValueOnce(new Error('Update busy'));
  await expect(setNativeNoteGuard(true)).rejects.toThrow('Update busy');
  await setNativeNoteGuard(false);
  expect(mocked.invoke).toHaveBeenCalledTimes(4);
});
