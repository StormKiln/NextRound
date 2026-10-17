import { create } from 'zustand';
// Shared guard avoids a circular dependency between the single-workout and session stores.
export const useTrainingOwnership = create<{ owned: boolean; editing: boolean }>(() => ({
  owned: false,
  editing: false,
}));
