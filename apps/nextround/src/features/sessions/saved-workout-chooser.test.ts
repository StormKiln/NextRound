// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createElement as h } from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ read: vi.fn() }));
vi.mock('../templates/repository', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../templates/repository')>()),
  readTemplates: mocks.read,
}));

import { SavedWorkoutChooser } from './saved-workout-chooser';

const data = {
  version: 2,
  collections: [],
  templates: [
    {
      id: 'one',
      name: 'Warm up',
      config: { type: 'countdown', durationSeconds: 30, leadInSeconds: 0, warningSeconds: 0 },
    },
  ],
};
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
it('does not append after cancellation while final validation read is pending', async () => {
  mocks.read.mockResolvedValueOnce(data);
  const add = vi.fn();
  const rendered = render(
    h(SavedWorkoutChooser, { capacity: 20, onAdd: add, onClose: () => rendered.unmount() }),
  );
  fireEvent.click(await screen.findByRole('checkbox', { name: 'Select Warm up' }));
  let finish!: (value: typeof data) => void;
  mocks.read.mockReturnValueOnce(
    new Promise((resolve) => {
      finish = resolve;
    }),
  );
  fireEvent.click(screen.getByRole('button', { name: 'Add selected workouts' }));
  expect(
    screen.getByRole('button', { name: 'Add selected workouts' }).hasAttribute('disabled'),
  ).toBe(true);
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  await act(async () => finish(data));
  expect(add).not.toHaveBeenCalled();
  expect(screen.queryByRole('dialog')).toBeNull();
});
it('recovers from initial read failure only after successful refresh and fresh selection', async () => {
  mocks.read.mockRejectedValueOnce(Error('Unavailable'));
  const add = vi.fn();
  render(h(SavedWorkoutChooser, { capacity: 20, onAdd: add, onClose: vi.fn() }));
  expect((await screen.findByRole('alert')).textContent).toContain('Unavailable');
  expect(
    screen.getByRole('button', { name: 'Add selected workouts' }).hasAttribute('disabled'),
  ).toBe(true);
  mocks.read.mockResolvedValue(data);
  fireEvent.click(screen.getByRole('button', { name: 'Refresh saved workouts' }));
  fireEvent.click(await screen.findByRole('checkbox', { name: 'Select Warm up' }));
  await act(async () =>
    fireEvent.click(screen.getByRole('button', { name: 'Add selected workouts' })),
  );
  expect(add).toHaveBeenCalledTimes(1);
  expect(add.mock.calls[0][0][0].name).toBe('Warm up');
});
