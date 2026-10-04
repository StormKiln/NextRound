import { create } from 'zustand';
export const useValidationAttempts = create<{
  modes: Record<string, boolean>;
  mark: (mode: string) => void;
  reset: (mode: string) => void;
}>((set) => ({
  modes: {},
  mark: (mode) => set((s) => ({ modes: { ...s.modes, [mode]: true } })),
  reset: (mode) => set((s) => ({ modes: { ...s.modes, [mode]: false } })),
}));
