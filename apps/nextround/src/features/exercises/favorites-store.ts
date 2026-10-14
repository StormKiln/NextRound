import { create } from 'zustand';
import { readFavorites, toggleFavorite } from './favorites';

type State = {
  ids: string[];
  loaded: boolean;
  error: string | null;
  load: () => void;
  toggle: (id: string) => boolean;
};
export const useExerciseFavorites = create<State>((set) => ({
  ids: [],
  loaded: false,
  error: null,
  load: () => {
    try {
      set({ ids: readFavorites(window.localStorage), loaded: true, error: null });
    } catch (error) {
      set({ loaded: false, error: String(error) });
    }
  },
  toggle: (id) => {
    try {
      set({ ids: toggleFavorite(window.localStorage, id), loaded: true, error: null });
      return true;
    } catch (error) {
      set({ error: `Exercise favourites could not be saved: ${String(error)}` });
      return false;
    }
  },
}));
