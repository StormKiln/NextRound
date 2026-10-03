import type { ExerciseEntry, ExerciseTarget } from '@nextround/core';

// Starting suggestions, not pace estimates. Unilateral counts apply to the chosen side;
// alternating movements count each repetition. Unknown movements default to time.
const reps: Record<string, number> = {
  squat: 10,
  pushup: 8,
  situp: 10,
  burpee: 5,
  swing: 12,
  lunge: 10,
  jump: 30,
  'kettlebell-deadlift': 10,
  'kettlebell-single-leg-deadlift': 6,
  'kettlebell-single-arm-swing': 10,
  'kettlebell-clean': 6,
  'kettlebell-snatch': 6,
  'kettlebell-goblet-squat': 8,
  'kettlebell-racked-squat': 8,
  'kettlebell-reverse-lunge': 6,
  'kettlebell-side-lunge': 8,
  'kettlebell-row': 8,
  'kettlebell-overhead-press': 6,
  'kettlebell-push-press': 8,
  'kettlebell-thruster': 6,
  'kettlebell-halo': 6,
  'kettlebell-slingshot': 10,
  'kettlebell-tall-kneeling-press': 6,
  'kettlebell-half-kneeling-press': 6,
  'kettlebell-windmill': 4,
  'pushup-knee': 8,
  'pushup-incline': 8,
  'pushup-decline': 6,
  'pushup-pike': 6,
  'pushup-plyometric': 4,
  'plank-walkup': 6,
  'plank-three-tap': 6,
  'plank-quadruped-kickback': 8,
  'squat-prisoner': 10,
  'squat-jump': 6,
  'squat-single-leg': 4,
  'squat-split': 6,
  'squat-bulgarian': 6,
};
export function defaultEmomTarget(entry: ExerciseEntry): ExerciseTarget {
  const count = reps[entry.catalogId ?? entry.id];
  return count && entry.supportedUnits?.includes('reps')
    ? { unit: 'reps', value: count }
    : { unit: 'seconds', value: 30 };
}
export function rotationNotice(minutes: number, entries: ExerciseEntry[]): string | null {
  if (
    !Number.isInteger(minutes) ||
    minutes < 1 ||
    minutes > 1440 ||
    !entries.length ||
    minutes % entries.length === 0
  )
    return null;
  if (minutes < entries.length)
    return `Only the first ${minutes} movements will run. ${entries
      .slice(minutes)
      .map((e) => e.name)
      .join(', ')} will not run. Add time or adjust your order if that is not intentional.`;
  const full = Math.floor(minutes / entries.length);
  return `Uneven rotation: the first ${minutes % entries.length} movements run ${full + 1} times; the remaining ${entries.length - (minutes % entries.length)} run ${full} times. Your workout can still start as configured.`;
}
