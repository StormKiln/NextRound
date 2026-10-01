// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createElement as h } from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  read: vi.fn(),
  load: vi.fn(() => true),
  navigate: vi.fn(),
  fullscreen: vi.fn(async () => {}),
}));
vi.mock('./repository', () => ({
  readHistory: mocks.read,
  mutateHistory: vi.fn(),
  copyResult: (v: unknown) => v,
}));
vi.mock('@tanstack/react-router', () => ({ useNavigate: () => mocks.navigate }));
vi.mock('@/native/adapter', () => ({ fullscreen: mocks.fullscreen }));
vi.mock('@/state/workout', () => ({
  useWorkout: { getState: () => ({ loadConfig: mocks.load }) },
}));

import { History } from './index';

const doc = {
  version: 1,
  results: [
    {
      id: 'one',
      completedAt: 1700000000000,
      elapsedMs: 10000,
      checkedExerciseIds: [],
      config: {
        type: 'countdown',
        durationSeconds: 10,
        leadInSeconds: 0,
        warningSeconds: 0,
        exercises: [],
      },
    },
  ],
};
const setup = () =>
  render(
    h(
      QueryClientProvider,
      { client: new QueryClient({ defaultOptions: { queries: { retry: false } } }) },
      h(History),
    ),
  );
beforeEach(() => {
  vi.clearAllMocks();
  mocks.read.mockResolvedValue(doc);
  HTMLDialogElement.prototype.showModal = function () {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function () {
    this.open = false;
  };
});
afterEach(cleanup);
it('identifies the session in each accessible history action', async () => {
  setup();
  expect(
    await screen.findByRole('button', { name: /View result: Countdown, .*session 1/ }),
  ).toBeTruthy();
  expect(
    screen.getByRole('button', { name: /Delete result: Countdown, .*session 1/ }),
  ).toBeTruthy();
});
it('guards duplicate repeat and dismissal until the read finishes', async () => {
  setup();
  fireEvent.click(await screen.findByRole('button', { name: /^View result/ }));
  let resolve!: (v: typeof doc) => void;
  mocks.read.mockReturnValueOnce(
    new Promise((r) => {
      resolve = r;
    }),
  );
  const repeat = screen.getByRole('button', { name: 'Repeat from setup' });
  fireEvent.click(repeat);
  fireEvent.click(repeat);
  expect(mocks.read).toHaveBeenCalledTimes(2);
  expect(
    (screen.getByRole('button', { name: 'Loading workout…' }) as HTMLButtonElement).disabled,
  ).toBe(true);
  fireEvent(screen.getByRole('dialog'), new Event('cancel', { bubbles: true, cancelable: true }));
  expect(screen.getByRole('dialog')).toBeTruthy();
  await act(async () => resolve(doc));
  await waitFor(() => expect(mocks.navigate).toHaveBeenCalledTimes(1));
  expect(mocks.load).toHaveBeenCalledTimes(1);
});
it('does not overwrite setup when a pending read resolves after unmount', async () => {
  const view = setup();
  fireEvent.click(await screen.findByRole('button', { name: /^View result/ }));
  let resolve!: (v: typeof doc) => void;
  mocks.read.mockReturnValueOnce(
    new Promise((r) => {
      resolve = r;
    }),
  );
  fireEvent.click(screen.getByRole('button', { name: 'Repeat from setup' }));
  view.unmount();
  await act(async () => resolve(doc));
  expect(mocks.load).not.toHaveBeenCalled();
  expect(mocks.navigate).not.toHaveBeenCalled();
});
it('makes failed reads retryable without loading a workout', async () => {
  setup();
  fireEvent.click(await screen.findByRole('button', { name: /^View result/ }));
  mocks.read.mockRejectedValueOnce(new Error('Read failed'));
  fireEvent.click(screen.getByRole('button', { name: 'Repeat from setup' }));
  expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'Error: Read failed');
  expect(
    (screen.getByRole('button', { name: 'Repeat from setup' }) as HTMLButtonElement).disabled,
  ).toBe(false);
  expect(mocks.load).not.toHaveBeenCalled();
});

it('does not navigate after unmount during fullscreen exit', async () => {
  const view = setup();
  fireEvent.click(await screen.findByRole('button', { name: /^View result/ }));
  let resolve!: () => void;
  mocks.fullscreen.mockReturnValueOnce(
    new Promise<void>((r) => {
      resolve = r;
    }),
  );
  fireEvent.click(screen.getByRole('button', { name: 'Repeat from setup' }));
  await waitFor(() => expect(mocks.fullscreen).toHaveBeenCalled());
  view.unmount();
  await act(async () => resolve());
  expect(mocks.navigate).not.toHaveBeenCalled();
});
