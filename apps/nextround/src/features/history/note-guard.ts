import { invoke, isTauri } from '@tauri-apps/api/core';
import { create } from 'zustand';

export const useNoteGuard = create<{ onQuit: (() => void) | null }>(() => ({ onQuit: null }));
let pending: Promise<unknown> = Promise.resolve();
export function setNativeNoteGuard(editing: boolean) {
  const operation = pending.then(() =>
    isTauri() ? invoke('set_history_note_editing', { editing }) : undefined,
  );
  pending = operation.catch(() => undefined);
  return operation;
}
