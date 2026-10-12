import { invoke, isTauri } from '@tauri-apps/api/core';
import { useRef, useState } from 'react';
import { Dialog } from '@/components/dialog';
import { Button } from '@/components/ui/button';
import { historyCsv } from './csv';
import type { WorkoutResult } from './repository';

export async function saveHistoryCsv(csv: string): Promise<boolean> {
  if (isTauri()) return invoke('save_history_csv', { csv });
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'NextRound-workout-history.csv';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
}
export function HistoryExport({
  results,
  onClose,
  onSaved,
}: {
  results: WorkoutResult[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [includeNotes, setIncludeNotes] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const gate = useRef(false);
  return (
    <Dialog
      title="Export workout history"
      onClose={() => {
        if (!gate.current) onClose();
      }}
    >
      <p>
        {results.length} saved {results.length === 1 ? 'session' : 'sessions'} matching your applied
        filters when this dialog opened.
      </p>
      <p>
        A spreadsheet report, not a restorable backup. Includes recorded timing and progress;
        targets are not measured performance.
      </p>
      <label className="personal-check">
        <input
          type="checkbox"
          checked={includeNotes}
          disabled={busy}
          onChange={(e) => setIncludeNotes(e.target.checked)}
        />
        Include workout notes
      </label>
      {error && <p role="alert">{error}</p>}
      <div className="dialog-actions">
        <Button variant="ghost" disabled={busy} onClick={onClose}>
          Cancel
        </Button>
        <Button
          disabled={busy}
          onClick={async () => {
            if (gate.current) return;
            gate.current = true;
            setBusy(true);
            setError('');
            try {
              if (await saveHistoryCsv(historyCsv(results, includeNotes))) onSaved();
            } catch (e) {
              setError(`CSV could not be saved. Try another destination. ${String(e)}`);
            } finally {
              gate.current = false;
              setBusy(false);
            }
          }}
        >
          {busy ? 'Saving…' : 'Save CSV'}
        </Button>
      </div>
    </Dialog>
  );
}
