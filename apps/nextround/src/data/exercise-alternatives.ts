import type { ExerciseEntry } from '@nextround/core';

// Directed editorial suggestions, not effort equivalences or injury-specific advice.
// Technique references and pairing decisions: docs/exercise-sources.md.
export const alternatives: Record<string, readonly { id: string; reason: string }[]> = {
  'dumbbell-overhead-carry': [
    {
      id: 'kettlebell-overhead-carry',
      reason:
        'Changes the overhead implement to a kettlebell; grip and load need independent review.',
    },
  ],
  'kettlebell-double-front-squat': [
    {
      id: 'kettlebell-goblet-squat',
      reason:
        'Uses one front-held bell instead of two racked bells; choose the load independently.',
    },
  ],
  'kettlebell-hand-to-hand-swing': [
    {
      id: 'swing',
      reason: 'Removes the hand transfer and uses two hands on the handle.',
    },
  ],

  pushup: [
    {
      id: 'pushup-knee',
      reason:
        'Keeps a horizontal press while shortening the support lever with knees on the floor.',
    },
    {
      id: 'pushup-incline',
      reason: 'Raises the hands on a stable support and changes the pressing angle.',
    },
    {
      id: 'pushup-staggered',
      reason: 'Keeps floor pressing and changes the hand position to an offset stance.',
    },
  ],
  'pushup-knee': [
    {
      id: 'pushup',
      reason: 'Moves support from knees to toes while keeping the horizontal pressing pattern.',
    },
  ],
  'pushup-decline': [
    {
      id: 'pushup',
      reason: 'Returns feet to floor level and removes the raised support requirement.',
    },
  ],
  'pushup-leg-raise': [
    { id: 'pushup', reason: 'Removes the leg lift and keeps both feet supporting the press.' },
  ],
  squat: [
    {
      id: 'kettlebell-goblet-squat',
      reason: 'Adds a front-held kettlebell to a two-legged squat. Choose the load separately.',
    },
  ],
  'squat-jump': [
    { id: 'squat', reason: 'Removes the jump and landing while retaining the squat pattern.' },
  ],
  'kettlebell-goblet-squat': [
    { id: 'squat', reason: 'Removes the external load while retaining a two-legged squat.' },
    {
      id: 'dumbbell-goblet-squat',
      reason: 'Changes the front-held implement to a dumbbell. Loads are not converted.',
    },
  ],
  'dumbbell-goblet-squat': [
    {
      id: 'kettlebell-goblet-squat',
      reason: 'Uses a kettlebell for the front-held squat. Select the load independently.',
    },
  ],
  lunge: [
    {
      id: 'squat-split',
      reason: 'Keeps a split stance throughout, removing the step back between repetitions.',
    },
  ],
  'dumbbell-reverse-lunge': [
    {
      id: 'lunge',
      reason: 'Removes the dumbbells while keeping the reverse-lunge stepping pattern.',
    },
  ],
  'dumbbell-reverse-lunge-rotation': [
    {
      id: 'dumbbell-reverse-lunge',
      reason: 'Removes the trunk rotation; the dumbbell setup and load need review.',
    },
  ],
  plank: [
    {
      id: 'plank-high',
      reason: 'Moves support from forearms to hands, changing the shoulder and wrist demands.',
    },
  ],
  'plank-high': [
    { id: 'plank', reason: 'Moves support to the forearms while retaining a timed trunk hold.' },
  ],
  'plank-side': [
    {
      id: 'side-plank-knees',
      reason: 'Uses a bent knee for support, shortening the side-plank lever.',
    },
  ],
  'high-plank-shoulder-tap': [
    {
      id: 'plank-high',
      reason:
        'Keeps both hands grounded instead of alternating taps. Review the change to a timed target.',
    },
  ],
  swing: [
    {
      id: 'kettlebell-dead-stop-swing',
      reason:
        'Parks and resets the bell between swings instead of linking repetitions continuously.',
    },
    {
      id: 'kettlebell-deadlift',
      reason:
        'Replaces the ballistic swing with a controlled floor-to-standing hinge. Reassess the target and load.',
    },
  ],
  'kettlebell-dead-stop-swing': [
    {
      id: 'swing',
      reason: 'Links swings continuously instead of resetting on the floor between repetitions.',
    },
  ],
  'kettlebell-single-arm-swing': [
    {
      id: 'swing',
      reason:
        'Uses two hands on the bell instead of one, changing the grip and rotational demands.',
    },
  ],
  'kettlebell-overhead-carry': [
    {
      id: 'kettlebell-suitcase-carry',
      reason:
        'Moves the bell from overhead to the side while retaining walking. Shoulder and trunk demands change.',
    },
    {
      id: 'kettlebell-overhead-hold',
      reason:
        'Keeps the overhead position but removes walking. Distance targets must change to time.',
    },
  ],
  'kettlebell-overhead-hold': [
    {
      id: 'kettlebell-front-rack-carry',
      reason:
        'Moves the bell to the rack and adds walking; review the different movement and load.',
    },
  ],
  'dumbbell-push-press': [
    {
      id: 'dumbbell-strict-press',
      reason: 'Removes the leg drive while retaining an overhead press. Reassess the chosen load.',
    },
  ],
  'dumbbell-strict-press': [
    {
      id: 'kettlebell-overhead-press',
      reason: 'Changes to a single kettlebell and a chosen side. Counts and load need review.',
    },
  ],
  'dumbbell-floor-press': [
    {
      id: 'pushup-knee',
      reason:
        'Uses a bodyweight horizontal press instead of dumbbells. The support and loading pattern differ.',
    },
  ],
  'jumping-jack': [
    {
      id: 'step-jack',
      reason:
        'Steps one foot at a time instead of jumping both feet, retaining coordinated arm movement.',
    },
  ],
  jump: [
    {
      id: 'step-jack',
      reason:
        'Offers equipment-free rhythmic movement without a rope or repeated jumps. Cadence and effort are not equivalent.',
    },
  ],
  'rowing-machine': [
    {
      id: 'standing-knee-drive',
      reason:
        'Offers equipment-free alternating movement instead of rowing. It does not reproduce rowing resistance or distance; review the target.',
    },
  ],
  'burpee-broad-jump': [
    {
      id: 'burpee',
      reason: 'Removes the travelling broad jump while retaining the floor-to-standing movement.',
    },
  ],
  'prone-i-raise': [
    {
      id: 'prone-y-raise',
      reason: 'Changes the overhead arm position from parallel to a wider Y.',
    },
  ],
  'upward-facing-dog': [
    {
      id: 'cobra-stretch',
      reason: 'Keeps the hips and thighs supported on the floor rather than lifting them.',
    },
  ],
};

export function curatedAlternatives(source: ExerciseEntry, eligible: ExerciseEntry[]) {
  const choices = alternatives[source.catalogId ?? source.id] ?? [];
  return choices.flatMap((choice) => {
    const entry = eligible.find((e) => e.id === choice.id);
    return entry ? [{ entry, reason: choice.reason }] : [];
  });
}
