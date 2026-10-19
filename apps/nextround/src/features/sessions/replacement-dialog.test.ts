// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createElement as h } from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { result220 } from '../../../../../tests/fixtures/training-220';

const mocks = vi.hoisted(() => ({ read: vi.fn() }));
vi.mock('../exercises/repository', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../exercises/repository')>()),
  readPersonalExercises: mocks.read,
}));

import { ReplacementDialog } from './replacement-dialog';

const data = {
  version: 1,
  exercises: [
    {
      id: 'personal:test',
      name: 'Delayed movement',
      description: 'A personal movement',
      category: 'Other bodyweight',
      equipment: [],
      targetAreas: ['core'],
      supportedUnits: ['reps'],
      archived: false,
    },
  ],
};
beforeEach(() => {
  mocks.read.mockReset();
  localStorage.clear();
  HTMLDialogElement.prototype.showModal = function () {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function () {
    this.open = false;
  };
});
afterEach(cleanup);
it('cancellation prevents an outstanding personal-library read from applying replacements', async () => {
  mocks.read.mockResolvedValue(data);
  const apply = vi.fn();
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const rendered = render(
    h(
      QueryClientProvider,
      { client },
      h(ReplacementDialog, {
        session: result220().session,
        onApply: apply,
        onClose: () => rendered.unmount(),
      }),
    ),
  );
  fireEvent.change(screen.getByLabelText('Search replacement exercises'), {
    target: { value: 'Delayed movement' },
  });
  fireEvent.click(await screen.findByRole('button', { name: /Delayed movement/ }));
  let finish!: (v: typeof data) => void;
  mocks.read.mockReturnValueOnce(
    new Promise((resolve) => {
      finish = resolve;
    }),
  );
  fireEvent.click(screen.getByRole('button', { name: 'Apply replacement' }));
  expect(screen.getByRole('button', { name: 'Apply replacement' }).hasAttribute('disabled')).toBe(
    true,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  await act(async () => finish(data));
  expect(apply).not.toHaveBeenCalled();
  expect(screen.queryByRole('dialog')).toBeNull();
  client.clear();
});
it('locks target editing during final validation and unlocks it after a failed read', async () => {
  mocks.read.mockResolvedValue(data);
  const apply = vi.fn();
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    h(
      QueryClientProvider,
      { client },
      h(ReplacementDialog, { session: result220().session, onApply: apply, onClose: vi.fn() }),
    ),
  );
  fireEvent.change(screen.getByLabelText('Search replacement exercises'), {
    target: { value: 'Delayed movement' },
  });
  fireEvent.click(await screen.findByRole('button', { name: /Delayed movement/ }));
  let fail!: (e: Error) => void;
  mocks.read.mockReturnValueOnce(
    new Promise((_resolve, reject) => {
      fail = reject;
    }),
  );
  fireEvent.click(screen.getByRole('button', { name: 'Apply replacement' }));
  expect(
    screen
      .getByRole('button', { name: 'Set target for block 1: Work, movement 1' })
      .hasAttribute('disabled'),
  ).toBe(true);
  await act(async () => fail(Error('Read unavailable')));
  expect(
    screen
      .getByRole('button', { name: 'Set target for block 1: Work, movement 1' })
      .hasAttribute('disabled'),
  ).toBe(false);
  expect(screen.getByRole('alert').textContent).toContain('Read unavailable');
  expect(apply).not.toHaveBeenCalled();
  await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Apply replacement' })));
  expect(apply).toHaveBeenCalledTimes(1);
  expect(apply.mock.calls[0][0][0].entry.target).toEqual({ unit: 'reps', value: 8 });
  client.clear();
});
it('requires an occurrence before offering replacement candidates', async () => {
  mocks.read.mockResolvedValue(data);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    h(
      QueryClientProvider,
      { client },
      h(ReplacementDialog, { session: result220().session, onApply: () => {}, onClose: () => {} }),
    ),
  );
  fireEvent.change(screen.getByLabelText('Search replacement exercises'), {
    target: { value: 'Delayed movement' },
  });
  await screen.findByRole('button', { name: /Delayed movement/ });
  fireEvent.click(screen.getByLabelText('Replace in block 1: Work, movement 1'));
  expect(screen.queryByRole('button', { name: /Delayed movement/ })).toBeNull();
});
