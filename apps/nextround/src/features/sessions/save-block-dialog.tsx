import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { Dialog } from '@/components/dialog';
import { Button } from '@/components/ui/button';
import { copyValidatedConfig, mutateTemplates } from '../templates/repository';
import { WorkoutDetails } from '../templates/workout-details';
import type { TrainingBlock } from './model';

export function SaveBlockDialog({
  block,
  validateCurrent,
  onClose,
  onSaved,
}: {
  block: TrainingBlock;
  validateCurrent: () => void;
  onClose: () => void;
  onSaved: (name: string) => void;
}) {
  const client = useQueryClient();
  const [name, setName] = useState(block.name);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const committing = useRef(false);
  const mounted = useRef(false);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  return (
    <Dialog
      title="Save block as workout"
      className="save-block-dialog"
      initialFocus={input}
      onClose={() => {
        if (!committing.current) onClose();
      }}
    >
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          if (committing.current) return;
          committing.current = true;
          setBusy(true);
          setError('');
          try {
            const config = copyValidatedConfig(block.config);
            await client.cancelQueries({ queryKey: ['workout-templates'] });
            if (!mounted.current) return;
            validateCurrent();
            const document = await mutateTemplates({ action: 'save', name, config });
            client.setQueryData(['workout-templates'], document);
            if (mounted.current) onSaved(document.templates.at(-1)!.name);
          } catch (e) {
            if (mounted.current) setError(e instanceof Error ? e.message : String(e));
          } finally {
            committing.current = false;
            if (mounted.current) setBusy(false);
          }
        }}
      >
        <div className="save-block-body">
          <label>
            Workout name
            <input
              ref={input}
              className="input"
              value={name}
              maxLength={120}
              required
              disabled={busy}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <p>Save an independent copy. Your session and its Undo stay unchanged.</p>
          <p className="muted">
            Rest after this block and the next-block transition belong to the session and are not
            saved in this workout.
          </p>
          <WorkoutDetails config={block.config} />
        </div>
        <footer className="save-block-footer">
          {error && <p role="alert">{error}</p>}
          {busy && <p role="status">Saving workout…</p>}
          <div className="dialog-actions">
            <Button type="button" variant="secondary" disabled={busy} onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              Save workout
            </Button>
          </div>
        </footer>
      </form>
    </Dialog>
  );
}
