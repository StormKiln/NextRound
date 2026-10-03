import { useId } from 'react';
import { Button } from '@/components/ui/button';
import { type FocusArea, focusAreas, type PickerView } from '@/data/focus';

export function FocusControls({
  view,
  onView,
  selected,
  onChange,
}: {
  view: PickerView;
  onView: (view: PickerView) => void;
  selected: FocusArea[];
  onChange: (areas: FocusArea[]) => void;
}) {
  const id = useId();
  return (
    <div className="focus-controls">
      <label htmlFor={id}>Group exercises by</label>
      <select id={id} value={view} onChange={(e) => onView(e.target.value as PickerView)}>
        <option value="type">Exercise type</option>
        <option value="focus">Focus area</option>
      </select>
      <details>
        <summary>
          <span>Focus areas</span>{' '}
          <span>{selected.length ? `${selected.length} selected` : 'All areas'}</span>
        </summary>
        <p>Match any selected area. Back includes lats; whole body is its own category.</p>
        <fieldset>
          <legend className="sr-only">Filter by focus area</legend>
          {Object.entries(focusAreas).map(([id, label]) => (
            <label key={id}>
              <input
                type="checkbox"
                checked={selected.includes(id as FocusArea)}
                onChange={(event) =>
                  onChange(
                    event.target.checked
                      ? [...selected, id as FocusArea]
                      : selected.filter((area) => area !== id),
                  )
                }
              />
              {label}
            </label>
          ))}
        </fieldset>
        <Button variant="ghost" disabled={!selected.length} onClick={() => onChange([])}>
          Clear focus filters
        </Button>
      </details>
      {selected.length > 0 && (
        <p className="hint">Matching any: {selected.map((area) => focusAreas[area]).join(', ')}</p>
      )}
      {view === 'focus' && (
        <p className="hint">Exercises may appear in several groups. Group counts overlap.</p>
      )}
    </div>
  );
}
