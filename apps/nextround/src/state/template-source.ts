import { create } from 'zustand';
import type { WorkoutTemplate } from '@/features/templates/repository';

export const useTemplateSources = create<{
  sources: Record<string, WorkoutTemplate>;
  setSource: (mode: string, source?: WorkoutTemplate) => void;
}>((set) => ({
  sources: {},
  setSource: (mode, source) =>
    set(({ sources }) => {
      const next = { ...sources };
      if (source) next[mode] = structuredClone(source);
      else delete next[mode];
      return { sources: next };
    }),
}));
