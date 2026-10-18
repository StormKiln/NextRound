import { expect, it } from 'vitest';
import { useTemplateFilters } from './filter-state';
import { sortLibrary } from './library-sort';

const items = [
  { id: 'a', name: 'Zulu', seconds: 90 },
  { id: 'b', name: 'Alpha', seconds: null },
  { id: 'c', name: 'Alpha', seconds: 30 },
  { id: 'd', name: 'Beta', seconds: 30 },
];
it('sorts copied lists with stable ties and unknown duration last', () => {
  const original = structuredClone(items);
  expect(sortLibrary(items, 'recent', (x) => x.seconds).map((x) => x.id)).toEqual([
    'd',
    'c',
    'b',
    'a',
  ]);
  expect(sortLibrary(items, 'name', (x) => x.seconds).map((x) => x.id)).toEqual([
    'b',
    'c',
    'd',
    'a',
  ]);
  expect(sortLibrary(items, 'duration', (x) => x.seconds).map((x) => x.id)).toEqual([
    'c',
    'd',
    'a',
    'b',
  ]);
  expect(items).toEqual(original);
  expect(sortLibrary([], 'duration', () => null)).toEqual([]);
});
it('clears shared filters without changing sort', () => {
  useTemplateFilters.setState({
    sort: 'duration',
    search: 'push',
    favouritesOnly: true,
    collection: 'test',
  });
  useTemplateFilters.getState().reset();
  expect(useTemplateFilters.getState()).toMatchObject({
    sort: 'duration',
    search: '',
    favouritesOnly: false,
    collection: 'all',
  });
});
