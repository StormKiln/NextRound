import { type EquipmentId, equipmentLabels } from '@/data/equipment';
export const EQUIPMENT_KEY = 'nextround.equipment.v1';
type StorageAccess = Pick<Storage, 'getItem' | 'setItem'>;
function selectionValue(value: unknown): EquipmentId[] | null {
  if (value === null) return null;
  if (
    !Array.isArray(value) ||
    value.some((id) => typeof id !== 'string' || !Object.hasOwn(equipmentLabels, id)) ||
    new Set(value).size !== value.length
  )
    throw Error('Equipment settings are invalid. Existing data has been preserved.');
  return [...value] as EquipmentId[];
}
export function readEquipment(storage: Pick<Storage, 'getItem'>): EquipmentId[] | null {
  const raw = storage.getItem(EQUIPMENT_KEY);
  if (raw === null) return null;
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    throw Error('Equipment settings could not be read. Existing data has been preserved.');
  }
  if (
    !value ||
    typeof value !== 'object' ||
    !('version' in value) ||
    value.version !== 1 ||
    !('selection' in value)
  )
    throw Error(
      'This equipment settings version is unsupported. Existing data has been preserved.',
    );
  return selectionValue(value.selection);
}
export function saveEquipment(storage: StorageAccess, selection: EquipmentId[] | null) {
  readEquipment(storage);
  storage.setItem(
    EQUIPMENT_KEY,
    JSON.stringify({ version: 1, selection: selectionValue(selection) }),
  );
}
