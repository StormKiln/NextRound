import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { Dialog } from '@/components/dialog';
import { Button } from '@/components/ui/button';
import { fullscreen } from '@/native/adapter';
import { useWorkout } from '@/state/workout';
import { historyKey } from './repository';
import './history.css';
export function ResultActions() {
  const { pendingResult, resultStatus, saveResult, discardResult, busy, error } = useWorkout();
  const [discard, setDiscard] = useState(false);
  const client = useQueryClient();
  const navigate = useNavigate();
  return (
    <section className="result-actions" aria-label="Save workout result">
      {pendingResult && (
        <>
          <p>Keep this session in your local workout history?</p>
          <div className="template-actions">
            <Button
              disabled={busy}
              onClick={async () => {
                if (await saveResult()) await client.invalidateQueries({ queryKey: historyKey });
              }}
            >
              {busy ? 'Saving…' : 'Save result'}
            </Button>
            <Button variant="ghost" disabled={busy} onClick={() => setDiscard(true)}>
              Discard result
            </Button>
          </div>
        </>
      )}
      {resultStatus === 'saved' && (
        <>
          <p role="status">Result saved to history.</p>
          <Button
            variant="secondary"
            onClick={async () => {
              await fullscreen(false);
              void navigate({ to: '/history' });
            }}
          >
            View history
          </Button>
        </>
      )}
      {resultStatus === 'discarded' && <p role="status">Result discarded.</p>}
      {discard && (
        <Dialog
          title="Discard this result?"
          onClose={() => {
            if (!busy) setDiscard(false);
          }}
        >
          <p>This completed session will not be added to history.</p>
          {error && <p role="alert">{error}</p>}
          <div className="dialog-actions">
            <Button variant="ghost" disabled={busy} onClick={() => setDiscard(false)}>
              Keep result
            </Button>
            <Button
              variant="destructive"
              disabled={busy}
              onClick={async () => {
                if (await discardResult()) setDiscard(false);
              }}
            >
              Discard result
            </Button>
          </div>
        </Dialog>
      )}
    </section>
  );
}
