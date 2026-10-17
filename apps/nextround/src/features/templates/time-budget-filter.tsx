import { useId } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTemplateFilters } from './filter-state';
import { parseBudgetMinutes } from './time-budget';

export function TimeBudgetFilter({ onChange }: { onChange: () => void }) {
  const { budgetMinutes, budgetDraft, budgetError } = useTemplateFilters();
  const id = useId();
  function apply() {
    const value = parseBudgetMinutes(budgetDraft);
    if (value === null) {
      useTemplateFilters.setState({
        budgetError:
          'Enter a positive whole number of minutes. Your applied time filter has not changed.',
      });
      return;
    }
    onChange();
    useTemplateFilters.setState({ budgetMinutes: value, budgetError: '' });
  }
  return (
    <div className="template-budget">
      <label htmlFor={id}>Available minutes</label>
      <div className="template-budget-controls">
        <Input
          id={id}
          type="text"
          inputMode="numeric"
          value={budgetDraft}
          aria-invalid={!!budgetError}
          aria-describedby={`${id}-help${budgetError ? ` ${id}-error` : ''}`}
          onChange={(e) =>
            useTemplateFilters.setState({ budgetDraft: e.target.value, budgetError: '' })
          }
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              apply();
            }
          }}
        />
        <Button variant="secondary" onClick={apply}>
          Apply time
        </Button>
        <Button
          variant="secondary"
          disabled={budgetMinutes === null && !budgetDraft && !budgetError}
          onClick={() => {
            onChange();
            useTemplateFilters.setState({ budgetMinutes: null, budgetDraft: '', budgetError: '' });
          }}
        >
          Reset time
        </Button>
      </div>
      <p id={`${id}-help`}>
        {budgetMinutes === null
          ? 'No time limit applied.'
          : `Applied: up to ${budgetMinutes} minutes, including lead-in.`}{' '}
        Scheduled rests count. Pauses add time. Uncapped workouts are excluded when a time limit is
        applied; caps are not predicted finish times.
      </p>
      {budgetError && (
        <p id={`${id}-error`} role="alert">
          {budgetError}
        </p>
      )}
    </div>
  );
}
