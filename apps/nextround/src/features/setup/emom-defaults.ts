import { countLabel, type ExerciseEntry, type ExerciseTarget } from '@nextround/core';

// Starting suggestions, not pace estimates. Unilateral counts apply to the chosen side;
// alternating movements count each repetition. Unknown movements default to time.
const reps: Record<string, number> = {
  'abdominal-crunch': 10,
  'bodyweight-russian-twist': 12,
  'v-up': 6,
  'hollow-body-rock': 8,
  'side-plank-hip-lift': 6,
  'side-plank-reach-through': 6,
  'high-plank-shoulder-tap': 12,
  'standing-cross-body-crunch': 12,
  'squat-thrust': 6,
  'burpee-broad-jump': 4,
  'skater-bound': 12,
  'high-knees-running': 20,
  'inchworm-pushup': 3,
  'kettlebell-turkish-getup': 1,
  'kettlebell-clean-press': 4,
  'alternating-dumbbell-snatch': 6,
  'dumbbell-devil-press': 3,
  'dumbbell-man-maker': 3,

  'reverse-crunch': 10,
  'bicycle-crunch': 16,
  'supine-heel-reach': 16,
  'seated-knee-tuck': 10,
  'lying-leg-raise': 8,
  'single-leg-glute-bridge': 8,
  'glute-bridge-march': 12,
  'bodyweight-lateral-lunge': 10,
  'forward-lunge': 10,
  'bodyweight-good-morning': 10,
  'side-lying-leg-raise': 12,
  'unbanded-clamshell': 12,
  'quadruped-donkey-kick': 10,
  'fire-hydrant': 10,
  'standing-knee-drive': 20,
  'step-jack': 20,
  'jumping-jack': 20,

  'glute-bridge': 10,
  'mountain-climber': 20,
  'dead-bug': 8,
  'bird-dog': 8,
  'standing-calf-raise': 15,
  'inchworm-walkout': 5,
  'dumbbell-goblet-squat': 8,
  'dumbbell-reverse-lunge': 8,
  'dumbbell-romanian-deadlift': 10,
  'dumbbell-single-arm-row': 8,
  'dumbbell-floor-press': 8,
  'dumbbell-strict-press': 6,
  'dumbbell-push-press': 8,
  'dumbbell-thruster': 6,
  'box-step-up': 8,
  'box-jump': 5,
  'pull-up': 4,
  'medicine-ball-slam': 8,

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
    return `Only the first ${countLabel(minutes, 'movement')} will run. ${entries
      .slice(minutes)
      .map((e) => e.name)
      .join(', ')} will not run. Add time or adjust your order if that is not intentional.`;
  const full = Math.floor(minutes / entries.length);
  return `Uneven rotation: the first ${countLabel(minutes % entries.length, 'movement')} ${minutes % entries.length === 1 ? 'runs' : 'run'} ${countLabel(full + 1, 'time')}; the remaining ${entries.length - (minutes % entries.length)} run ${countLabel(full, 'time')}. Your workout can still start as configured.`;
}
