import type { ExerciseEntry } from '@nextround/core';
import { Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
export function FavoriteButton({
  entry,
  selected,
  disabled,
  onToggle,
}: {
  entry: ExerciseEntry;
  selected: boolean;
  disabled: boolean;
  onToggle: (id: string) => void;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      className="exercise-favorite"
      aria-label={`${selected ? 'Unfavourite' : 'Favourite'} ${entry.name}`}
      aria-pressed={selected}
      disabled={disabled}
      onClick={() => onToggle(entry.id)}
    >
      <Star size={20} fill={selected ? 'currentColor' : 'none'} aria-hidden="true" />
    </Button>
  );
}
