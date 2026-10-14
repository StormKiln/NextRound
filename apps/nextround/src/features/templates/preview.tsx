import type { WorkoutConfig } from '@nextround/core';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Dialog } from '@/components/dialog';
import { Button } from '@/components/ui/button';
import {
  copyValidatedConfig,
  readTemplates,
  sameTemplate,
  type WorkoutTemplate,
} from './repository';
import { WorkoutDetails } from './workout-details';

export function WorkoutPreview({
  id,
  onClose,
  onLoad,
}: {
  id: string;
  onClose: () => void;
  onLoad: (config: WorkoutConfig, source: WorkoutTemplate) => void;
}) {
  const [entry, setEntry] = useState<WorkoutTemplate | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [confirm, setConfirm] = useState(false);
  const mounted = useRef(false);
  const operation = useRef(0);
  const body = useRef<HTMLDivElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const readCurrent = useCallback(async () => {
    const document = await readTemplates();
    const current = document.templates.find((template) => template.id === id);
    if (!current)
      throw new Error(
        'This saved workout no longer exists. Close the preview and refresh the library.',
      );
    copyValidatedConfig(current.config);
    return structuredClone(current);
  }, [id]);
  const refresh = useCallback(async () => {
    const ticket = ++operation.current;
    setBusy(true);
    setError('');
    setNotice('');
    setConfirm(false);
    setEntry(null);
    try {
      const current = await readCurrent();
      if (mounted.current && operation.current === ticket) setEntry(current);
    } catch (e) {
      if (mounted.current && operation.current === ticket)
        setError(e instanceof Error ? e.message : String(e));
    } finally {
      if (mounted.current && operation.current === ticket) setBusy(false);
    }
  }, [readCurrent]);
  useEffect(() => {
    mounted.current = true;
    void refresh();
    return () => {
      mounted.current = false;
      operation.current++;
    };
    // A preview is mounted for one saved ID; async completions are guarded after dismissal.
  }, [refresh]);
  async function load() {
    if (!entry || busy) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const current = await readCurrent();
      if (!mounted.current) return;
      if (!sameTemplate(entry, current)) {
        setEntry(current);
        setConfirm(false);
        if (body.current) body.current.scrollTop = 0;
        setNotice('This workout changed. Review the updated details before choosing Load again.');
        return;
      }
      onLoad(copyValidatedConfig(current.config), current);
      onClose();
    } catch (e) {
      if (mounted.current) {
        if (body.current) body.current.scrollTop = 0;
        setError(e instanceof Error ? e.message : String(e));
        setConfirm(false);
      }
    } finally {
      if (mounted.current) setBusy(false);
    }
  }
  return (
    <Dialog
      title="Preview saved workout"
      className="template-preview"
      onClose={onClose}
      initialFocus={closeButton}
    >
      <div ref={body} className="template-preview-body" aria-busy={busy}>
        {busy && <p role="status">Reading saved workout…</p>}
        {notice && <p role="status">{notice}</p>}
        {error && (
          <div role="alert">
            <p>{error}</p>
            <Button variant="secondary" onClick={() => void refresh()} disabled={busy}>
              Retry preview
            </Button>
          </div>
        )}
        {entry && (
          <>
            <h3>{entry.name}</h3>
            <WorkoutDetails config={entry.config} />
          </>
        )}
      </div>
      {confirm && (
        <p role="status">
          Load “{entry?.name}”? This replaces the current setup for this workout mode.
        </p>
      )}
      <div className="template-actions">
        <Button ref={closeButton} variant="secondary" onClick={onClose}>
          Close
        </Button>
        {confirm && (
          <Button variant="secondary" disabled={busy} onClick={() => setConfirm(false)}>
            Keep current setup
          </Button>
        )}
        <Button
          disabled={busy || !entry || !!error}
          onClick={() => (confirm ? void load() : setConfirm(true))}
        >
          {confirm ? 'Confirm load' : 'Load workout'}
        </Button>
      </div>
    </Dialog>
  );
}
