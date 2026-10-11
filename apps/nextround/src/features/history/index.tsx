import {
  countLabel,
  formatAmrapProgress,
  formatElapsed,
  formatTarget,
  formatTime,
} from '@nextround/core';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Dialog } from '@/components/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LadderResult } from '@/features/ladder/progress';
import { fullscreen } from '@/native/adapter';
import { useWorkout } from '@/state/workout';
import { ComparisonView } from './comparison-view';
import { filterHistory, type HistoryMode } from './filters';
import { NoteEditor } from './note-editor';
import {
  copyResult,
  historyKey,
  mutateHistory,
  readHistory,
  type WorkoutResult,
} from './repository';
import '../templates/templates.css';
import './history.css';

const modeName = (result: WorkoutResult) =>
  result.config.type === 'ladder'
    ? 'Ladder'
    : result.config.type === 'forTime'
      ? 'For Time'
      : result.config.type === 'amrap'
        ? 'AMRAP'
        : result.config.type === 'countdown'
          ? 'Countdown'
          : result.config.type === 'intervals'
            ? 'Intervals'
            : 'EMOM';
export function History() {
  const query = useQuery({ queryKey: historyKey, queryFn: readHistory, retry: false });
  const client = useQueryClient();
  const mutation = useMutation({
    mutationFn: mutateHistory,
    onSuccess: () => client.invalidateQueries({ queryKey: historyKey }),
  });
  const navigate = useNavigate();
  const repeatLock = useRef(false);
  const mounted = useRef(true);
  const [repeating, setRepeating] = useState(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const comparisonOrigin = useRef<HTMLButtonElement | null>(null);
  const historyHeading = useRef<HTMLHeadingElement>(null);
  const [comparisonId, setComparisonId] = useState<string | null>(null);
  const [detail, setDetail] = useState<WorkoutResult | null>(null);
  const [editingNote, setEditingNote] = useState<WorkoutResult | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const refreshLock = useRef(false);
  const [deleting, setDeleting] = useState<WorkoutResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [mode, setMode] = useState<HistoryMode>('all');
  const [search, setSearch] = useState('');
  const allResults = query.data?.results ?? [];
  const results = filterHistory(allResults, mode, search);
  const filtered = mode !== 'all' || search.trim() !== '';
  const [returnFocus, setReturnFocus] = useState(false);
  const restoreFocus = useCallback(() => setReturnFocus(true), []);
  useEffect(() => {
    if (!returnFocus || detail || deleting || editingNote || comparisonId) return;
    const frame = requestAnimationFrame(() => {
      const origin = comparisonOrigin.current;
      (origin?.isConnected ? origin : historyHeading.current)?.focus({ preventScroll: true });
      setReturnFocus(false);
    });
    return () => cancelAnimationFrame(frame);
  }, [returnFocus, detail, deleting, editingNote, comparisonId]);
  const closeDetail = useCallback(() => {
    setDetail(null);
    restoreFocus();
  }, [restoreFocus]);
  async function refresh() {
    if (refreshLock.current) return;
    refreshLock.current = true;
    setRefreshing(true);
    setError(null);
    try {
      const document = await readHistory();
      client.setQueryData(historyKey, document);
      if (detail) {
        const latest = document.results.find((entry) => entry.id === detail.id);
        if (latest) setDetail(latest);
        else {
          setNotice('This result is no longer in history.');
          closeDetail();
        }
      }
      if (deleting && !document.results.some((entry) => entry.id === deleting.id)) {
        setDeleting(null);
        setNotice('This result is no longer in history.');
        restoreFocus();
      }
    } catch (e) {
      setError(String(e));
    } finally {
      refreshLock.current = false;
      setRefreshing(false);
    }
  }
  useEffect(() => {
    if (!detail || editingNote || !query.data || query.isError) return;
    const latest = query.data.results.find((entry) => entry.id === detail.id);
    if (latest) setDetail(latest);
    else {
      setNotice('This result is no longer in history.');
      closeDetail();
    }
  }, [query.data, editingNote, query.isError, detail, closeDetail]);
  function resetFilters() {
    setMode('all');
    setSearch('');
  }
  return (
    <main className="page history-page">
      <p className="eyebrow">Your training, remembered</p>
      <h1 ref={historyHeading} tabIndex={-1}>
        Workout history
      </h1>
      <p>Completed sessions you chose to save. Stored on this Mac.</p>
      {notice && !detail && <p role="status">{notice}</p>}
      {!!allResults.length && (
        <section className="history-filters" aria-label="Filter history">
          <div>
            <label htmlFor="history-mode">Workout type</label>
            <select
              id="history-mode"
              value={mode}
              onChange={(e) => setMode(e.target.value as HistoryMode)}
            >
              <option value="all">All workouts</option>
              <option value="emom">EMOM</option>
              <option value="countdown">Countdown</option>
              <option value="intervals">Intervals</option>
              <option value="amrap">AMRAP</option>
              <option value="forTime">For Time</option>
              <option value="ladder">Ladder</option>
            </select>
          </div>
          <div>
            <label htmlFor="history-search">Search history</label>
            <Input
              id="history-search"
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Exercise name, description or note"
            />
          </div>
          <Button variant="secondary" onClick={resetFilters} disabled={!filtered}>
            Reset filters
          </Button>
          <p role="status">
            {results.length} of {allResults.length} saved results
          </p>
        </section>
      )}
      <Button
        variant="secondary"
        disabled={refreshing || query.isFetching}
        onClick={() => void refresh()}
      >
        Refresh history
      </Button>
      {error && !detail && !deleting && <p role="alert">{error}</p>}
      {query.isPending && <p role="status">Loading workout history…</p>}
      {query.isError && (
        <div role="alert">
          <p>{String(query.error)}</p>
          <Button onClick={() => void query.refetch()}>Retry history</Button>
        </div>
      )}
      {!query.isPending && !query.isError && results.length === 0 && (
        <section className="history-empty">
          <h2>{filtered ? 'No results match these filters.' : 'No saved results yet.'}</h2>
          {filtered ? (
            <p>Try another workout type or search term.</p>
          ) : (
            <>
              <p>Finish a workout and choose Save result to start your training log.</p>
              <Button onClick={() => void navigate({ to: '/' })}>Choose a workout</Button>
            </>
          )}
          {filtered && !allResults.length && <Button onClick={resetFilters}>Reset filters</Button>}
        </section>
      )}
      <ul className="template-list history-list">
        {(!query.isError ? results : []).map((result, index) => (
          <li key={result.id}>
            <div className="template-summary">
              <h2>{modeName(result)}</h2>
              <p>
                <time dateTime={new Date(result.completedAt).toISOString()}>
                  {new Date(result.completedAt).toLocaleString()}
                </time>
              </p>
              <p>
                {result.config.type === 'forTime' || result.config.type === 'ladder'
                  ? formatElapsed(result.elapsedMs)
                  : formatTime(result.elapsedMs)}{' '}
                active time · {countLabel(result.config.exercises?.length ?? 0, 'exercise')}
                {result.outcome &&
                  ` · ${result.outcome === 'finished' ? 'Finished' : 'Time cap reached'}`}
              </p>
            </div>
            <div className="template-actions">
              <Button
                variant="secondary"
                aria-label={`View result: ${modeName(result)}, ${new Date(result.completedAt).toLocaleString()}, session ${index + 1}`}
                onClick={(event) => {
                  setNotice(null);
                  comparisonOrigin.current = event.currentTarget;
                  setError(null);
                  setDetail(result);
                }}
              >
                View result
              </Button>
              <Button
                variant="ghost"
                aria-label={`Delete result: ${modeName(result)}, ${new Date(result.completedAt).toLocaleString()}, session ${index + 1}`}
                onClick={(event) => {
                  setNotice(null);
                  comparisonOrigin.current = event.currentTarget;
                  setError(null);
                  setDeleting(result);
                }}
              >
                Delete result
              </Button>
            </div>
          </li>
        ))}
      </ul>
      {comparisonId && (
        <ComparisonView
          resultId={comparisonId}
          onClose={() => {
            setComparisonId(null);
            requestAnimationFrame(() => {
              if (!mounted.current) return;
              const origin = comparisonOrigin.current;
              (origin?.isConnected ? origin : historyHeading.current)?.focus({
                preventScroll: true,
              });
            });
          }}
        />
      )}
      {detail && (
        <Dialog
          title={`${modeName(detail)} result`}
          onClose={() => {
            if (!repeatLock.current && !refreshLock.current) closeDetail();
          }}
          className="history-detail"
        >
          <div className="history-detail-body">
            <section aria-label="Saved workout note">
              <h3>Workout note</h3>
              <p className="history-note">{detail.note || 'No note yet.'}</p>
              <Button
                variant="secondary"
                disabled={repeating || refreshing}
                onClick={() => setEditingNote(detail)}
              >
                {detail.note ? 'Edit note' : 'Add note'}
              </Button>
            </section>
            <p>
              {new Date(detail.completedAt).toLocaleString()} ·{' '}
              {detail.config.type === 'forTime' || detail.config.type === 'ladder'
                ? formatElapsed(detail.elapsedMs)
                : formatTime(detail.elapsedMs)}{' '}
              active workout time
            </p>
            <p>
              {detail.config.type === 'forTime' || detail.config.type === 'ladder'
                ? `${detail.outcome === 'finished' ? 'Finished' : 'Time cap reached'} · ${detail.config.timeCapSeconds ? `${formatTime(detail.config.timeCapSeconds * 1000)} cap` : 'No time cap'}`
                : detail.config.type === 'amrap' && detail.amrapProgress
                  ? formatAmrapProgress(detail.config, detail.amrapProgress)
                  : detail.config.type === 'intervals'
                    ? `${countLabel(detail.config.rounds, 'round')} · ${detail.config.workSeconds}s work / ${detail.config.restSeconds}s rest`
                    : detail.config.type !== 'countdown' && detail.config.type !== 'amrap'
                      ? `${countLabel(detail.config.minutes, 'one-minute round')}`
                      : `${detail.config.durationSeconds}s countdown`}
            </p>
            <p>
              Lead-in: {detail.config.leadInSeconds}s · Warning: {detail.config.warningSeconds}s
            </p>
            <p className="muted">
              Targets are your planned work, not measured results. Checkmarks record what you ticked
              off.
            </p>
            {detail.config.type === 'ladder' && (
              <LadderResult
                config={detail.config}
                completed={detail.ladderCompletedMovements ?? 0}
              />
            )}
            <ol className="history-exercises">
              {detail.config.exercises?.map((exercise) => (
                <li key={exercise.id}>
                  <strong>{exercise.name}</strong>
                  {exercise.target && <span> · Target: {formatTarget(exercise.target)}</span>}
                  {exercise.description && <p>{exercise.description}</p>}
                  {(detail.config.type === 'countdown' || detail.config.type === 'forTime') &&
                    detail.config.showChecklist !== false && (
                      <p>
                        {detail.checkedExerciseIds.includes(exercise.id)
                          ? 'Checked off'
                          : 'Not checked off'}
                      </p>
                    )}
                </li>
              ))}
            </ol>
            {!detail.config.exercises?.length && <p>No exercises were specified.</p>}
          </div>
          {notice && <p role="status">{notice}</p>}
          {error && <p role="alert">{error}</p>}
          <div className="dialog-actions">
            <Button
              variant="secondary"
              disabled={repeating || refreshing}
              onClick={() => void refresh()}
            >
              Refresh history
            </Button>
            <Button
              variant="secondary"
              disabled={repeating || refreshing}
              onClick={() => {
                setComparisonId(detail.id);
                setDetail(null);
              }}
            >
              Compare attempts
            </Button>
            <Button variant="ghost" disabled={repeating || refreshing} onClick={closeDetail}>
              Close
            </Button>
            <Button
              disabled={repeating || refreshing}
              onClick={async () => {
                if (repeatLock.current) return;
                repeatLock.current = true;
                setRepeating(true);
                setError(null);
                try {
                  const latest = (await readHistory()).results.find(
                    (result) => result.id === detail.id,
                  );
                  if (!mounted.current) return;
                  if (!latest)
                    throw new Error('This result no longer exists. Refresh and try again.');
                  const copy = copyResult(latest);
                  if (!useWorkout.getState().loadConfig(copy.config))
                    throw new Error('Finish your workout and save or discard its result first.');
                  await fullscreen(false);
                  if (!mounted.current) return;
                  void navigate({
                    to:
                      copy.config.type === 'ladder'
                        ? '/ladder'
                        : copy.config.type === 'forTime'
                          ? '/for-time'
                          : copy.config.type === 'amrap'
                            ? '/amrap'
                            : copy.config.type === 'intervals'
                              ? '/intervals'
                              : copy.config.type === 'countdown'
                                ? '/countdown'
                                : '/emom',
                  });
                } catch (e) {
                  if (mounted.current) setError(String(e));
                } finally {
                  repeatLock.current = false;
                  if (mounted.current) setRepeating(false);
                }
              }}
            >
              {repeating ? 'Loading workout…' : 'Repeat from setup'}
            </Button>
          </div>
        </Dialog>
      )}
      {deleting && (
        <Dialog
          title="Delete this result?"
          onClose={() => {
            if (!mutation.isPending && !refreshLock.current) {
              setDeleting(null);
              restoreFocus();
            }
          }}
        >
          <p>
            This removes the saved {modeName(deleting)} session from{' '}
            {new Date(deleting.completedAt).toLocaleString()}. Your saved workout templates are
            kept.
          </p>
          {error && (
            <div role="alert">
              <p>{error}</p>
              <Button disabled={mutation.isPending || refreshing} onClick={() => void refresh()}>
                Refresh history
              </Button>
            </div>
          )}
          <div className="dialog-actions">
            <Button
              variant="ghost"
              disabled={mutation.isPending || refreshing}
              onClick={() => {
                setDeleting(null);
                restoreFocus();
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={mutation.isPending || refreshing}
              onClick={async () => {
                setError(null);
                try {
                  await mutation.mutateAsync({ action: 'delete', id: deleting.id });
                  setDeleting(null);
                  restoreFocus();
                } catch (e) {
                  setError(String(e));
                }
              }}
            >
              {mutation.isPending ? 'Deleting…' : 'Delete permanently'}
            </Button>
          </div>
        </Dialog>
      )}
      {editingNote && (
        <NoteEditor
          result={editingNote}
          onClose={() => setEditingNote(null)}
          onSaved={() => setNotice('Workout note saved.')}
        />
      )}
    </main>
  );
}
