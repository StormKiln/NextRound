import type { ExerciseEntry } from '@nextround/core';
export const exercises: ExerciseEntry[] = [
  {
    id: 'squat',
    name: 'Air squat',
    description: 'Sit the hips back and down, keeping the heels grounded. Stand tall to finish.',
  },
  {
    id: 'pushup',
    name: 'Push-up',
    description:
      'Keep a straight line from shoulders to heels. Lower with control and press back up. Elevate your hands to scale.',
  },
  {
    id: 'situp',
    name: 'Sit-up',
    description:
      'Move through a comfortable range with control. Keep the feet grounded and avoid pulling on the neck.',
  },
  {
    id: 'burpee',
    name: 'Burpee',
    description:
      'Step or jump back to a plank, lower with control, then return to standing. Choose a pace you can maintain.',
  },
  {
    id: 'swing',
    name: 'Kettlebell swing',
    description:
      'Hinge at the hips and drive through the legs to swing the bell to chest height. Keep the spine neutral.',
  },
  {
    id: 'lunge',
    name: 'Reverse lunge',
    description:
      'Step back, lower both knees, then push through the front foot to stand. Alternate legs.',
  },
  {
    id: 'plank',
    name: 'Plank',
    description:
      'Brace your trunk and hold a straight line from shoulders to heels. Breathe steadily.',
  },
  {
    id: 'jump',
    name: 'Jump rope',
    description:
      'Use small, relaxed jumps and turn the rope from the wrists. Keep a steady rhythm.',
  },
];
export async function listExercises() {
  return exercises;
}
