import { type ExerciseEntry, formatTarget } from '@nextround/core';
import { useEffect, useRef, useState } from 'react';
import { Dialog } from '@/components/dialog';
import { Button } from '@/components/ui/button';
import { eligibleExercise, equipmentNote } from '@/data/equipment';
import { exercises } from '@/data/exercises';
import { type FocusArea, matchesFocus, type PickerView } from '@/data/focus';
import { mergeLibrary, useExerciseLibrary } from '../exercises/library';
import { readPersonalExercises } from '../exercises/repository';
import { useEquipment } from '../settings/equipment-store';
import { Settings } from '../settings/settings';
import { ExerciseAlternatives } from '../setup/exercise-alternatives';
import { ExerciseGroups } from '../setup/exercise-picker';
import { matchesExercise } from '../setup/exercise-suggestions';
import { FocusControls } from '../setup/focus-controls';
import { TargetDialog } from '../setup/target-dialog';
import { workoutSummary } from '../templates/workout-details';
import {
  previewReplacements,
  type ReplacementChange,
  sessionOccurrences,
} from './exercise-replacement';
import type { TrainingSession } from './model';

export function ReplacementDialog({
  session,
  onClose,
  onApply,
}: {
  session: TrainingSession;
  onClose: () => void;
  onApply: (changes: ReplacementChange[]) => void;
}) {
  const rows = sessionOccurrences(session);
  const identities = [...new Set(rows.map((r) => r.identity))];
  const [identity, setIdentity] = useState(identities[0] ?? '');
  const [keys, setKeys] = useState(
    rows.filter((r) => r.identity === identities[0]).map((r) => r.key),
  );
  const [search, setSearch] = useState('');
  const [view, setView] = useState<PickerView>('type');
  const [areas, setAreas] = useState<FocusArea[]>([]);
  const [override, setOverride] = useState<boolean | null>(null);
  const [review, setReview] = useState<{
    selected: ExerciseEntry;
    changes: ReplacementChange[];
  } | null>(null);
  const [targetKey, setTargetKey] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [equipmentSettings, setEquipmentSettings] = useState(false);
  const mounted = useRef(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const selector = useRef<HTMLSelectElement>(null);
  const equipment = useEquipment();
  const { library, personal, bundled } = useExerciseLibrary();
  useEffect(() => {
    mounted.current = true;
    equipment.load();
    return () => {
      mounted.current = false;
    };
  }, [equipment.load]);
  useEffect(() => {
    if (review) heading.current?.focus();
  }, [review]);
  const showAll = override ?? equipment.selection === null;
  const occurrences = rows.filter((r) => r.identity === identity);
  const needsReps = rows.some((r) => keys.includes(r.key) && r.block.config.type === 'ladder');
  const available = library.filter(
    (e) =>
      (showAll || eligibleExercise(e, equipment.selection ?? [])) &&
      matchesFocus(e, areas) &&
      matchesExercise(e, search) &&
      (!needsReps || !e.supportedUnits || e.supportedUnits.includes('reps')),
  );
  function choose(selected: ExerciseEntry) {
    if (!keys.length) return;
    try {
      const changes = previewReplacements(session, keys, selected);
      setReview({ selected: structuredClone(selected), changes });
      setError('');
    } catch (e) {
      setError(String(e));
    }
  }
  const target = review?.changes.find((c) => c.key === targetKey);
  const targetRow = rows.find((r) => r.key === targetKey);
  async function apply() {
    if (!review || busy) return;
    setBusy(true);
    setError('');
    try {
      const latest = review.selected.id.startsWith('personal:')
        ? mergeLibrary((await readPersonalExercises()).exercises)
        : exercises;
      if (!mounted.current) return;
      const current = latest.find((e) => e.id === review.selected.id);
      if (!current || JSON.stringify(current) !== JSON.stringify(review.selected))
        throw new Error(
          'Replacement exercise changed or was removed. Choose it again and review its targets.',
        );
      onApply(review.changes);
    } catch (e) {
      if (mounted.current) setError(String(e));
    } finally {
      if (mounted.current) setBusy(false);
    }
  }
  return (
    <Dialog
      title="Replace across session"
      className="session-replacement"
      onClose={onClose}
      initialFocus={selector}
    >
      <p>Change selected occurrences in this draft. Saved workouts and results stay unchanged.</p>
      <div className="replacement-body">
        {!review ? (
          <>
            <label>
              Movement to replace
              <select
                ref={selector}
                value={identity}
                onChange={(e) => {
                  setIdentity(e.target.value);
                  setKeys(rows.filter((r) => r.identity === e.target.value).map((r) => r.key));
                  setError('');
                }}
              >
                {identities.map((id) => {
                  const matching = rows.filter((r) => r.identity === id);
                  return (
                    <option key={id} value={id}>
                      {matching[0].entry.name} ({matching.length}{' '}
                      {matching.length === 1 ? 'occurrence' : 'occurrences'})
                      {matching[0].entry.catalogId
                        ? ''
                        : ` — Block ${session.blocks.indexOf(matching[0].block) + 1}: ${matching[0].block.name}, movement ${matching[0].block.config.exercises!.indexOf(matching[0].entry) + 1}`}
                    </option>
                  );
                })}
              </select>
            </label>
            <fieldset>
              <legend>Occurrences to replace</legend>
              {occurrences.map((row) => (
                <label className="membership-option" key={row.key}>
                  <input
                    type="checkbox"
                    aria-label={`Replace in block ${session.blocks.indexOf(row.block) + 1}: ${row.block.name}, movement ${row.block.config.exercises!.indexOf(row.entry) + 1}`}
                    checked={keys.includes(row.key)}
                    onChange={(e) =>
                      setKeys(
                        e.target.checked ? [...keys, row.key] : keys.filter((k) => k !== row.key),
                      )
                    }
                  />
                  <span>
                    Block {session.blocks.indexOf(row.block) + 1}: {row.block.name} · movement{' '}
                    {row.block.config.exercises!.indexOf(row.entry) + 1} ·{' '}
                    {workoutSummary(row.block.config)} ·{' '}
                    {row.entry.target
                      ? formatTarget(row.entry.target)
                      : row.block.config.type === 'ladder'
                        ? 'Ladder schedule'
                        : 'No target'}
                  </span>
                </label>
              ))}
            </fieldset>
            <label>
              Search replacement exercises
              <input
                className="input"
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>
            <FocusControls view={view} onView={setView} selected={areas} onChange={setAreas} />
            {personal.isError && (
              <p role="alert">
                Personal exercises unavailable.{' '}
                <Button onClick={() => void personal.refetch()}>Retry personal library</Button>
              </p>
            )}
            {bundled.isError && (
              <p role="alert">
                Exercises unavailable.{' '}
                <Button onClick={() => void bundled.refetch()}>Retry exercises</Button>
              </p>
            )}
            {(personal.isPending || bundled.isPending) && <p role="status">Loading exercises…</p>}
            {needsReps && <p>Ladder occurrences require a reps-compatible movement.</p>}
            {!!keys.length && occurrences[0] && (
              <ExerciseAlternatives
                source={occurrences[0].entry}
                library={available}
                equipment={equipment.selection}
                mode={needsReps ? 'ladder' : (occurrences[0].block.config.type ?? 'emom')}
                onChoose={choose}
              />
            )}
            {!keys.length && (
              <p role="status">Select at least one occurrence to choose a replacement.</p>
            )}
            {!!keys.length && (
              <ExerciseGroups
                library={available}
                search={search}
                view={view}
                onSelect={choose}
                note={(e) => equipmentNote(e, showAll ? null : (equipment.selection ?? []))}
              />
            )}
            {!available.length && !bundled.isPending && !bundled.isError && (
              <p>No exercises match these filters.</p>
            )}
          </>
        ) : (
          <>
            <h3 ref={heading} tabIndex={-1}>
              Review replacement: {review.selected.name}
            </h3>
            <p>
              Targets guide planned work, not equivalent effort. Review every occurrence before
              applying.
            </p>
            {review.changes.map((c) => {
              const row = rows.find((r) => r.key === c.key)!;
              return (
                <section className="replacement-review" key={c.key}>
                  <h4>
                    Block {session.blocks.indexOf(row.block) + 1}: {row.block.name} · movement{' '}
                    {row.block.config.exercises!.indexOf(row.entry) + 1} ·{' '}
                    {workoutSummary(row.block.config)}
                  </h4>
                  <p>{c.notice}</p>
                  <p>
                    <strong>
                      {c.entry.target
                        ? formatTarget(c.entry.target)
                        : row.block.config.type === 'ladder'
                          ? 'Ladder rep schedule'
                          : 'No target'}
                    </strong>
                  </p>
                  {row.block.config.type !== 'ladder' && (
                    <Button variant="secondary" disabled={busy} onClick={() => setTargetKey(c.key)}>
                      Set target for block {session.blocks.indexOf(row.block) + 1}: {row.block.name}
                      , movement {row.block.config.exercises!.indexOf(row.entry) + 1}
                    </Button>
                  )}
                </section>
              );
            })}
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() => {
                setReview(null);
                setError('');
                requestAnimationFrame(() => selector.current?.focus());
              }}
            >
              Choose another replacement
            </Button>
          </>
        )}
      </div>
      <footer className="replacement-footer">
        {!review && (
          <p className="equipment-status">
            {showAll
              ? 'All equipment shown.'
              : equipment.selection?.length
                ? 'Saved equipment filters apply.'
                : 'No equipment selected.'}{' '}
            Custom movement requirements are not assessed.
          </p>
        )}
        {!review && (
          <div className="replacement-equipment-actions">
            <label className="membership-option">
              <input
                type="checkbox"
                checked={showAll}
                onChange={(e) => setOverride(e.target.checked)}
              />
              Show all equipment
            </label>
            <Button
              variant="secondary"
              onClick={(event) => {
                event.currentTarget.focus();
                setEquipmentSettings(true);
              }}
            >
              Change equipment settings
            </Button>
          </div>
        )}
        {equipment.error && (
          <p role="alert">
            Equipment preferences unavailable.{' '}
            <Button onClick={equipment.load}>Retry equipment</Button>
          </p>
        )}
        <p>
          {keys.length} selected occurrence{keys.length === 1 ? '' : 's'} · One Undo restores the
          batch.
        </p>
        {error && <p role="alert">{error}</p>}
        <div className="dialog-actions">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={!review || busy} onClick={() => void apply()}>
            Apply replacement
          </Button>
        </div>
      </footer>
      {equipmentSettings && (
        <Settings initialSection="equipment" onClose={() => setEquipmentSettings(false)} />
      )}
      {target && targetRow && targetRow.block.config.type !== 'ladder' && (
        <TargetDialog
          exercise={target.entry}
          mode={targetRow.block.config.type ?? 'emom'}
          workSeconds={
            targetRow.block.config.type === 'intervals' ? targetRow.block.config.workSeconds : 60
          }
          onClose={() => setTargetKey(null)}
          onSave={(value) => {
            setReview(
              (r) =>
                r && {
                  ...r,
                  changes: r.changes.map((c) =>
                    c.key === targetKey
                      ? {
                          ...c,
                          entry: { ...c.entry, target: value },
                          notice: 'Target explicitly edited for this occurrence.',
                        }
                      : c,
                  ),
                },
            );
            setTargetKey(null);
          }}
        />
      )}
    </Dialog>
  );
}
