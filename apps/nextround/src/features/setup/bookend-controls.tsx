import { durationSeconds, formatElapsed } from '@nextround/core';
import { Shuffle } from 'lucide-react';
import { useEffect, useId } from 'react';
import { Button } from '@/components/ui/button';
import { eligibleExercise } from '@/data/equipment';
import { type Phase, phaseLabels } from '@/data/phases';
import { useExerciseLibrary } from '@/features/exercises/library';
import { useEquipment } from '@/features/settings/equipment-store';
import {
  BOOKEND_HOLD_SECONDS,
  BOOKEND_MINUTES,
  bookendPool,
  bookendSeconds,
  pickBookend,
} from '@/state/bookends';
import { useWorkout, type WorkoutMode } from '@/state/workout';
import './bookend-controls.css';

const copy: Record<Phase, { label: string; hint: string }> = {
  warmup: { label: 'Add a warm-up', hint: 'Dynamic movements before your workout.' },
  cooldown: { label: 'Add a cool-down', hint: 'Stretches and yoga poses after your workout.' },
};

function BookendOption({ phase }: { phase: Phase }) {
  const id = useId();
  const { bookends, setBookend, bookendPreview, setBookendPreview } = useWorkout();
  const { library } = useExerciseLibrary();
  const selection = useEquipment((state) => state.selection);
  const { enabled, minutes } = bookends[phase];
  const preview = bookendPreview[phase];
  const pool = library.filter((entry) => eligibleExercise(entry, selection));
  const shuffle = () => setBookendPreview(phase, pickBookend(pool, phase, minutes));
  const wanted = Math.min(minutes, bookendPool(pool, phase).length);
  // Fill the preview once the library loads, and top it up when the length grows.
  useEffect(() => {
    if (enabled && preview.length < wanted)
      setBookendPreview(phase, pickBookend(pool, phase, minutes));
  });
  return (
    <div className="bookend-option">
      <label className="checklist-option">
        <input
          type="checkbox"
          checked={enabled}
          aria-describedby={`${id}-hint`}
          onChange={(event) => setBookend(phase, { enabled: event.target.checked })}
        />
        {copy[phase].label}
      </label>
      <p id={`${id}-hint`} className="hint">
        {copy[phase].hint}
      </p>
      {enabled && (
        <div className="bookend-detail">
          <label htmlFor={`${id}-length`}>{phaseLabels[phase]} length</label>
          <div className="bookend-slider">
            <input
              id={`${id}-length`}
              type="range"
              min={BOOKEND_MINUTES.min}
              max={BOOKEND_MINUTES.max}
              step={1}
              value={minutes}
              aria-valuetext={`${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`}
              onChange={(event) => {
                const next = Number(event.target.value);
                setBookend(phase, { minutes: next });
                setBookendPreview(phase, pickBookend(pool, phase, next));
              }}
            />
            <output htmlFor={`${id}-length`}>{minutes} min</output>
          </div>
          {preview.length ? (
            <>
              <ol className="bookend-preview" aria-label={`${phaseLabels[phase]} movements`}>
                {preview.slice(0, minutes).map((entry) => (
                  <li key={entry.id}>{entry.name}</li>
                ))}
              </ol>
              <p className="hint">
                One movement a minute: hold for {BOOKEND_HOLD_SECONDS} seconds, then move to the
                next.
                {preview.length < minutes ? ' Movements repeat in order to fill the time.' : ''}
              </p>
              <Button type="button" variant="secondary" onClick={shuffle}>
                <Shuffle size={16} /> Reshuffle {phaseLabels[phase].toLowerCase()}
              </Button>
            </>
          ) : (
            <p className="hint">
              No {phaseLabels[phase].toLowerCase()} movements match your equipment settings.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export function BookendControls({ mode }: { mode: WorkoutMode }) {
  const { bookends, getDraftConfig } = useWorkout();
  const extra = bookendSeconds(bookends);
  let main = Number.NaN;
  try {
    main = durationSeconds(getDraftConfig(mode));
  } catch {}
  return (
    <fieldset className="bookends">
      <legend>Warm-up and cool-down</legend>
      <BookendOption phase="warmup" />
      <BookendOption phase="cooldown" />
      {extra > 0 && (
        <p className="hint" role="status">
          {Number.isFinite(main)
            ? `Total with warm-up and cool-down: ${formatElapsed((main + extra) * 1000)}, plus lead-ins.`
            : `Warm-up and cool-down add ${formatElapsed(extra * 1000)} to your workout.`}
        </p>
      )}
    </fieldset>
  );
}
