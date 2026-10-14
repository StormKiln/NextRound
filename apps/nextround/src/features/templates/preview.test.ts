// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createElement as h } from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ read: vi.fn() }));
vi.mock('./repository', async (original) => ({
  ...(await original<typeof import('./repository')>()),
  readTemplates: mocks.read,
}));

import { WorkoutPreview } from './preview';

const entry = {
  id: 'one',
  name: 'One',
  config: { type: 'countdown', durationSeconds: 30, leadInSeconds: 0, warningSeconds: 0 },
};
const doc = { version: 1, templates: [entry] };
beforeEach(() => {
  mocks.read.mockReset();
  HTMLDialogElement.prototype.showModal = function () {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function () {
    this.open = false;
  };
});
afterEach(cleanup);
it('a dismissed initial read cannot invoke loading or reopen a preview', async () => {
  let finish!: (value: unknown) => void;
  mocks.read.mockReturnValue(
    new Promise((resolve) => {
      finish = resolve;
    }),
  );
  const onLoad = vi.fn();
  const view = render(h(WorkoutPreview, { id: 'one', onLoad, onClose: () => view.unmount() }));
  fireEvent.click(screen.getByRole('button', { name: 'Close' }));
  await act(async () => {
    finish(doc);
  });
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(onLoad).not.toHaveBeenCalled();
});
it('dismissing an outstanding confirmation read preserves the draft', async () => {
  mocks.read.mockResolvedValueOnce(doc);
  let finish!: (value: unknown) => void;
  mocks.read.mockReturnValueOnce(
    new Promise((resolve) => {
      finish = resolve;
    }),
  );
  const onLoad = vi.fn();
  const view = render(h(WorkoutPreview, { id: 'one', onLoad, onClose: () => view.unmount() }));
  await screen.findByRole('heading', { name: 'One' });
  fireEvent.click(screen.getByRole('button', { name: 'Load workout' }));
  fireEvent.click(screen.getByRole('button', { name: 'Confirm load' }));
  fireEvent.click(screen.getByRole('button', { name: 'Close' }));
  await act(async () => {
    finish(doc);
  });
  expect(onLoad).not.toHaveBeenCalled();
});
it('equivalent record property order does not produce a false conflict', async () => {
  mocks.read.mockResolvedValueOnce(doc).mockResolvedValueOnce({
    version: 1,
    templates: [
      {
        config: { warningSeconds: 0, leadInSeconds: 0, durationSeconds: 30, type: 'countdown' },
        name: 'One',
        id: 'one',
      },
    ],
  });
  const onLoad = vi.fn();
  render(h(WorkoutPreview, { id: 'one', onLoad, onClose: vi.fn() }));
  await screen.findByRole('heading', { name: 'One' });
  fireEvent.click(screen.getByRole('button', { name: 'Load workout' }));
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Confirm load' }));
  });
  expect(onLoad).toHaveBeenCalledOnce();
});
