// @vitest-environment jsdom
import type { WorkoutConfig } from '@nextround/core';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createElement as h } from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { result220 } from '../../../../../tests/fixtures/training-220';
import { readTemplates } from '../templates/repository';
import { SaveBlockDialog } from './save-block-dialog';

beforeEach(() => {
  localStorage.clear();
  HTMLDialogElement.prototype.showModal = function () {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function () {
    this.open = false;
  };
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
function setup(validateCurrent = () => {}, config?: WorkoutConfig) {
  const block = result220().session.blocks[0];
  if (config) block.config = config;
  block.restSeconds = 90;
  block.advance = 'ready';
  const saved = vi.fn();
  const close = vi.fn();
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const view = render(
    h(
      QueryClientProvider,
      { client },
      h(SaveBlockDialog, { block, onClose: close, onSaved: saved, validateCurrent }),
    ),
  );
  return { block, saved, close, client, view };
}
it('saves an independent full workout without session transition settings', async () => {
  const { block, saved } = setup();
  const before = structuredClone(block);
  fireEvent.change(screen.getByLabelText('Workout name'), {
    target: { value: 'Reusable finisher' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Save workout' }));
  await waitFor(() => expect(saved).toHaveBeenCalledWith('Reusable finisher'));
  const doc = await readTemplates();
  expect(doc.templates).toHaveLength(1);
  expect(doc.templates[0].config).toEqual(before.config);
  expect(doc.templates[0].id).not.toBe(block.id);
  expect(doc.templates[0].config).not.toHaveProperty('advance');
  expect(block).toEqual(before);
  block.config.exercises![0].name = 'Changed';
  expect((await readTemplates()).templates[0].config.exercises![0].name).toBe('Push-up');
});
it('rejects a changed source before writing, retaining the name for retry', async () => {
  let stale = true;
  setup(() => {
    if (stale) throw Error('Block changed; review it again.');
  });
  fireEvent.change(screen.getByLabelText('Workout name'), { target: { value: 'Keep this name' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save workout' }));
  expect((await screen.findByRole('alert')).textContent).toMatch(/Block changed/);
  expect((await readTemplates()).templates).toHaveLength(0);
  expect((screen.getByLabelText('Workout name') as HTMLInputElement).value).toBe('Keep this name');
  stale = false;
  fireEvent.click(screen.getByRole('button', { name: 'Save workout' }));
  await waitFor(async () => expect((await readTemplates()).templates).toHaveLength(1));
});
it('blocks duplicate submits and dismissal while committing, then unlocks after storage failure', async () => {
  const { client, close } = setup();
  let finish!: () => void;
  vi.spyOn(client, 'cancelQueries').mockReturnValueOnce(
    new Promise((resolve) => {
      finish = resolve;
    }),
  );
  const form = screen.getByRole('button', { name: 'Save workout' }).closest('form')!;
  fireEvent.submit(form);
  fireEvent.submit(form);
  expect(screen.getByRole('button', { name: 'Cancel' }).hasAttribute('disabled')).toBe(true);
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  expect(close).not.toHaveBeenCalled();
  localStorage.setItem('nextround.restore-journal.v1', '{}');
  await act(async () => finish());
  expect((await screen.findByRole('alert')).textContent).toMatch(/recovery/);
  expect(screen.getByRole('button', { name: 'Cancel' }).hasAttribute('disabled')).toBe(false);
  localStorage.removeItem('nextround.restore-journal.v1');
  fireEvent.submit(form);
  await waitFor(async () => expect((await readTemplates()).templates).toHaveLength(1));
});

it('does not dispatch a write if the dialog unmounts while preparing to save', async () => {
  const validate = vi.fn();
  const { client, view, saved } = setup(validate);
  let finish!: () => void;
  vi.spyOn(client, 'cancelQueries').mockReturnValueOnce(
    new Promise((resolve) => {
      finish = resolve;
    }),
  );
  fireEvent.click(screen.getByRole('button', { name: 'Save workout' }));
  view.unmount();
  await act(async () => finish());
  expect(validate).not.toHaveBeenCalled();
  expect(saved).not.toHaveBeenCalled();
  expect((await readTemplates()).templates).toHaveLength(0);
});

const movement = {
  id: 'custom-slot',
  name: 'Personal sequence',
  description: 'User notes',
  supportedUnits: ['reps', 'seconds'] as ('reps' | 'seconds')[],
  target: { unit: 'reps' as const, value: 7 },
};
const common = { leadInSeconds: 5, warningSeconds: 3, exercises: [movement] };
it.each<WorkoutConfig>([
  { ...common, type: 'emom', minutes: 4 },
  { ...common, type: 'countdown', durationSeconds: 90, showChecklist: true },
  { ...common, type: 'intervals', workSeconds: 25, restSeconds: 10, rounds: 3 },
  { ...common, type: 'amrap', durationSeconds: 180 },
  { ...common, type: 'forTime', timeCapSeconds: 240, showChecklist: false },
  {
    ...common,
    type: 'ladder',
    timeCapSeconds: 300,
    ladder: { direction: 'pyramid', startReps: 2, increment: 2, rungs: 3 },
    exercises: [{ ...movement, target: undefined }],
  },
])('preserves the complete $type configuration and custom notes', async (config) => {
  setup(() => {}, config);
  fireEvent.click(screen.getByRole('button', { name: 'Save workout' }));
  await waitFor(async () => expect((await readTemplates()).templates).toHaveLength(1));
  expect((await readTemplates()).templates[0].config).toEqual(JSON.parse(JSON.stringify(config)));
});
