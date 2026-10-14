import type { TargetUnit } from '@nextround/core';
import { useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { Dialog } from '@/components/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { categories, type EquipmentId, equipmentLabels } from '@/data/equipment';
import { type FocusArea, focusAreas } from '@/data/focus';
import { personalQueryKey } from './library';
import { mutatePersonalExercises, type PersonalExercise, units } from './repository';
export function newPersonal(): PersonalExercise {
  return {
    id: `personal:${crypto.randomUUID()}`,
    name: '',
    description: '',
    category: 'Uncategorized',
    equipment: [],
    targetAreas: [],
    supportedUnits: ['reps'],
    archived: false,
  };
}
export function ExerciseForm({
  initial,
  expected,
  onSaved,
  onClose,
}: {
  initial: PersonalExercise;
  expected?: PersonalExercise;
  onSaved: (exercise: PersonalExercise) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState(() => structuredClone(initial));
  const [hasTarget, setHasTarget] = useState(!!initial.defaultTarget);
  const [amount, setAmount] = useState(String(initial.defaultTarget?.value ?? 10));
  const [unit, setUnit] = useState<TargetUnit>(
    initial.defaultTarget?.unit ?? initial.supportedUnits[0],
  );
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const keepEditingRef = useRef<HTMLButtonElement>(null);
  const shape = (exercise: PersonalExercise) =>
    JSON.stringify({
      id: exercise.id,
      sourceId: exercise.sourceId,
      archived: exercise.archived,
      category: exercise.category,
      defaultTarget: exercise.defaultTarget
        ? { unit: exercise.defaultTarget.unit, value: exercise.defaultTarget.value }
        : null,
      name: exercise.name.trim(),
      description: exercise.description.trim(),
      equipment: [...exercise.equipment].sort(),
      targetAreas: [...exercise.targetAreas].sort(),
      supportedUnits: [...exercise.supportedUnits].sort(),
    });
  const current = { ...draft };
  delete current.defaultTarget;
  if (hasTarget) current.defaultTarget = { unit, value: Number(amount) };
  const dirty = shape(current) !== shape(initial);
  const close = () => {
    if (gate.current) return;
    if (dirty) setConfirmDiscard(true);
    else onClose();
  };
  const [error, setError] = useState('');
  const [invalidField, setInvalidField] = useState<'name' | 'units' | 'amount' | 'unit' | null>(
    null,
  );
  const clearError = () => {
    setError('');
    setInvalidField(null);
  };
  const amountRef = useRef<HTMLInputElement>(null);
  const unitRef = useRef<HTMLSelectElement>(null);
  const unitsRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const gate = useRef(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const client = useQueryClient();
  const change = <K extends keyof PersonalExercise>(key: K, value: PersonalExercise[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
    clearError();
  };
  const toggle = <T extends string>(values: T[], value: T) =>
    values.includes(value) ? values.filter((x) => x !== value) : [...values, value];
  return (
    <>
      <Dialog
        title={expected ? 'Edit personal exercise' : 'Create personal exercise'}
        className="personal-form"
        onClose={close}
      >
        <form
          noValidate
          onSubmit={async (event) => {
            event.preventDefault();
            if (gate.current) return;
            setInvalidField(null);
            if (!draft.name.trim()) {
              setInvalidField('name');
              setError('Give your exercise a name.');
              nameRef.current?.focus();
              return;
            }
            if (!draft.supportedUnits.length) {
              setInvalidField('units');
              setError('Choose at least one supported target unit.');
              unitsRef.current?.focus();
              return;
            }
            const value = Number(amount);
            if (hasTarget && !draft.supportedUnits.includes(unit)) {
              setInvalidField('unit');
              setError('Choose a supported default unit.');
              unitRef.current?.focus();
              return;
            }
            const maximum = unit === 'seconds' ? 86400 : 999999;
            if (hasTarget && (!Number.isInteger(value) || value < 1 || value > maximum)) {
              setInvalidField('amount');
              setError(`Choose a whole default amount from 1 to ${maximum}.`);
              amountRef.current?.focus();
              return;
            }
            const exercise = {
              ...draft,
              name: draft.name.trim(),
              description: draft.description.trim(),
            };
            delete exercise.defaultTarget;
            if (hasTarget) exercise.defaultTarget = { unit, value };
            gate.current = true;
            setBusy(true);
            try {
              const document = await mutatePersonalExercises({
                action: 'save',
                exercise,
                ...(expected ? { expected } : {}),
              });
              client.setQueryData(personalQueryKey, document);
              void client.invalidateQueries({ queryKey: personalQueryKey });
              onSaved(exercise);
            } catch (e) {
              setError(e instanceof Error ? e.message : String(e));
              await client.invalidateQueries({ queryKey: personalQueryKey });
            } finally {
              gate.current = false;
              setBusy(false);
            }
          }}
        >
          <div className="personal-form-body">
            <fieldset disabled={busy}>
              <label htmlFor="personal-name">Exercise name</label>
              <Input
                ref={nameRef}
                id="personal-name"
                value={draft.name}
                maxLength={120}
                onChange={(e) => change('name', e.target.value)}
                aria-invalid={invalidField === 'name'}
                aria-describedby={invalidField === 'name' ? 'personal-error' : undefined}
              />
              <label htmlFor="personal-description">Description (optional)</label>
              <textarea
                id="personal-description"
                value={draft.description}
                maxLength={2000}
                rows={3}
                onChange={(e) => change('description', e.target.value)}
              />
              <label htmlFor="personal-category">Category</label>
              <select
                id="personal-category"
                value={draft.category}
                onChange={(e) => change('category', e.target.value as PersonalExercise['category'])}
              >
                {categories.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
              <fieldset>
                <legend>Required equipment</legend>
                <p className="hint">Leave all unchecked for no equipment.</p>
                <div className="personal-options">
                  {Object.entries(equipmentLabels).map(([id, label]) => (
                    <label key={id}>
                      <input
                        type="checkbox"
                        checked={draft.equipment.includes(id as EquipmentId)}
                        onChange={() =>
                          change('equipment', toggle(draft.equipment, id as EquipmentId))
                        }
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </fieldset>
              <fieldset>
                <legend>Focus areas</legend>
                <div className="personal-options">
                  {Object.entries(focusAreas).map(([id, label]) => (
                    <label key={id}>
                      <input
                        type="checkbox"
                        checked={draft.targetAreas.includes(id as FocusArea)}
                        onChange={() =>
                          change('targetAreas', toggle(draft.targetAreas, id as FocusArea))
                        }
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </fieldset>
              <fieldset
                aria-invalid={invalidField === 'units'}
                aria-describedby={invalidField === 'units' ? 'personal-error' : undefined}
              >
                <legend>Supported targets</legend>
                <div className="personal-options">
                  {units.map((id) => (
                    <label key={id}>
                      <input
                        type="checkbox"
                        ref={id === units[0] ? unitsRef : undefined}
                        aria-describedby={invalidField === 'units' ? 'personal-error' : undefined}
                        checked={draft.supportedUnits.includes(id)}
                        onChange={() => {
                          const next = toggle(draft.supportedUnits, id);
                          change('supportedUnits', next);
                          if (!next.includes(unit) && next.length) setUnit(next[0]);
                        }}
                      />
                      {id === 'reps' ? 'Reps' : id[0].toUpperCase() + id.slice(1)}
                    </label>
                  ))}
                </div>
              </fieldset>
              <label className="personal-check">
                <input
                  type="checkbox"
                  checked={hasTarget}
                  onChange={(e) => {
                    setHasTarget(e.target.checked);
                    clearError();
                  }}
                />
                Set a default target
              </label>
              {hasTarget && (
                <div className="target-fields">
                  <div>
                    <label htmlFor="personal-amount">Default amount</label>
                    <Input
                      id="personal-amount"
                      ref={amountRef}
                      aria-invalid={invalidField === 'amount'}
                      aria-describedby={invalidField === 'amount' ? 'personal-error' : undefined}
                      type="number"
                      min={1}
                      step={1}
                      value={amount}
                      onChange={(e) => {
                        setAmount(e.target.value);
                        clearError();
                      }}
                    />
                  </div>
                  <div>
                    <label htmlFor="personal-unit">Default unit</label>
                    <select
                      id="personal-unit"
                      ref={unitRef}
                      aria-invalid={invalidField === 'unit'}
                      aria-describedby={invalidField === 'unit' ? 'personal-error' : undefined}
                      value={unit}
                      onChange={(e) => {
                        setUnit(e.target.value as TargetUnit);
                        clearError();
                      }}
                    >
                      {draft.supportedUnits.map((u) => (
                        <option key={u} value={u}>
                          {u}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
              <p className="hint">
                Changes apply to future selections. Existing workouts keep their own copies. Ladder
                always uses its rung targets.
              </p>
            </fieldset>
          </div>
          {error && (
            <p id="personal-error" role="alert" className="error">
              {error}
            </p>
          )}
          <div className="dialog-actions">
            <Button type="button" variant="ghost" disabled={busy} onClick={close}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? 'Saving…' : 'Save exercise'}
            </Button>
          </div>
        </form>
      </Dialog>
      {confirmDiscard && (
        <Dialog
          title="Discard exercise changes?"
          onClose={() => setConfirmDiscard(false)}
          initialFocus={keepEditingRef}
        >
          <p>Your changes have not been saved.</p>
          <div className="dialog-actions">
            <Button ref={keepEditingRef} onClick={() => setConfirmDiscard(false)}>
              Keep editing
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setConfirmDiscard(false);
                requestAnimationFrame(onClose);
              }}
            >
              Discard changes
            </Button>
          </div>
        </Dialog>
      )}
    </>
  );
}
