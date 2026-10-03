import { expect, it } from 'vitest';
import { EQUIPMENT_KEY, readEquipment, saveEquipment } from './equipment-preferences';

it('persists unconfigured versus explicitly no equipment and rejects destructive repairs', () => {
  let raw: string | null = null;
  const storage = {
    getItem: () => raw,
    setItem: (_key: string, value: string) => {
      raw = value;
    },
  };
  expect(readEquipment(storage)).toBeNull();
  saveEquipment(storage, []);
  expect(readEquipment(storage)).toEqual([]);
  saveEquipment(storage, ['dumbbell', 'jump-box']);
  expect(readEquipment(storage)).toEqual(['dumbbell', 'jump-box']);
  saveEquipment(storage, null);
  expect(readEquipment(storage)).toBeNull();
  raw = '{"version":99,"selection":[]}';
  expect(() => saveEquipment(storage, [])).toThrow();
  expect(raw).toContain('99');
  raw = '{bad';
  expect(() => readEquipment(storage)).toThrow();
});
it('validates equipment identities and reports inaccessible storage', () => {
  for (const selection of [['alien'], ['dumbbell', 'dumbbell'], {}, false])
    expect(() =>
      readEquipment({ getItem: () => JSON.stringify({ version: 1, selection }) }),
    ).toThrow();
  expect(() =>
    readEquipment({
      getItem: () => {
        throw Error('denied');
      },
    }),
  ).toThrow('denied');
  expect(() =>
    saveEquipment(
      {
        getItem: () => null,
        setItem: () => {
          throw Error('full');
        },
      },
      [],
    ),
  ).toThrow('full');
  expect(EQUIPMENT_KEY).not.toBe('nextround.preferences.v1');
});
