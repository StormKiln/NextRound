import { create } from 'zustand';
import type { EquipmentId } from '@/data/equipment';
import { readEquipment, saveEquipment } from './equipment-preferences';

type State = {
  selection: EquipmentId[] | null;
  loaded: boolean;
  error: string | null;
  load: () => void;
  save: (selection: EquipmentId[] | null) => boolean;
};
export const useEquipment = create<State>((set) => ({
  selection: null,
  loaded: false,
  error: null,
  load: () => {
    try {
      set({ selection: readEquipment(window.localStorage), loaded: true, error: null });
    } catch (error) {
      set({ loaded: false, error: String(error) });
    }
  },
  save: (selection) => {
    try {
      saveEquipment(window.localStorage, selection);
      set({ selection: selection === null ? null : [...selection], loaded: true, error: null });
      return true;
    } catch (error) {
      set({ error: `Equipment settings could not be saved: ${String(error)}` });
      return false;
    }
  },
}));
