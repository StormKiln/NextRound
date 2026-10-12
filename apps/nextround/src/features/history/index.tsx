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
import { mutateHistoryIntoCache, readHistoryIntoCache } from './cache';
import { ComparisonView } from './comparison-view';
import { DateControls, useCalendarNow } from './date-controls';
import { dateBounds } from './date-filters';
import { useHistoryFilters } from './filter-state';
import { filterHistory, type HistoryMode } from './filters';
import { NoteEditor } from './note-editor';
import {
  copyResult,
  type HistoryMutation,
  historyKey,
  readHistory,
  type WorkoutResult,
} from './repository';
import { formatWorkoutTime, summarizeHistory } from './summary';
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
    mutationFn: (input: HistoryMutation) => mutateHistoryIntoCache(client, input),
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
  const deleteLock = useRef(false);
  const [deleting, setDeleting] = useState<WorkoutResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const dialogError = error ?? (query.isError ? String(query.error) : null);
  const [notice, setNotice] = useState<string | null>(null);
  const { mode, search, date, draftPreset, start, end, reset } = useHistoryFilters();
  const now = useCalendarNow();
  const allResults = query.data?.results ?? [];
  const results = filterHistory(allResults, mode, search, dateBounds(date, now));
  const summary = summarizeHistory(results);
  const stale = query.isError;
  const filtered = mode !== 'all' || search.trim() !== '' || date.preset !== 'all';
  const canReset = filtered || draftPreset !== 'all' || !!start || !!end;
  const compareButton = useRef<HTMLButtonElement>(null);
  const detailBody = useRef<HTMLDivElement>(null);
  const detailScroll = useRef(0);
  const [returnToDetail, setReturnToDetail] = useState(false);
  useEffect(() => {
    if (!returnToDetail || !detail || comparisonId) return;
    const frame = requestAnimationFrame(() => {
      if (detailBody.current) detailBody.current.scrollTop = detailScroll.current;
      compareButton.current?.focus({ preventScroll: true });
      setReturnToDetail(false);
    });
    return () => cancelAnimationFrame(frame);
  }, [returnToDetail, detail, comparisonId]);
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
    if (refreshLock.current || deleteLock.current) return;
    refreshLock.current = true;
    setRefreshing(true);
    setError(null);
    setNotice(null);
    try {
      const document = await readHistoryIntoCache(client, () => mounted.current);
      if (!mounted.current) return;
      setNotice('History refreshed.');
      if (detail) {
        const latest = document.results.find((entry) => entry.id === detail.id);
        if (latest) setDetail(latest);
        else {
          setNotice('This result is no longer in history.');
          closeDetail();
        }
      }
      if (deleting) {
        const latest = document.results.find((entry) => entry.id === deleting.id);
        setDeleting(latest ?? null);
        setNotice(
          latest
            ? 'History refreshed. Review this result before confirming deletion.'
            : 'This result is no longer in history.',
        );
        if (!latest) restoreFocus();
      }
    } catch {
      // The coordinator exposes read errors through the shared query, including dialogs.
    } finally {
      refreshLock.current = false;
      if (mounted.current) setRefreshing(false);
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
    reset();
  }
  return (
    <main className="page history-page">
      <p className="eyebrow">Your training, remembered</p>
      <h1 ref={historyHeading} tabIndex={-1}>
        Workout history
      </h1>
      <p>Completed sessions you chose to save. Stored on this Mac.</p>
      {notice && !detail && <p role="status">{notice}</p>}
      {
        <section className="history-filters" aria-label="Filter history">
          <div>
            <label htmlFor="history-mode">Workout type</label>
            <select
              id="history-mode"
              value={mode}
              onChange={(e) => useHistoryFilters.setState({ mode: e.target.value as HistoryMode })}
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
              onChange={(e) => useHistoryFilters.setState({ search: e.target.value })}
              placeholder="Exercise name, description or note"
            />
          </div>
          <DateControls now={now} />
          <Button variant="secondary" onClick={resetFilters} disabled={!canReset}>
            Reset filters
          </Button>
          {query.data && (
            <p role="status">
              {results.length} of {allResults.length} saved results
              {stale ? ' (previously loaded)' : ''}
            </p>
          )}
        </section>
      }
      {query.data && (
        <section className="history-summary" aria-label="Training summary">
          <h2>Training summary</h2>
          {stale && <p role="status">Previously loaded history. It may be out of date.</p>}
          <dl>
            <div>
              <dt>Saved sessions</dt>
              <dd>{summary.sessions.toLocaleString()}</dd>
            </div>
            <div>
              <dt>Workout time</dt>
              <dd>{formatWorkoutTime(summary.elapsedMs)}</dd>
            </div>
            <div>
              <dt>Active days</dt>
              <dd>{summary.activeDays.toLocaleString()}</dd>
            </div>
          </dl>
          <p className="muted">
            Based on the results matching your applied filters. Workout time includes programmed
            rest, excludes pauses and lead-in, and is not a measure of exercise effort. Active days
            use each session’s completion date in your local time zone.
          </p>
        </section>
      )}
      <Button
        variant="secondary"
        disabled={refreshing || query.isFetching || mutation.isPending}
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
      {query.data && !stale && results.length === 0 && (
        <section className="history-empty">
          <h2>{filtered ? 'No results match these filters.' : 'No saved results yet.'}</h2>
          {filtered ? (
            <p>Try another date range, workout type or search term.</p>
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
        {results.map((result, index) => (
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
          onClose={async () => {
            const document = await readHistoryIntoCache(client, () => mounted.current);
            if (!mounted.current) return;
            setComparisonId(null);
            setError(null);
            const latest = document.results.find((result) => result.id === comparisonId);
            if (latest) {
              setDetail(latest);
              setNotice(null);
              setReturnToDetail(true);
            } else {
              setNotice('This result is no longer in history.');
              restoreFocus();
            }
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
          initialFocus={returnToDetail ? compareButton : undefined}
        >
          <div ref={detailBody} className="history-detail-body">
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
            <ResultSnapshot result={detail} />
          </div>
          {notice && <p role="status">{notice}</p>}
          {dialogError && <p role="alert">{dialogError}</p>}
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
              ref={compareButton}
              onClick={() => {
                detailScroll.current = detailBody.current?.scrollTop ?? 0;
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
          className="history-detail"
          onClose={() => {
            if (!deleteLock.current && !refreshLock.current) {
              setDeleting(null);
              restoreFocus();
            }
          }}
        >
          <div className="history-detail-body">
            <p>
              This removes the saved {modeName(deleting)} session from{' '}
              {new Date(deleting.completedAt).toLocaleString()}. Your saved workout templates are
              kept.
            </p>
            <p className="history-note">{deleting.note || 'No note yet.'}</p>
            <ResultSnapshot result={deleting} />
          </div>
          {notice && <p role="status">{notice}</p>}
          {dialogError && (
            <div role="alert">
              <p>{dialogError}</p>
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
                if (deleteLock.current || refreshLock.current) return;
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
                if (deleteLock.current || refreshLock.current) return;
                deleteLock.current = true;
                setError(null);
                try {
                  await mutation.mutateAsync({
                    action: 'delete',
                    id: deleting.id,
                    expected: deleting,
                  });
                  if (mounted.current) {
                    setDeleting(null);
                    restoreFocus();
                    setNotice('Result deleted.');
                  }
                } catch (e) {
                  if (mounted.current) setError(String(e));
                } finally {
                  deleteLock.current = false;
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

function ResultSnapshot({ result }: { result: WorkoutResult }) {
  return (
    <>
      <p>
        {new Date(result.completedAt).toLocaleString()} ·{' '}
        {result.config.type === 'forTime' || result.config.type === 'ladder'
          ? formatElapsed(result.elapsedMs)
          : formatTime(result.elapsedMs)}{' '}
        active workout time
      </p>
      <p>
        {result.config.type === 'forTime' || result.config.type === 'ladder'
          ? `${result.outcome === 'finished' ? 'Finished' : 'Time cap reached'} · ${result.config.timeCapSeconds ? `${formatTime(result.config.timeCapSeconds * 1000)} cap` : 'No time cap'}`
          : result.config.type === 'amrap' && result.amrapProgress
            ? formatAmrapProgress(result.config, result.amrapProgress)
            : result.config.type === 'intervals'
              ? `${countLabel(result.config.rounds, 'round')} · ${result.config.workSeconds}s work / ${result.config.restSeconds}s rest`
              : result.config.type !== 'countdown' && result.config.type !== 'amrap'
                ? `${countLabel(result.config.minutes, 'one-minute round')}`
                : `${result.config.durationSeconds}s countdown`}
      </p>
      <p>
        Lead-in: {result.config.leadInSeconds}s · Warning: {result.config.warningSeconds}s
      </p>
      <p className="muted">
        Targets are your planned work, not measured results. Checkmarks record what you ticked off.
      </p>
      {result.config.type === 'ladder' && (
        <LadderResult config={result.config} completed={result.ladderCompletedMovements ?? 0} />
      )}
      <ol className="history-exercises">
        {result.config.exercises?.map((exercise) => (
          <li key={exercise.id}>
            <strong>{exercise.name}</strong>
            {exercise.target && <span> · Target: {formatTarget(exercise.target)}</span>}
            {exercise.description && <p>{exercise.description}</p>}
            {(result.config.type === 'countdown' || result.config.type === 'forTime') &&
              result.config.showChecklist !== false && (
                <p>
                  {result.checkedExerciseIds.includes(exercise.id)
                    ? 'Checked off'
                    : 'Not checked off'}
                </p>
              )}
          </li>
        ))}
      </ol>
      {!result.config.exercises?.length && <p>No exercises were specified.</p>}
    </>
  );
}
