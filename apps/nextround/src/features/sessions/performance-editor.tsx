import type { WorkoutConfig } from '@nextround/core';
import { useRef, useState } from 'react';
import { Dialog } from '@/components/dialog';
import { Button } from '@/components/ui/button';
import { type Actual, actualOccurrenceLimit, validateActualsForConfig } from './model';

import { useUnsavedChanges } from './unsaved';

const fields = ['reps', 'seconds', 'metres', 'calories', 'load'] as const;
type Draft = {
  key: string;
  exerciseId: string;
  occurrence: string;
  reps: string;
  seconds: string;
  metres: string;
  calories: string;
  load: string;
  loadUnit: 'kg' | 'lb';
};
function draft(a: Actual): Draft {
  return {
    key: crypto.randomUUID(),
    exerciseId: a.exerciseId,
    occurrence: String(a.occurrence),
    reps: a.reps?.toString() ?? '',
    seconds: a.seconds?.toString() ?? '',
    metres: a.metres?.toString() ?? '',
    calories: a.calories?.toString() ?? '',
    load: a.load?.toString() ?? '',
    loadUnit: a.loadUnit ?? 'kg',
  };
}
export function PerformanceEditor({
  config,
  values,
  onSave,
  onClose,
}: {
  config: WorkoutConfig;
  values: Actual[];
  onSave: (values: Actual[]) => Promise<void>;
  onClose: () => void;
}) {
  const [rows, setRows] = useState(() =>
    values.length
      ? values.map(draft)
      : (config.exercises ?? []).map((e) => draft({ exerciseId: e.id, occurrence: 0 })),
  );
  const initial = useRef(JSON.stringify(rows));
  const editorRef = useRef<HTMLDivElement>(null);
  const [movementChange, setMovementChange] = useState<{ key: string; exerciseId: string } | null>(
    null,
  );
  const [invalidRow, setInvalidRow] = useState<string | null>(null);
  const changeMovement = (key: string, exerciseId: string) => {
    const exercise = config.exercises?.find((e) => e.id === exerciseId);
    setRows((current) =>
      current.map((row) => {
        if (row.key !== key) return row;
        const next = { ...row, exerciseId };
        for (const field of fields) {
          if (
            field !== 'load' &&
            exercise?.supportedUnits &&
            !exercise.supportedUnits.includes(field)
          )
            next[field] = '';
        }
        const limit = actualOccurrenceLimit(config, exerciseId);
        if (!/^\d+$/.test(next.occurrence) || Number(next.occurrence) > limit)
          next.occurrence = '0';
        return next;
      }),
    );
    setError('');
    setInvalidRow(null);
    setMovementChange(null);
  };
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const unsaved = useUnsavedChanges(JSON.stringify(rows) !== initial.current, busy);
  const close = () => unsaved.request(onClose);
  const patch = (i: number, v: Partial<Draft>) =>
    setRows((rows) => rows.map((row, j) => (i === j ? { ...row, ...v } : row)));
  return (
    <>
      <Dialog title="Record actual performance" className="session-dialog" onClose={close}>
        <div className="actual-editor" ref={editorRef}>
          <p>
            Enter what you did. Blank means not recorded; zero means none completed. These values do
            not change your targets.
          </p>
          <p>
            Record a block total or separate rounds and rungs. Use one approach per movement so
            totals are not counted twice.
          </p>
          {rows.map((row, i) => {
            const exercise = config.exercises?.find((e) => e.id === row.exerciseId);
            return (
              <section className="actual-row" key={row.key} data-actual-key={row.key}>
                <div className="actual-fields">
                  <label>
                    Movement
                    <select
                      value={row.exerciseId}
                      disabled={busy}
                      aria-label="Movement"
                      onChange={(e) => {
                        const exerciseId = e.target.value;
                        if (fields.some((f) => row[f].trim() !== '') || row.occurrence !== '0')
                          setMovementChange({ key: row.key, exerciseId });
                        else changeMovement(row.key, exerciseId);
                      }}
                    >
                      {config.exercises?.map((e) => (
                        <option key={e.id} value={e.id}>
                          {e.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Record for
                    <select
                      value={row.occurrence === '0' ? 'total' : 'round'}
                      onChange={(e) =>
                        patch(i, { occurrence: e.target.value === 'total' ? '0' : '1' })
                      }
                    >
                      <option value="total">Whole block</option>
                      <option
                        value="round"
                        disabled={!actualOccurrenceLimit(config, row.exerciseId)}
                      >
                        One movement round or rung
                      </option>
                    </select>
                  </label>
                  {row.occurrence !== '0' && (
                    <label>
                      Round or rung number
                      <input
                        className="input"
                        type="number"
                        min="1"
                        max="100000"
                        value={row.occurrence}
                        onChange={(e) => patch(i, { occurrence: e.target.value })}
                      />
                    </label>
                  )}
                </div>
                <div className="actual-fields">
                  {fields
                    .filter(
                      (field) =>
                        field === 'load' ||
                        !exercise?.supportedUnits ||
                        exercise.supportedUnits.includes(
                          field as 'reps' | 'seconds' | 'metres' | 'calories',
                        ),
                    )
                    .map((field) => (
                      <label key={field}>
                        {field === 'reps'
                          ? 'Reps'
                          : field === 'load'
                            ? 'Load'
                            : field[0].toUpperCase() + field.slice(1)}
                        <input
                          className="input"
                          inputMode="decimal"
                          value={row[field]}
                          onChange={(e) => patch(i, { [field]: e.target.value })}
                        />
                      </label>
                    ))}
                  <label>
                    Load unit
                    <select
                      value={row.loadUnit}
                      onChange={(e) => patch(i, { loadUnit: e.target.value as 'kg' | 'lb' })}
                    >
                      <option value="kg">kg</option>
                      <option value="lb">lb</option>
                    </select>
                  </label>
                </div>
                {invalidRow === row.key && error && <p role="alert">{error}</p>}
                <Button
                  disabled={busy}
                  variant="ghost"
                  onClick={() => setRows((rows) => rows.filter((_, j) => j !== i))}
                >
                  Remove entry {i + 1}
                </Button>
              </section>
            );
          })}
          {!!config.exercises?.length && (
            <Button
              variant="secondary"
              onClick={() =>
                setRows([
                  ...rows,
                  draft({
                    exerciseId: config.exercises![0].id,
                    occurrence: actualOccurrenceLimit(config, config.exercises![0].id) ? 1 : 0,
                  }),
                ])
              }
            >
              Add performance entry
            </Button>
          )}
          {error && !invalidRow && <p role="alert">{error}</p>}
          <div className="dialog-actions">
            <Button variant="ghost" disabled={busy} onClick={close}>
              Cancel
            </Button>
            <Button
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                setError('');
                setInvalidRow(null);
                let failingKey: string | null = null;
                try {
                  const values = rows
                    .filter((r) => fields.some((f) => r[f].trim() !== ''))
                    .map((row) => {
                      failingKey = row.key;
                      if (!/^\d+$/.test(row.occurrence))
                        throw new Error('Use a whole occurrence number.');
                      const a: Actual = {
                        exerciseId: row.exerciseId,
                        occurrence: Number(row.occurrence),
                      };
                      for (const f of fields)
                        if (row[f].trim() !== '') {
                          if (!/^\d+(\.\d+)?$/.test(row[f].trim()))
                            throw new Error('Enter nonnegative numbers without symbols.');
                          a[f] = Number(row[f]);
                        }
                      if (a.load !== undefined) a.loadUnit = row.loadUnit;
                      validateActualsForConfig(config, [a]);
                      return a;
                    });
                  for (const e of config.exercises ?? []) {
                    const entries = values.filter((a) => a.exerciseId === e.id);
                    failingKey =
                      rows.find(
                        (r) => r.exerciseId === e.id && fields.some((f) => r[f].trim() !== ''),
                      )?.key ?? null;
                    validateActualsForConfig(config, entries);
                  }
                  failingKey = null;
                  await onSave(values);
                  onClose();
                } catch (e) {
                  setError(String(e));
                  setInvalidRow(failingKey);
                  const element = failingKey
                    ? editorRef.current?.querySelector<HTMLElement>(
                        `[data-actual-key="${CSS.escape(failingKey)}"]`,
                      )
                    : editorRef.current;
                  element?.scrollIntoView({ block: 'center' });
                  element?.querySelector<HTMLElement>('input, select')?.focus();
                } finally {
                  setBusy(false);
                }
              }}
            >
              Save actual performance
            </Button>
          </div>
        </div>
      </Dialog>
      {movementChange && (
        <Dialog title="Change recorded movement?" onClose={() => setMovementChange(null)}>
          <p>
            Changing the movement clears values in unsupported units and resets an invalid round to
            a whole-block total. Compatible values, including load, are kept without conversion.
            Review them for the new movement before saving.
          </p>
          <div className="dialog-actions">
            <Button variant="secondary" onClick={() => setMovementChange(null)}>
              Keep movement
            </Button>
            <Button onClick={() => changeMovement(movementChange.key, movementChange.exerciseId)}>
              Change movement
            </Button>
          </div>
        </Dialog>
      )}
      {unsaved.confirmation}
    </>
  );
}
export function ActualSummary({ config, values }: { config: WorkoutConfig; values: Actual[] }) {
  if (!values.length) return <p className="muted">Actual performance not recorded.</p>;
  return (
    <ul>
      {values.map((a) => (
        <li key={`${a.exerciseId}:${a.occurrence}`}>
          <strong>{config.exercises?.find((e) => e.id === a.exerciseId)?.name}</strong> —{' '}
          {a.occurrence === 0 ? 'block total' : `round/rung ${a.occurrence}`}:{' '}
          {fields
            .filter((f) => a[f] !== undefined)
            .map((f) => `${a[f]} ${f === 'load' ? a.loadUnit : f}`)
            .join(', ')}
        </li>
      ))}
    </ul>
  );
}
