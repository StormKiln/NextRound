import { formatElapsed, type WorkoutConfig } from '@nextround/core';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { Dialog } from '@/components/dialog';
import { Button } from '@/components/ui/button';
import { csvCell } from '@/features/history/csv';
import { useCalendarNow } from '@/features/history/date-controls';
import { dateBounds } from '@/features/history/date-filters';
import { saveHistoryCsv } from '@/features/history/export-dialog';
import { useHistoryFilters } from '@/features/history/filter-state';
import { normalizeSearch } from '@/lib/search';
import { openSession } from './editor';
import { parseResult, type TrainingResult } from './model';
import { actualHighlights, compareActual, trainingComparisonKey } from './performance';
import { ActualSummary, PerformanceEditor } from './performance-editor';
import { mutateTraining, readTraining, trainingKey } from './repository';
import { useUnsavedChanges } from './unsaved';
export function filterTrainingResults(
  results: TrainingResult[],
  mode: string,
  search: string,
  bounds: { start: number; end: number } | null,
) {
  return results.filter(
    (r) =>
      (mode === 'all' || r.session.blocks.some((b) => (b.config.type ?? 'emom') === mode)) &&
      (!bounds || (r.completedAt >= bounds.start && r.completedAt < bounds.end)) &&
      normalizeSearch(
        [
          r.session.name,
          r.note,
          ...r.session.blocks.flatMap((b) => [
            b.name,
            ...(b.config.exercises ?? []).map((e) => e.name + ' ' + (e.description ?? '')),
          ]),
        ].join(' '),
      ).includes(normalizeSearch(search)),
  );
}
export function StandaloneActuals({ id, config }: { id: string; config: WorkoutConfig }) {
  const query = useQuery({ queryKey: trainingKey, queryFn: readTraining, retry: false });
  const client = useQueryClient();
  const [editing, setEditing] = useState(false);
  return (
    <section>
      <h3>Actual performance</h3>
      {query.error ? (
        <p role="alert">
          {String(query.error)}
          <Button onClick={() => void query.refetch()}>Retry actual performance</Button>
        </p>
      ) : (
        <ActualSummary config={config} values={query.data?.actuals[id] ?? []} />
      )}
      <Button
        variant="secondary"
        disabled={!query.data || !!query.error || !config.exercises?.length}
        onClick={() => setEditing(true)}
      >
        Record actual performance
      </Button>
      {editing && (
        <PerformanceEditor
          config={config}
          values={query.data?.actuals[id] ?? []}
          onClose={() => setEditing(false)}
          onSave={async (values) => {
            await mutateTraining((d) => {
              d.actuals[id] = values;
            });
            await client.invalidateQueries({ queryKey: trainingKey });
          }}
        />
      )}
    </section>
  );
}
export function SessionHistory() {
  const query = useQuery({ queryKey: trainingKey, queryFn: readTraining, retry: false });
  const client = useQueryClient();
  const navigate = useNavigate();
  const { mode, search, date } = useHistoryFilters();
  const now = useCalendarNow();
  const results = filterTrainingResults(
    query.data?.results ?? [],
    mode,
    search,
    dateBounds(date, now),
  ).sort((a, b) => b.completedAt - a.completedAt);
  const [selected, setSelected] = useState<TrainingResult | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [notes, setNotes] = useState(false);
  const unsaved = useUnsavedChanges(!!selected && note !== selected.note && !editing, busy);
  const closeResult = () =>
    unsaved.request(() => {
      setSelected(null);
      setDeleting(false);
    });
  async function update(next: TrainingResult) {
    await mutateTraining((d) => {
      const i = d.results.findIndex((r) => r.id === next.id);
      if (i < 0 || JSON.stringify(d.results[i]) !== JSON.stringify(selected))
        throw new Error('Result changed. Reopen it before saving.');
      d.results[i] = parseResult(next);
    });
    setSelected(next);
    await client.invalidateQueries({ queryKey: trainingKey });
  }
  return (
    <section className="session-history">
      {error && !selected && <p role="alert">{error}</p>}
      <h2>Training sessions</h2>
      <p className="muted">
        Uses the date, type and search filters above. Each full session counts once; partial work
        stays labelled.
      </p>
      {query.error && (
        <p role="alert">
          {String(query.error)}
          <Button onClick={() => void query.refetch()}>Retry session history</Button>
        </p>
      )}
      {!results.length && !query.isPending && !query.error && (
        <p>No training sessions match these filters.</p>
      )}
      <div className="session-cards">
        {results.map((r) => (
          <article className="session-card" key={r.id}>
            <h3>{r.session.name}</h3>
            <p>{new Date(r.completedAt).toLocaleString()}</p>
            <p>
              {r.blocks.every((b) => b.status === 'complete') ? 'Complete' : 'Partial'} ·{' '}
              {r.blocks.length} blocks ·{' '}
              {formatElapsed(r.blocks.reduce((sum, b) => sum + b.elapsedMs, 0))} workout time
            </p>
            <Button
              variant="secondary"
              onClick={() => {
                setSelected(r);
                setNote(r.note);
                setError('');
                setDeleting(false);
              }}
            >
              View session result
            </Button>
          </article>
        ))}
      </div>
      {!!results.length && (
        <div className="session-add">
          <label>
            <input type="checkbox" checked={notes} onChange={(e) => setNotes(e.target.checked)} />{' '}
            Include private session notes in CSV
          </label>
          <Button
            variant="secondary"
            onClick={() => {
              const headers = [
                'session_id',
                'completed_at',
                'session',
                'block',
                'status',
                'elapsed_ms',
                'exercise',
                'occurrence',
                'reps',
                'seconds',
                'metres',
                'calories',
                'load',
                'load_unit',
                ...(notes ? ['note'] : []),
              ];
              const rows = results.flatMap((r) =>
                r.blocks.flatMap((b) => {
                  const block = r.session.blocks.find((block) => block.id === b.blockId)!;
                  return (b.actuals.length ? b.actuals : [null]).map((a) =>
                    [
                      r.id,
                      new Date(r.completedAt).toISOString(),
                      r.session.name,
                      block.name,
                      b.status,
                      b.elapsedMs,
                      a
                        ? (block.config.exercises?.find((e) => e.id === a.exerciseId)?.name ?? '')
                        : '',
                      a?.occurrence ?? '',
                      a?.reps ?? '',
                      a?.seconds ?? '',
                      a?.metres ?? '',
                      a?.calories ?? '',
                      a?.load ?? '',
                      a?.loadUnit ?? '',
                      ...(notes ? [r.note] : []),
                    ]
                      .map(csvCell)
                      .join(','),
                  );
                }),
              );
              const raw = '\uFEFF' + [headers.join(','), ...rows].join('\r\n') + '\r\n';
              void saveHistoryCsv(raw).catch((e) => setError(String(e)));
            }}
          >
            Export filtered session CSV
          </Button>
        </div>
      )}
      {unsaved.confirmation}
      {selected && (
        <Dialog title={selected.session.name} className="session-dialog" onClose={closeResult}>
          <div className="actual-editor">
            {selected.blocks.map((b, index) => {
              const block = selected.session.blocks.find((block) => block.id === b.blockId)!;
              const comparable = (query.data?.results ?? [])
                .filter(
                  (r) =>
                    r.id !== selected.id &&
                    r.completedAt < selected.completedAt &&
                    trainingComparisonKey(r.session) === trainingComparisonKey(selected.session) &&
                    r.blocks.every((b) => b.status === 'complete'),
                )
                .sort((a, b) => b.completedAt - a.completedAt)[0];
              const previous = comparable?.blocks[index];
              return (
                <section className="session-result-block" key={b.blockId}>
                  <h3>{block.name}</h3>
                  <p>
                    {b.status} · {formatElapsed(b.elapsedMs)} workout time
                  </p>
                  <ActualSummary config={block.config} values={b.actuals} />
                  {actualHighlights(selected, query.data?.results ?? [], b.blockId).map(
                    (message) => (
                      <p key={message} role="status">
                        {message}
                      </p>
                    ),
                  )}
                  <Button
                    variant="secondary"
                    disabled={!block.config.exercises?.length}
                    onClick={() => setEditing(block.id)}
                  >
                    Edit actuals for {block.name}
                  </Button>
                  {previous && selected.blocks.every((b) => b.status === 'complete') ? (
                    <div>
                      <h4>
                        Previous matching attempt:{' '}
                        {new Date(comparable.completedAt).toLocaleDateString()}
                      </h4>
                      {b.actuals.map((a) => {
                        const ei =
                          block.config.exercises?.findIndex((e) => e.id === a.exerciseId) ?? -1;
                        const oldExercise = comparable.session.blocks[index].config.exercises?.[ei];
                        const old = previous.actuals.find(
                          (v) => v.exerciseId === oldExercise?.id && v.occurrence === a.occurrence,
                        );
                        const delta = old ? compareActual(a, old, 'reps') : null;
                        return delta === null ? null : (
                          <p key={`${a.exerciseId}:${a.occurrence}`}>
                            {block.config.exercises?.[ei]?.name}:{' '}
                            {delta === 0
                              ? 'Same reps'
                              : `${Math.abs(delta)} ${delta > 0 ? 'more' : 'fewer'} reps`}{' '}
                            at the same recorded load.
                          </p>
                        );
                      })}
                      <p>
                        Changed prescriptions, incomplete sessions and missing values are not
                        ranked.
                      </p>
                    </div>
                  ) : (
                    <p>No earlier complete matching session to compare.</p>
                  )}
                </section>
              );
            })}
            <label htmlFor="session-result-note">Session note</label>
            <textarea
              id="session-result-note"
              className="input"
              maxLength={2000}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            {error && <p role="alert">{error}</p>}
            {deleting && (
              <p role="alert">
                Delete this session result permanently? Its saved session template will remain.
              </p>
            )}
            <div className="dialog-actions">
              <Button variant="ghost" disabled={busy} onClick={closeResult}>
                Close result
              </Button>
              <Button
                variant="secondary"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  setError('');
                  try {
                    await update({ ...selected, note });
                  } catch (e) {
                    setError(String(e));
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Save session note
              </Button>
              <Button
                disabled={busy}
                onClick={() =>
                  unsaved.request(() => {
                    openSession({ ...selected.session, id: crypto.randomUUID() });
                    setSelected(null);
                    void navigate({ to: '/sessions' });
                  })
                }
              >
                Repeat session from setup
              </Button>
              <Button
                variant="destructive"
                disabled={busy}
                onClick={async () => {
                  if (!deleting) {
                    setDeleting(true);
                    return;
                  }
                  setBusy(true);
                  try {
                    await mutateTraining((d) => {
                      const current = d.results.find((r) => r.id === selected.id);
                      if (JSON.stringify(current) !== JSON.stringify(selected))
                        throw new Error('Result changed. Reopen before deleting.');
                      d.results = d.results.filter((r) => r.id !== selected.id);
                    });
                    await client.invalidateQueries({ queryKey: trainingKey });
                    setSelected(null);
                  } catch (e) {
                    setError(String(e));
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                {deleting ? 'Confirm delete session result' : 'Delete session result'}
              </Button>
            </div>
          </div>
          {editing && (
            <PerformanceEditor
              config={selected.session.blocks.find((b) => b.id === editing)!.config}
              values={selected.blocks.find((b) => b.blockId === editing)!.actuals}
              onClose={() => setEditing(null)}
              onSave={async (actuals) => {
                await update({
                  ...selected,
                  blocks: selected.blocks.map((b) =>
                    b.blockId === editing ? { ...b, actuals } : b,
                  ),
                });
              }}
            />
          )}
        </Dialog>
      )}
    </section>
  );
}
