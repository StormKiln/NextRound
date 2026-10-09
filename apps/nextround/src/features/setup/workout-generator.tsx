import type { ExerciseEntry, TargetUnit, WorkoutConfig } from '@nextround/core';
import { countLabel } from '@nextround/core';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { Dialog } from '@/components/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { eligibleExercise } from '@/data/equipment';
import { toWorkoutEntry, useExerciseLibrary } from '@/features/exercises/library';
import { readHistory } from '@/features/history/repository';
import { useEquipment } from '@/features/settings/equipment-store';
import { Settings } from '@/features/settings/settings';
import { defaultEmomTarget } from './emom-defaults';
import { deriveUsage, type SuggestionPreset, suggestExercises } from './exercise-suggestions';

type Mode = NonNullable<WorkoutConfig['type']>;
const presets: { id: SuggestionPreset; label: string }[] = [
  { id: 'favorites', label: 'My Favorites' },
  { id: 'new', label: 'Try something new' },
  { id: 'mix', label: 'Mix It Up' },
];

export function generatedEntry(
  entry: ExerciseEntry,
  mode: Mode,
  workSeconds?: number,
): ExerciseEntry {
  const snapshot = toWorkoutEntry(entry, mode);
  if (mode === 'ladder' || snapshot.target) return snapshot;
  const suggested = defaultEmomTarget(entry);
  const units = entry.supportedUnits ?? ['reps', 'seconds', 'metres', 'calories'];
  const unit = units.includes(suggested.unit) ? suggested.unit : units[0];
  const defaults: Record<TargetUnit, number> = { reps: 8, seconds: 30, metres: 100, calories: 5 };
  return {
    ...snapshot,
    target: {
      unit,
      value:
        mode === 'intervals' &&
        unit === 'seconds' &&
        workSeconds !== undefined &&
        Number.isInteger(workSeconds) &&
        workSeconds > 0
          ? Math.min(unit === suggested.unit ? suggested.value : defaults[unit], workSeconds)
          : unit === suggested.unit
            ? suggested.value
            : defaults[unit],
    },
  };
}

export function WorkoutGenerator({
  exercises,
  onChange,
  mode,
  workSeconds,
}: {
  exercises: ExerciseEntry[];
  onChange: (entries: ExerciseEntry[]) => void;
  mode: Mode;
  workSeconds?: number;
}) {
  const [open, setOpen] = useState(false);
  const [preset, setPreset] = useState<SuggestionPreset | null>(null);
  const [undo, setUndo] = useState<{ before: ExerciseEntry[]; after: string } | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const menuId = useId();
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !root.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [open]);
  const close = () => {
    setPreset(null);
    requestAnimationFrame(() => trigger.current?.focus());
  };
  return (
    <div className="workout-generator" ref={root}>
      <div className="generator-actions">
        <Button
          ref={trigger}
          variant="secondary"
          aria-expanded={open}
          aria-controls={menuId}
          onClick={() => setOpen(!open)}
        >
          Create a workout <ChevronDown size={16} />
        </Button>
        {undo && undo.after === JSON.stringify(exercises) && (
          <Button
            variant="ghost"
            onClick={() => {
              onChange(undo.before);
              setUndo(null);
            }}
          >
            Undo generated workout
          </Button>
        )}
      </div>
      {open && (
        <fieldset
          id={menuId}
          className="generator-menu"
          aria-label="Workout presets"
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.stopPropagation();
              setOpen(false);
              trigger.current?.focus();
            }
          }}
        >
          {presets.map((item) => (
            <Button
              key={item.id}
              variant="ghost"
              onClick={() => {
                setOpen(false);
                setPreset(item.id);
              }}
            >
              {item.label}
            </Button>
          ))}
        </fieldset>
      )}
      {preset && (
        <GenerateDialog
          preset={preset}
          initialCount={exercises.length || 3}
          mode={mode}
          workSeconds={workSeconds}
          onClose={close}
          onGenerate={(next) => {
            setUndo({ before: structuredClone(exercises), after: JSON.stringify(next) });
            onChange(next);
            close();
          }}
        />
      )}
    </div>
  );
}

function GenerateDialog({
  preset,
  initialCount,
  mode,
  workSeconds,
  onClose,
  onGenerate,
}: {
  preset: SuggestionPreset;
  initialCount: number;
  mode: Mode;
  workSeconds?: number;
  onClose: () => void;
  onGenerate: (entries: ExerciseEntry[]) => void;
}) {
  const { library, personal, bundled } = useExerciseLibrary();
  const equipment = useEquipment();
  const history = useQuery({ queryKey: ['workout-history'], queryFn: readHistory, retry: false });
  const [count, setCount] = useState(String(initialCount));
  const [error, setError] = useState('');
  const countRef = useRef<HTMLInputElement>(null);
  const [settings, setSettings] = useState(false);
  const equipmentTriggerId = useId();
  const countId = useId();
  const errorId = useId();
  useEffect(() => equipment.load(), [equipment.load]);
  const loading =
    personal.isPending ||
    bundled.isPending ||
    history.isPending ||
    (!equipment.loaded && !equipment.error);
  const failed = personal.isError || bundled.isError || history.isError || !!equipment.error;
  const eligible = library.filter(
    (entry) =>
      eligibleExercise(entry, equipment.selection) &&
      (mode !== 'ladder' || !entry.supportedUnits || entry.supportedUnits.includes('reps')),
  );
  const counts = history.data ? deriveUsage(history.data).counts : new Map<string, number>();
  if (settings)
    return (
      <Settings
        initialSection="equipment"
        onClose={() => {
          setSettings(false);
          setError('');
          equipment.load();
          requestAnimationFrame(() => document.getElementById(equipmentTriggerId)?.focus());
        }}
      />
    );
  return (
    <Dialog title="Create a workout" onClose={onClose}>
      <p>
        <strong>{presets.find((item) => item.id === preset)?.label}</strong> replaces your exercise
        order. Workout timing stays the same, and you can undo the generated list.
      </p>
      <p>
        {equipment.selection === null
          ? 'All equipment is included.'
          : equipment.selection.length
            ? 'Uses your saved equipment.'
            : 'Only exercises requiring no equipment are included.'}{' '}
        {mode === 'ladder' && 'Ladder uses reps-compatible movements.'}
      </p>
      <Button id={equipmentTriggerId} variant="secondary" onClick={() => setSettings(true)}>
        Change equipment settings
      </Button>
      {loading && <p role="status">Loading workout suggestions…</p>}
      {failed && (
        <div role="alert">
          <p>Workout suggestions could not be loaded. Your current workout is unchanged.</p>
          <Button
            onClick={() => {
              void personal.refetch();
              void bundled.refetch();
              void history.refetch();
              equipment.load();
            }}
          >
            Retry workout suggestions
          </Button>
        </div>
      )}
      {!loading && !failed && (
        <p>
          {countLabel(eligible.length, 'eligible exercise')}.{' '}
          {!counts.size && 'No attributed history yet; suggestions start alphabetically.'}
        </p>
      )}
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          if (loading || failed) return;
          const amount = Number(count);
          if (!Number.isInteger(amount) || amount < 1 || amount > 100) {
            setError('Choose a whole number from 1 to 100.');
            countRef.current?.focus();
            return;
          }
          const selected = suggestExercises(eligible, counts, preset, amount);
          if (selected.length < amount) {
            setError(
              `Only ${countLabel(selected.length, 'eligible exercise')} ${selected.length === 1 ? 'is' : 'are'} available. Choose a smaller count or change your equipment settings.`,
            );
            countRef.current?.focus();
            return;
          }
          onGenerate(selected.map((entry) => generatedEntry(entry, mode, workSeconds)));
        }}
      >
        <label htmlFor={countId}>Number of exercises</label>
        <Input
          ref={countRef}
          id={countId}
          type="number"
          min={1}
          max={100}
          step={1}
          value={count}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : undefined}
          onChange={(event) => {
            setCount(event.target.value);
            setError('');
          }}
        />
        {error && (
          <p id={errorId} role="alert" className="error">
            {error}
          </p>
        )}
        <p className="hint">
          Review the movements and edit their suggested targets before starting.
        </p>
        <div className="dialog-actions">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading || failed}>
            Generate workout
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
