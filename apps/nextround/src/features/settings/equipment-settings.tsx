import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { type EquipmentId, equipmentLabels } from '@/data/equipment';
import { useEquipment } from './equipment-store';
export function EquipmentSettings() {
  const { selection, loaded, error, load, save } = useEquipment();
  const [draft, setDraft] = useState<EquipmentId[]>(selection ?? []);
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    setDraft(selection ?? []);
  }, [selection]);
  return (
    <>
      <h3>Equipment</h3>
      <p>
        Select what you have available. Saving with nothing selected shows no-equipment exercises
        only.
      </p>
      <p className="muted">
        {selection === null
          ? 'Not configured: all equipment is currently shown.'
          : 'Your saved selection filters exercise choices and suggestions.'}{' '}
        Existing workouts stay unchanged.
      </p>
      <fieldset className="equipment-options" disabled={!loaded}>
        <legend>Available equipment</legend>
        {(Object.entries(equipmentLabels) as [EquipmentId, string][]).map(([id, label]) => (
          <label key={id}>
            <input
              type="checkbox"
              checked={draft.includes(id)}
              onChange={(e) => {
                setSaved(false);
                setDraft(e.target.checked ? [...draft, id] : draft.filter((x) => x !== id));
              }}
            />
            {label}
          </label>
        ))}
      </fieldset>
      <p className="hint">
        A jump-rated box also counts as a stable raised surface. All dumbbell movements in this
        catalog use one dumbbell. Mats are optional; use a suitable clear floor area. Custom
        movement requirements are not assessed.
      </p>
      {error && (
        <div role="alert">
          <p>{error}</p>
          <Button onClick={load}>Retry equipment settings</Button>
        </div>
      )}
      <div className="add-actions">
        <Button disabled={!loaded} onClick={() => setSaved(save(draft))}>
          Save equipment
        </Button>
        <Button variant="secondary" disabled={!loaded} onClick={() => setSaved(save(null))}>
          Use all equipment
        </Button>
      </div>
      {saved && <p role="status">Equipment settings saved.</p>}
    </>
  );
}
