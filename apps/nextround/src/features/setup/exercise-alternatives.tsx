import { type ExerciseEntry, formatTarget, type WorkoutConfig } from '@nextround/core';
import { useState } from 'react';
import { Dialog } from '@/components/dialog';
import { Button } from '@/components/ui/button';
import { type EquipmentId, equipmentNote } from '@/data/equipment';
import { alternatives, curatedAlternatives } from '@/data/exercise-alternatives';
import { replaceExercise } from './exercise-replacement';

const unitLabels = { reps: 'Reps', seconds: 'Seconds', metres: 'Metres', calories: 'Calories' };
export function ExerciseAlternatives({
  source,
  library,
  equipment,
  mode,
  workSeconds,
  onChoose,
}: {
  source: ExerciseEntry;
  library: ExerciseEntry[];
  equipment: EquipmentId[] | null;
  mode: NonNullable<WorkoutConfig['type']>;
  workSeconds?: number;
  onChoose: (entry: ExerciseEntry) => void;
}) {
  const choices = curatedAlternatives(source, library);
  const [preview, setPreview] = useState<{
    entry: ExerciseEntry;
    reason: string;
    before: string;
  } | null>(null);
  const current = preview && choices.find((c) => c.entry.id === preview.entry.id);
  const fresh =
    !!current &&
    preview?.before === JSON.stringify(source) &&
    JSON.stringify(current.entry) === JSON.stringify(preview?.entry);
  const result =
    preview && fresh ? replaceExercise(source, preview.entry, mode, workSeconds) : null;
  return (
    <section className="exercise-alternatives" aria-label="Suggested alternatives">
      <h3>Suggested alternatives</h3>
      <p className="hint">
        These change equipment or movement demands, not measured effort. Review your target and
        load.
      </p>
      {!choices.length && (
        <p>
          {alternatives[source.catalogId ?? source.id]?.length
            ? 'No curated alternatives match the current filters and workout. Adjust filters or choose another movement below.'
            : 'No curated alternatives for this movement. Choose any compatible movement below.'}
        </p>
      )}
      {choices.map((choice) => (
        <article className="alternative-card" key={choice.entry.id}>
          <h4>{choice.entry.name}</h4>
          <p>{choice.reason}</p>
          <p className="hint">{choice.entry.description}</p>
          <p className="hint">
            {equipmentNote(choice.entry, equipment)} ·{' '}
            {choice.entry.supportedUnits?.map((u) => unitLabels[u]).join(', ')}
          </p>
          <Button
            variant="secondary"
            aria-label={`Review alternative: ${choice.entry.name}`}
            onClick={() => setPreview({ ...choice, before: JSON.stringify(source) })}
          >
            Review alternative
          </Button>
        </article>
      ))}
      {preview && (
        <Dialog title="Review exercise alternative" onClose={() => setPreview(null)}>
          <h3>
            {source.name} → {preview.entry.name}
          </h3>
          <p>{preview.reason}</p>
          <p>{preview.entry.description}</p>
          <p>{equipmentNote(preview.entry, equipment)}</p>
          <p>{result?.notice}</p>
          {result && (
            <p>
              Planned target:{' '}
              {result.entry.target
                ? formatTarget(result.entry.target)
                : mode === 'ladder'
                  ? 'Your ladder rep schedule'
                  : 'No target'}
              . No load or effort conversion is applied.
            </p>
          )}
          {!fresh && (
            <p role="alert">
              The movement or available choices changed. Go back and review the alternative again.
            </p>
          )}
          <div className="empty-actions">
            <Button variant="secondary" onClick={() => setPreview(null)}>
              Back to alternatives
            </Button>
            <Button
              disabled={!fresh}
              onClick={() => {
                if (fresh) onChoose(preview.entry);
              }}
            >
              Use this alternative
            </Button>
          </div>
        </Dialog>
      )}
    </section>
  );
}
