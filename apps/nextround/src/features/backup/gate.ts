import { create } from 'zustand';
export const useRestoreGate = create<{ error: string }>(() => ({ error: '' }));
export function blockRestore(error: unknown) {
  useRestoreGate.setState({
    error: `Restore recovery must finish before continuing. ${String(error)}`,
  });
}

export function assertStorageReady(storage: Pick<Storage, 'getItem'>) {
  if (storage.getItem('nextround.restore-journal.v1') !== null)
    throw Error('Restore recovery must finish before continuing.');
}
