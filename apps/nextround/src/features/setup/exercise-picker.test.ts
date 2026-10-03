// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createElement as h } from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { exercises } from '@/data/exercises';
import { ExerciseGroups } from './exercise-picker';

afterEach(cleanup);
it('groups unknown snapshots as Unspecified without inferring tags or changing identity', () => {
  const entry = { id: 'historical', name: 'Historical movement' };
  const onSelect = vi.fn();
  render(h(ExerciseGroups, { library: [entry], search: 'Historical', view: 'focus', onSelect }));
  expect(screen.getByText('Unspecified')).toBeTruthy();
  fireEvent.click(screen.getByRole('button'));
  expect(onSelect).toHaveBeenCalledExactlyOnceWith(entry);
});
it('overlapping focus groups retain one source identity and usage count', () => {
  const entry = exercises.find((e) => e.id === 'kettlebell-row');
  if (!entry) throw new Error('Missing row');
  const onSelect = vi.fn();
  render(
    h(ExerciseGroups, {
      library: [entry],
      search: 'row',
      view: 'focus',
      counts: new Map([[entry.id, 4]]),
      onSelect,
    }),
  );
  const choices = screen.getAllByRole('button');
  expect(choices).toHaveLength(3);
  for (const choice of choices) expect(choice.textContent).toContain('Used in 4 saved workouts');
  fireEvent.click(choices[1]);
  expect(onSelect).toHaveBeenCalledExactlyOnceWith(entry);
});
