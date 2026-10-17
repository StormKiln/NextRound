import { expect, it, vi } from 'vitest';

const call = vi.hoisted(() => vi.fn());
vi.mock('@tauri-apps/api/core', () => ({ isTauri: () => true, invoke: call }));
it('orders native guard changes so a delayed awake request cannot overtake pause', async () => {
  const { setTrainingGuard } = await import('./adapter');
  let release!: () => void;
  const held = new Promise<void>((r) => {
    release = r;
  });
  call.mockImplementationOnce(() => held).mockResolvedValue(undefined);
  const awake = setTrainingGuard(true, true);
  await Promise.resolve();
  const pause = setTrainingGuard(true, false);
  await Promise.resolve();
  expect(call).toHaveBeenCalledTimes(1);
  release();
  await Promise.all([awake, pause]);
  expect(call).toHaveBeenCalledTimes(2);
  expect(call.mock.calls[1][1]).toMatchObject({ active: true, awake: false });
});
