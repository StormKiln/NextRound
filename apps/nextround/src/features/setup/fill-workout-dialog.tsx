import { countLabel, type ExerciseEntry, formatTarget, type WorkoutConfig } from '@nextround/core';
import { useEffect, useId, useRef, useState } from 'react';
import { Dialog } from '@/components/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { categories } from '@/data/equipment';
import type { FocusArea } from '@/data/focus';
import { useExerciseFavorites } from '@/features/exercises/favorites-store';
import { useExerciseLibrary } from '@/features/exercises/library';
import { useEquipment } from '@/features/settings/equipment-store';
import { Settings } from '@/features/settings/settings';
import {
  type FillFilters,
  fillCandidates,
  reshuffleFill,
  sampleFill,
  swapFill,
} from './fill-workout';
import { FocusFilter } from './focus-controls';
import { generatedEntry } from './workout-generator';

export function FillWorkoutDialog({
  exercises,
  mode,
  workSeconds,
  onClose,
  onApply,
}: {
  exercises: ExerciseEntry[];
  mode: NonNullable<WorkoutConfig['type']>;
  workSeconds?: number;
  onClose: () => void;
  onApply: (entries: ExerciseEntry[]) => void;
}) {
  const { library, personal, bundled } = useExerciseLibrary();
  const equipment = useEquipment();
  const favorites = useExerciseFavorites();
  useEffect(() => {
    equipment.load();
    favorites.load();
  }, [equipment.load, favorites.load]);
  const sourceKey = JSON.stringify({ exercises, mode, workSeconds });
  const [initial] = useState(() => ({ key: sourceKey, entries: structuredClone(exercises) }));
  const [invalidated, setInvalidated] = useState(false);
  const stale = invalidated || initial.key !== sourceKey;
  useEffect(() => {
    if (initial.key !== sourceKey) setInvalidated(true);
  }, [initial.key, sourceKey]);
  const [total, setTotal] = useState(String(Math.min(initial.entries.length + 3, 100)));
  const [areas, setAreas] = useState<FocusArea[]>([]);
  const [category, setCategory] = useState<FillFilters['category']>('');
  const [intensity, setIntensity] = useState<FillFilters['intensity']>('');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [equipmentOverride, setEquipmentOverride] = useState<boolean | null>(null);
  const allEquipment = equipmentOverride ?? equipment.selection === null;
  const [settings, setSettings] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [swapError, setSwapError] = useState('');
  const swapId = useId();
  const [preview, setPreview] = useState<{
    key: string;
    entries: ExerciseEntry[];
    revision: number;
    pinnedIds: string[];
  } | null>(null);
  const countRef = useRef<HTMLInputElement>(null);
  const equipmentId = useId();
  const countId = useId();
  const errorId = useId();
  const loading =
    personal.isPending ||
    bundled.isPending ||
    (!equipment.loaded && !equipment.error) ||
    (favoritesOnly && !favorites.loaded && !favorites.error);
  const failed =
    personal.isError ||
    bundled.isError ||
    !!equipment.error ||
    (favoritesOnly && !!favorites.error);
  const filters: FillFilters = {
    equipment: allEquipment ? null : (equipment.selection ?? []),
    areas,
    category,
    intensity,
    favoritesOnly,
    favoriteIds: favorites.ids,
  };
  const candidates = fillCandidates(library, initial.entries, mode, filters);
  // The merged library is recreated on render; content, rather than reference identity, owns a preview.
  const previewKey = JSON.stringify({ total, filters, candidates, sourceKey });
  const ready = !stale && !loading && !failed;
  const currentPreview = ready && preview?.key === previewKey ? preview : null;
  useEffect(() => {
    if (preview && (!ready || preview.key !== previewKey)) {
      setPreview(null);
      setSwapError('');
      setNotice('Preview and pins cleared. Preview additions again with your updated choices.');
    }
  }, [ready, previewKey, preview]);
  const changed = () => {
    if (preview)
      setNotice('Preview and pins cleared. Preview additions again with your updated choices.');
    setError('');
    setPreview(null);
    setSwapError('');
  };
  const generate = () => {
    if (!ready) return;
    try {
      const pinnedIds = currentPreview?.pinnedIds ?? [];
      const selected = currentPreview
        ? reshuffleFill(candidates, currentPreview.entries, pinnedIds)
        : sampleFill(candidates, initial.entries.length, Number(total));
      setPreview({
        key: previewKey,
        entries: selected.map((entry) =>
          pinnedIds.includes(entry.id)
            ? structuredClone(entry)
            : generatedEntry(entry, mode, workSeconds),
        ),
        pinnedIds,
        revision: (preview?.revision ?? 0) + 1,
      });
      setError('');
      setSwapError('');
      setNotice('');
    } catch (e) {
      setPreview(null);
      setSwapError('');
      setError(e instanceof Error ? e.message : 'Unable to create additions.');
      countRef.current?.focus();
    }
  };
  if (settings)
    return (
      <Settings
        initialSection="equipment"
        onClose={() => {
          setSettings(false);
          equipment.load();
          setError('');
          requestAnimationFrame(() => document.getElementById(equipmentId)?.focus());
        }}
      />
    );
  return (
    <Dialog
      title="Fill remaining slots"
      className="generator-dialog fill-dialog"
      onClose={onClose}
      initialFocus={countRef}
    >
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          generate();
        }}
      >
        <div className="generator-body">
          <p>
            Keep your {countLabel(initial.entries.length, 'chosen exercise')} in order. Randomly add
            movements to reach your total. Filters apply only to additions; workout timing stays the
            same.
          </p>
          {initial.entries.length > 0 && (
            <details className="fill-retained">
              <summary>Keeping {countLabel(initial.entries.length, 'exercise')}</summary>
              <ol aria-label="Retained exercises">
                {initial.entries.map((entry) => (
                  <li key={entry.id}>
                    <strong>{entry.name}</strong>
                    {entry.target && <span> — {formatTarget(entry.target)}</span>}
                  </li>
                ))}
              </ol>
            </details>
          )}
          <label htmlFor={countId}>Total exercises</label>
          <Input
            id={countId}
            ref={countRef}
            type="number"
            min={initial.entries.length + 1}
            max={100}
            step={1}
            value={total}
            aria-invalid={
              !!error &&
              (!Number.isInteger(Number(total)) ||
                Number(total) <= initial.entries.length ||
                Number(total) > 100)
            }
            aria-describedby={error ? errorId : undefined}
            onChange={(e) => {
              setTotal(e.target.value);
              changed();
            }}
          />
          {initial.entries.length >= 100 && (
            <p role="alert">
              This workout already has 100 exercises. Remove an exercise before filling more slots.
            </p>
          )}
          <div className="fill-filter-grid">
            <label>
              Category
              <select
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value as FillFilters['category']);
                  changed();
                }}
              >
                <option value="">All categories</option>
                {categories.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
            <label>
              Intensity
              <select
                value={intensity}
                onChange={(e) => {
                  setIntensity(e.target.value as FillFilters['intensity']);
                  changed();
                }}
              >
                <option value="">All intensities</option>
                <option value="low">Low</option>
                <option value="moderate">Moderate</option>
                <option value="high">High</option>
              </select>
            </label>
          </div>
          <label className="fill-check">
            <input
              type="checkbox"
              checked={favoritesOnly}
              onChange={(e) => {
                setFavoritesOnly(e.target.checked);
                changed();
              }}
            />
            My favorites only
          </label>
          <div className="focus-controls">
            <FocusFilter
              selected={areas}
              onChange={(next) => {
                setAreas(next);
                changed();
              }}
            />
          </div>
          <div className="fill-equipment">
            <label className="fill-check">
              <input
                type="checkbox"
                checked={allEquipment}
                onChange={(e) => {
                  setEquipmentOverride(e.target.checked);
                  changed();
                }}
              />
              Show all equipment
            </label>
            <p className="hint">
              {allEquipment
                ? 'All equipment included. Unknown movement requirements are allowed.'
                : equipment.selection?.length
                  ? 'Uses your saved equipment. Unknown requirements are excluded.'
                  : 'Only movements requiring no equipment. Unknown requirements are excluded.'}
            </p>
            <Button
              type="button"
              id={equipmentId}
              variant="secondary"
              onClick={() => setSettings(true)}
            >
              Change equipment settings
            </Button>
          </div>
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setCategory('');
              setIntensity('');
              setFavoritesOnly(false);
              setAreas([]);
              setEquipmentOverride(null);
              changed();
            }}
          >
            Clear filters
          </Button>
          {notice && <p role="status">{notice}</p>}
          {mode === 'ladder' && (
            <p className="hint">
              Ladder additions support repetitions and follow your rung targets.
            </p>
          )}
          {intensity && (
            <p className="hint">Movements without intensity information are excluded.</p>
          )}
          {loading && <p role="status">Loading available exercises…</p>}
          {failed && (
            <div role="alert">
              <p>Available exercises could not be loaded. Your workout is unchanged.</p>
              <Button
                type="button"
                onClick={() => {
                  void personal.refetch();
                  void bundled.refetch();
                  equipment.load();
                  favorites.load();
                  setPreview(null);
                  setSwapError('');
                }}
              >
                Retry available exercises
              </Button>
            </div>
          )}
          {stale && (
            <p role="alert">
              Your workout changed while this dialog was open. Close and reopen Fill remaining slots
              before applying suggestions.
            </p>
          )}
          {ready && (
            <p>
              {countLabel(candidates.length, 'eligible addition')} after excluding exercises already
              chosen.
            </p>
          )}
          {error && (
            <p className="error" role="alert" id={errorId}>
              {error}
            </p>
          )}
          {currentPreview && (
            <section className="fill-preview" aria-label="Fill preview">
              <p role="status">
                Preview {currentPreview.revision}: keep {initial.entries.length}, add{' '}
                {currentPreview.entries.length}, total{' '}
                {initial.entries.length + currentPreview.entries.length}.
              </p>
              {swapError && (
                <p className="error" role="alert">
                  {swapError}
                </p>
              )}
              <ol aria-label="Proposed additions">
                {currentPreview.entries.map((entry, index) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: These are fixed preview slots; replacement must preserve the slot and its focused controls.
                  <li key={`slot-${index}`}>
                    <div className="fill-movement">
                      <strong>{entry.name}</strong>
                      <span>
                        {entry.target ? formatTarget(entry.target) : 'Targets follow the workout'}
                      </span>
                    </div>
                    <div className="fill-row-actions">
                      <Button
                        type="button"
                        variant="secondary"
                        aria-pressed={currentPreview.pinnedIds.includes(entry.id)}
                        aria-label={`${currentPreview.pinnedIds.includes(entry.id) ? 'Unpin' : 'Pin'} ${entry.name}`}
                        onClick={() =>
                          setPreview({
                            ...currentPreview,
                            pinnedIds: currentPreview.pinnedIds.includes(entry.id)
                              ? currentPreview.pinnedIds.filter((id) => id !== entry.id)
                              : [...currentPreview.pinnedIds, entry.id],
                          })
                        }
                      >
                        {currentPreview.pinnedIds.includes(entry.id) ? 'Pinned' : 'Pin'}
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        id={`${swapId}-${index}`}
                        aria-label={`Swap ${entry.name}`}
                        disabled={currentPreview.pinnedIds.includes(entry.id)}
                        title={
                          currentPreview.pinnedIds.includes(entry.id)
                            ? 'Unpin this suggestion to swap it'
                            : 'Choose a different eligible movement'
                        }
                        onClick={() => {
                          try {
                            const replacement = generatedEntry(
                              swapFill(
                                candidates,
                                currentPreview.entries,
                                index,
                                currentPreview.pinnedIds,
                              ),
                              mode,
                              workSeconds,
                            );
                            setPreview({
                              ...currentPreview,
                              entries: currentPreview.entries.map((existing, slot) =>
                                slot === index ? replacement : existing,
                              ),
                              revision: currentPreview.revision + 1,
                            });
                            setSwapError('');
                            setNotice(
                              `${entry.name} replaced with ${replacement.name}. Other suggestions and pins are unchanged.`,
                            );
                            requestAnimationFrame(() =>
                              document
                                .getElementById(`${swapId}-${index}`)
                                ?.focus({ preventScroll: true }),
                            );
                          } catch (e) {
                            setSwapError(
                              e instanceof Error
                                ? e.message
                                : 'Unable to swap this suggestion. Your preview is unchanged.',
                            );
                          }
                        }}
                      >
                        Swap
                      </Button>
                    </div>
                  </li>
                ))}
              </ol>
              {currentPreview.pinnedIds.length === currentPreview.entries.length && (
                <p role="status">All additions are pinned. Unpin one to reshuffle.</p>
              )}
              <p className="hint">
                Pin additions to keep their positions and targets. Reshuffle changes only unpinned
                slots and may draw the same movements again. Swap replaces just one unpinned
                suggestion with a different movement. Pins last only for this preview. Review
                movements and targets before starting.
              </p>
            </section>
          )}
        </div>
        <div className="dialog-actions">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="secondary"
            disabled={
              !ready ||
              initial.entries.length >= 100 ||
              (!!currentPreview &&
                currentPreview.pinnedIds.length === currentPreview.entries.length)
            }
          >
            {currentPreview ? 'Reshuffle additions' : 'Preview additions'}
          </Button>
          <Button
            type="button"
            disabled={!currentPreview}
            onClick={() => {
              if (currentPreview)
                onApply([
                  ...structuredClone(initial.entries),
                  ...structuredClone(currentPreview.entries),
                ]);
            }}
          >
            Add to workout
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
