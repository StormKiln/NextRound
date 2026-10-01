// @vitest-environment jsdom
import type { ExerciseEntry } from '@nextround/core';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createElement as h } from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ read: vi.fn() }));
vi.mock('../history/repository', () => ({ readHistory: mocks.read }));

import { ExerciseRecommendations } from './exercise-recommendations';

const library: ExerciseEntry[] = [
  { id: 'a', name: 'Air squat' },
  { id: 'b', name: 'Push-up' },
  { id: 'c', name: 'Kettlebell swing' },
];
const doc = {
  version: 1,
  results: [{ config: { exercises: [{ catalogId: 'b' }, { catalogId: 'b' }] } }],
};
let client: QueryClient;
let onSelect = vi.fn<(entry: ExerciseEntry) => void>();
function setup(search = '', selected: typeof library = []) {
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  onSelect = vi.fn();
  return render(
    h(
      QueryClientProvider,
      { client },
      h(ExerciseRecommendations, { library, search, selected, onSelect }),
    ),
  );
}
beforeEach(() => {
  vi.clearAllMocks();
  mocks.read.mockResolvedValue(doc);
});
afterEach(cleanup);
it('shows counts, respects search and requires explicit selection', async () => {
  setup('push ups');
  fireEvent.click(await screen.findByRole('button', { name: 'My favorites' }));
  expect(screen.getByRole('button', { name: 'Add suggested Push-up' }).textContent).toContain(
    'Used in 1 saved workouts',
  );
  expect(screen.queryByRole('button', { name: 'Add suggested Air squat' })).toBeNull();
  expect(onSelect).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Add suggested Push-up' }));
  expect(onSelect).toHaveBeenCalledWith(library[1]);
});
it('excludes selected catalog identities while keeping manual repeats', async () => {
  setup('', [{ id: 'entry', name: 'Renamed', catalogId: 'b' }] as typeof library);
  fireEvent.click(await screen.findByRole('button', { name: 'My favorites' }));
  expect(screen.queryByRole('button', { name: 'Add suggested Push-up' })).toBeNull();
  expect(screen.getByText('Push-up')).toBeTruthy();
});
it('does not turn unreadable history into zero counts and retries', async () => {
  mocks.read.mockRejectedValueOnce(new Error('corrupt'));
  setup();
  expect(await screen.findByRole('alert')).toHaveProperty(
    'textContent',
    expect.stringContaining('could not be loaded'),
  );
  expect(screen.queryByRole('button', { name: 'My favorites' })).toBeNull();
  expect(screen.queryByText(/Used in 0/)).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Retry exercise usage' }));
  expect(await screen.findByRole('button', { name: 'My favorites' })).toBeTruthy();
});
it('updates counts and ranking after saved history changes', async () => {
  setup();
  fireEvent.click(await screen.findByRole('button', { name: 'My favorites' }));
  expect(screen.getByRole('button', { name: 'Add suggested Push-up' }).textContent).toContain(
    'Used in 1',
  );
  mocks.read.mockResolvedValue({ version: 1, results: [] });
  await client.invalidateQueries({ queryKey: ['workout-history'] });
  await waitFor(() =>
    expect(screen.getByRole('button', { name: 'Add suggested Push-up' }).textContent).toContain(
      'Used in 0',
    ),
  );
  expect(screen.getByText(/No attributed exercise history yet/)).toBeTruthy();
});

it('does not show cached counts after a failed refresh', async () => {
  setup();
  await screen.findByRole('button', { name: 'My favorites' });
  mocks.read.mockRejectedValue(new Error('Unavailable'));
  await client.invalidateQueries({ queryKey: ['workout-history'] });
  await screen.findByRole('alert');
  expect(screen.queryByRole('button', { name: 'My favorites' })).toBeNull();
  expect(screen.queryByText(/Used in 1/)).toBeNull();
});
