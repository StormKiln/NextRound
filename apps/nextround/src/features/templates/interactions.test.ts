// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createElement as h } from 'react';
import { afterEach, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ read: vi.fn(), mutate: vi.fn() }));
vi.mock('./repository', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./repository')>()),
  readTemplates: mocks.read,
  mutateTemplates: mocks.mutate,
}));

import { TemplateLibrary } from './index';

afterEach(cleanup);
it('an older query cannot replace a newer manual refresh', async () => {
  const original = {
    version: 2,
    collections: [],
    templates: [
      {
        id: 'a',
        name: 'Old',
        config: { type: 'countdown', durationSeconds: 30, leadInSeconds: 0, warningSeconds: 0 },
      },
    ],
  };
  const latest = { ...original, templates: [{ ...original.templates[0], name: 'Fresh' }] };
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  mocks.read.mockResolvedValueOnce(original);
  render(h(QueryClientProvider, { client }, h(TemplateLibrary, { onLoad: vi.fn() })));
  await screen.findByRole('heading', { name: 'Old' });
  let finish!: (value: typeof original) => void;
  mocks.read.mockReturnValueOnce(
    new Promise((resolve) => {
      finish = resolve;
    }),
  );
  let pending!: Promise<void>;
  await act(async () => {
    pending = client.refetchQueries({ queryKey: ['workout-templates'] });
  });
  mocks.read.mockResolvedValueOnce(latest);
  fireEvent.click(screen.getByRole('button', { name: 'Refresh saved workouts' }));
  await screen.findByRole('heading', { name: 'Fresh' });
  await act(async () => {
    finish(original);
    await pending;
  });
  await waitFor(() => expect(client.getQueryData(['workout-templates'])).toEqual(latest));
  expect(screen.queryByRole('heading', { name: 'Old' })).toBeNull();
});

it('duplicate submission is locked until one write completes', async () => {
  HTMLDialogElement.prototype.showModal = function () {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function () {
    this.open = false;
  };
  const entry = {
    id: 'one',
    name: 'Original',
    config: { type: 'countdown', durationSeconds: 30, leadInSeconds: 0, warningSeconds: 0 },
  };
  const doc = { version: 2, collections: [], templates: [entry] };
  mocks.read.mockResolvedValue(doc);
  let finish!: (value: typeof doc) => void;
  mocks.mutate.mockReturnValue(
    new Promise((resolve) => {
      finish = resolve;
    }),
  );
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(h(QueryClientProvider, { client }, h(TemplateLibrary, { onLoad: vi.fn() })));
  fireEvent.click(await screen.findByRole('button', { name: 'Duplicate Original' }));
  const button = screen.getByRole('button', { name: 'Create copy' });
  fireEvent.click(button);
  fireEvent.click(button);
  await waitFor(() => expect(mocks.mutate).toHaveBeenCalledTimes(1));
  fireEvent(screen.getByRole('dialog'), new Event('cancel', { bubbles: true, cancelable: true }));
  expect(screen.getByRole('dialog')).toBeTruthy();
  let staleFinish!: (value: typeof doc) => void;
  mocks.read.mockReturnValueOnce(
    new Promise((resolve) => {
      staleFinish = resolve;
    }),
  );
  let staleRead!: Promise<void>;
  await act(async () => {
    staleRead = client.refetchQueries({ queryKey: ['workout-templates'] });
  });
  await act(async () =>
    finish({ ...doc, templates: [entry, { ...entry, id: 'copy', name: 'Copy of Original' }] }),
  );
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  await act(async () => {
    staleFinish(doc);
    await staleRead;
  });
  expect((client.getQueryData(['workout-templates']) as typeof doc).templates).toHaveLength(2);
});

it('a delayed favourite write does not steal focus from search', async () => {
  const entry = {
    id: 'focus',
    name: 'Focus',
    config: { type: 'countdown', durationSeconds: 30, leadInSeconds: 0, warningSeconds: 0 },
  };
  const doc = { version: 2, collections: [], templates: [entry] };
  mocks.read.mockResolvedValue(doc);
  let finish!: (value: unknown) => void;
  mocks.mutate.mockReturnValue(
    new Promise((resolve) => {
      finish = resolve;
    }),
  );
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(h(QueryClientProvider, { client }, h(TemplateLibrary, { onLoad: vi.fn() })));
  const button = await screen.findByRole('button', { name: 'Favourite Focus' });
  button.focus();
  fireEvent.click(button);
  await waitFor(() => expect(button.hasAttribute('disabled')).toBe(true));
  const search = screen.getByLabelText('Search saved library');
  search.focus();
  await act(async () => {
    finish({ ...doc, templates: [{ ...entry, favourite: true }] });
  });
  await screen.findByRole('button', { name: 'Unfavourite Focus' });
  await new Promise((resolve) => setTimeout(resolve, 50));
  expect(document.activeElement).toBe(search);
});

it('failed favourite saves preserve intentional navigation', async () => {
  const entry = {
    id: 'failed',
    name: 'Failed',
    config: { type: 'countdown', durationSeconds: 30, leadInSeconds: 0, warningSeconds: 0 },
  };
  mocks.read.mockResolvedValue({ version: 2, collections: [], templates: [entry] });
  let fail!: (reason: Error) => void;
  mocks.mutate.mockReturnValue(
    new Promise((_, reject) => {
      fail = reject;
    }),
  );
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(h(QueryClientProvider, { client }, h(TemplateLibrary, { onLoad: vi.fn() })));
  const button = await screen.findByRole('button', { name: 'Favourite Failed' });
  button.focus();
  fireEvent.click(button);
  await waitFor(() => expect(button.hasAttribute('disabled')).toBe(true));
  const search = screen.getByLabelText('Search saved library');
  search.focus();
  await act(async () => {
    fail(new Error('Disk unavailable'));
  });
  await screen.findByRole('alert');
  expect(document.activeElement).toBe(search);
  expect(button.getAttribute('aria-pressed')).toBe('false');
});
