import { countLabel } from '@nextround/core';
import { useMemo, useRef, useState } from 'react';
import { Dialog } from '@/components/dialog';
import { Button } from '@/components/ui/button';
import type { TrainingBlock, TrainingSession } from './model';
import { recoveryTimeLabel, updateSessionRecovery } from './recovery';

const advanceLabel = (value: TrainingBlock['advance']) =>
  value === 'ready' ? 'Wait until ready' : 'Advance automatically';
export function RecoveryDialog({
  session,
  onClose,
  onApply,
}: {
  session: TrainingSession;
  onClose: () => void;
  onApply: (ids: string[], seconds: number, advance: TrainingBlock['advance']) => void;
}) {
  const first = session.blocks[0];
  const [selected, setSelected] = useState(session.blocks.map((b) => b.id));
  const [seconds, setSeconds] = useState(
    String(
      Number.isSafeInteger(first?.restSeconds) &&
        first.restSeconds >= 0 &&
        first.restSeconds <= 3600
        ? first.restSeconds
        : 0,
    ),
  );
  const [advance, setAdvance] = useState<TrainingBlock['advance']>(
    first?.advance === 'ready' ? 'ready' : 'automatic',
  );
  const [error, setError] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const invalid =
    !seconds.trim() ||
    !Number.isSafeInteger(Number(seconds)) ||
    Number(seconds) < 0 ||
    Number(seconds) > 3600;
  const preview = useMemo(() => {
    try {
      if (invalid) throw new Error('Enter whole seconds from 0 to 3600.');
      return {
        session: updateSessionRecovery(session, session, selected, Number(seconds), advance),
        message: '',
      };
    } catch (e) {
      return { session: null, message: e instanceof Error ? e.message : String(e) };
    }
  }, [session, selected, seconds, advance, invalid]);
  return (
    <Dialog
      title="Edit session recovery"
      className="recovery-dialog"
      initialFocus={input}
      onClose={onClose}
    >
      <div className="recovery-body">
        <p>
          Set recovery for selected blocks. Review each change before applying; one Undo restores
          the draft.
        </p>
        <div className="recovery-fields">
          <label>
            Recovery seconds
            <input
              ref={input}
              aria-label="Recovery seconds"
              className="input"
              type="number"
              min="0"
              max="3600"
              step="1"
              value={seconds}
              aria-invalid={invalid}
              aria-describedby={invalid ? 'recovery-seconds-error' : undefined}
              onChange={(e) => {
                setSeconds(e.target.value);
                setError('');
              }}
            />
            {invalid && (
              <span id="recovery-seconds-error" className="session-field-error">
                Enter whole seconds from 0 to 3600.
              </span>
            )}
          </label>
          <label>
            After recovery
            <select
              aria-label="After recovery"
              value={advance}
              onChange={(e) => {
                setAdvance(e.target.value as TrainingBlock['advance']);
                setError('');
              }}
            >
              <option value="automatic">Start next block automatically</option>
              <option value="ready">Wait until I am ready</option>
            </select>
          </label>
        </div>
        <fieldset className="repeat-block-selection">
          <legend>Choose blocks to update</legend>
          {session.blocks.map((b, i) => (
            <label className="membership-option" key={b.id}>
              <input
                type="checkbox"
                checked={selected.includes(b.id)}
                aria-label={`Update recovery for block ${i + 1}: ${b.name}`}
                onChange={(e) => {
                  setSelected((ids) =>
                    e.target.checked ? [...ids, b.id] : ids.filter((id) => id !== b.id),
                  );
                  setError('');
                }}
              />
              <span>
                Block {i + 1}: {b.name || 'Unnamed block'}
                <small>
                  Current: {Number.isFinite(b.restSeconds) ? `${b.restSeconds}s` : 'Not set'} ·{' '}
                  {advanceLabel(b.advance)}
                </small>
                {selected.includes(b.id) && !invalid && (
                  <small>
                    New: {seconds}s · {advanceLabel(advance)}
                  </small>
                )}
                {i === session.blocks.length - 1 && (
                  <small>Final block — stored only, used if another block follows.</small>
                )}
              </span>
            </label>
          ))}
        </fieldset>
        <section aria-label="Recovery timing preview">
          <h3>Session timing</h3>
          <p>Before: {recoveryTimeLabel(session)}</p>
          {preview.session && <p>After: {recoveryTimeLabel(preview.session)}</p>}
          <p>
            Work, lead-in, movements and targets stay unchanged. Manual waits have no fixed
            duration.
          </p>
        </section>
      </div>
      <footer className="recovery-footer">
        <p role={error || invalid ? 'alert' : 'status'}>
          {error ||
            preview.message ||
            `${countLabel(selected.length, 'selected block')} ready to update.`}
        </p>
        <div className="dialog-actions">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={!preview.session}
            onClick={() => {
              try {
                onApply(selected, Number(seconds), advance);
              } catch (e) {
                setError(e instanceof Error ? e.message : String(e));
              }
            }}
          >
            Apply recovery
          </Button>
        </div>
      </footer>
    </Dialog>
  );
}
