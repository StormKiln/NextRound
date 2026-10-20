import { useMemo, useRef, useState } from 'react';
import { Dialog } from '@/components/dialog';
import { Button } from '@/components/ui/button';
import { WorkoutDetails, workoutSummary } from '../templates/workout-details';
import { sessionTimeLabel, type TrainingSession } from './model';
import { repeatSessionBlocks } from './repeat-blocks';

export function RepeatBlockDialog({
  session,
  onClose,
  onApply,
}: {
  session: TrainingSession;
  onClose: () => void;
  onApply: (ids: string[], copies: number) => void;
}) {
  const [selected, setSelected] = useState(session.blocks.map((b) => b.id));
  const [copies, setCopies] = useState('1');
  const [error, setError] = useState('');
  const countInput = useRef<HTMLInputElement>(null);
  const preview = useMemo(() => {
    try {
      return {
        session: repeatSessionBlocks(session, session, selected, Number(copies)),
        error: '',
      };
    } catch (e) {
      return { session: null, error: e instanceof Error ? e.message : String(e) };
    }
  }, [session, selected, copies]);
  return (
    <Dialog
      title="Repeat session blocks"
      className="repeat-block-dialog"
      onClose={onClose}
      initialFocus={countInput}
    >
      <div className="repeat-block-body">
        <p>Append independent copies in the current block order. One Undo restores your session.</p>
        <label>
          Additional copies
          <input
            ref={countInput}
            className="input"
            type="number"
            min="1"
            max="19"
            step="1"
            value={copies}
            aria-invalid={!Number.isSafeInteger(Number(copies)) || Number(copies) < 1}
            aria-describedby="repeat-block-feedback"
            onChange={(e) => {
              setCopies(e.target.value);
              setError('');
            }}
          />
        </label>
        <fieldset className="repeat-block-selection">
          <legend>Choose blocks to repeat</legend>
          {session.blocks.map((b, i) => (
            <label key={b.id} className="membership-option">
              <input
                type="checkbox"
                checked={selected.includes(b.id)}
                aria-label={`Repeat block ${i + 1}: ${b.name}`}
                onChange={(e) => {
                  setSelected((ids) =>
                    e.target.checked ? [...ids, b.id] : ids.filter((id) => id !== b.id),
                  );
                  setError('');
                }}
              />
              <span>
                Block {i + 1}: {b.name}
                <small>{workoutSummary(b.config)}</small>
              </span>
            </label>
          ))}
        </fieldset>
        {preview.session && (
          <section aria-label="Repeated sequence preview">
            <h3>Review the resulting session</h3>
            <p>{sessionTimeLabel(preview.session)}</p>
            <p>
              The currently final block becomes an intermediate block: its stored{' '}
              {session.blocks.at(-1)!.restSeconds}s recovery and{' '}
              {session.blocks.at(-1)!.advance === 'ready'
                ? 'wait until ready'
                : 'automatic advance'}{' '}
              will apply before the first copy.
            </p>
            {preview.session.blocks.slice(session.blocks.length).map((b, i) => (
              <section className="repeat-block-preview" key={b.id}>
                <h4>
                  Block {session.blocks.length + i + 1}: {b.name}
                </h4>
                <details>
                  <summary>Preview exercises, targets and timing</summary>
                  <WorkoutDetails config={b.config} />
                </details>
                <p>
                  {i === preview.session!.blocks.length - session.blocks.length - 1
                    ? 'Final block — no transition recovery.'
                    : `After this block: ${b.restSeconds}s recovery · ${b.advance === 'ready' ? 'Wait until ready' : 'Advance automatically'}`}
                </p>
              </section>
            ))}
          </section>
        )}
      </div>
      <footer className="repeat-block-footer">
        <p id="repeat-block-feedback" role={preview.error || error ? 'alert' : 'status'}>
          {error ||
            preview.error ||
            `${selected.length * Number(copies)} new blocks · ${preview.session!.blocks.length} of 20 blocks.`}
        </p>
        <div className="dialog-actions">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={!preview.session}
            onClick={() => {
              try {
                onApply(selected, Number(copies));
              } catch (e) {
                setError(e instanceof Error ? e.message : String(e));
              }
            }}
          >
            Add repeated blocks
          </Button>
        </div>
      </footer>
    </Dialog>
  );
}
