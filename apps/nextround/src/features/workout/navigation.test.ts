import { expect, it, vi } from 'vitest';
import { returnToSetup } from './navigation';

it('returns to setup and reports a rejected native fullscreen request', async () => {
  const navigate = vi.fn();
  const report = vi.fn();
  await returnToSetup(() => Promise.reject(new Error('native unavailable')), navigate, report);
  expect(navigate).toHaveBeenCalledOnce();
  expect(report).toHaveBeenCalledWith(expect.stringContaining('full screen'));
});
