import type { ExerciseEntry } from '@nextround/core';
export const equipmentLabels = {
  kettlebell: 'Kettlebell',
  dumbbell: 'Dumbbell',
  'jump-rope': 'Jump rope',
  rower: 'Rowing machine',
  'raised-surface': 'Stable raised surface',
  'jump-box': 'Jump-rated box',
  'pullup-bar': 'Pull-up bar',
  'slam-ball': 'Non-bouncing slam ball',
} as const;
export type EquipmentId = keyof typeof equipmentLabels;
export const categories = [
  'Kettlebell',
  'Dumbbell',
  'Push-ups',
  'Planks',
  'Squats',
  'Cardio',
  'Other bodyweight',
  'Other equipment',
  'Uncategorized',
] as const;
export type CatalogMetadata = {
  equipment: EquipmentId[];
  category: (typeof categories)[number];
  aliases: string[];
};
export const catalogMetadata: Record<string, CatalogMetadata> = {
  squat: { equipment: [], category: 'Squats', aliases: [] },
  pushup: { equipment: [], category: 'Push-ups', aliases: [] },
  situp: { equipment: [], category: 'Other bodyweight', aliases: [] },
  burpee: { equipment: [], category: 'Cardio', aliases: [] },
  swing: { equipment: ['kettlebell'], category: 'Kettlebell', aliases: [] },
  lunge: { equipment: [], category: 'Other bodyweight', aliases: [] },
  plank: { equipment: [], category: 'Planks', aliases: [] },
  jump: { equipment: ['jump-rope'], category: 'Cardio', aliases: [] },
  'kettlebell-deadlift': { equipment: ['kettlebell'], category: 'Kettlebell', aliases: [] },
  'kettlebell-single-leg-deadlift': {
    equipment: ['kettlebell'],
    category: 'Kettlebell',
    aliases: [],
  },
  'kettlebell-single-arm-swing': { equipment: ['kettlebell'], category: 'Kettlebell', aliases: [] },
  'kettlebell-clean': { equipment: ['kettlebell'], category: 'Kettlebell', aliases: [] },
  'kettlebell-snatch': { equipment: ['kettlebell'], category: 'Kettlebell', aliases: [] },
  'kettlebell-goblet-squat': { equipment: ['kettlebell'], category: 'Kettlebell', aliases: [] },
  'kettlebell-racked-squat': { equipment: ['kettlebell'], category: 'Kettlebell', aliases: [] },
  'kettlebell-reverse-lunge': { equipment: ['kettlebell'], category: 'Kettlebell', aliases: [] },
  'kettlebell-side-lunge': { equipment: ['kettlebell'], category: 'Kettlebell', aliases: [] },
  'kettlebell-row': { equipment: ['kettlebell'], category: 'Kettlebell', aliases: [] },
  'kettlebell-overhead-press': { equipment: ['kettlebell'], category: 'Kettlebell', aliases: [] },
  'kettlebell-push-press': { equipment: ['kettlebell'], category: 'Kettlebell', aliases: [] },
  'kettlebell-thruster': { equipment: ['kettlebell'], category: 'Kettlebell', aliases: [] },
  'kettlebell-halo': { equipment: ['kettlebell'], category: 'Kettlebell', aliases: [] },
  'kettlebell-slingshot': { equipment: ['kettlebell'], category: 'Kettlebell', aliases: [] },
  'kettlebell-suitcase-carry': { equipment: ['kettlebell'], category: 'Kettlebell', aliases: [] },
  'kettlebell-tall-kneeling-press': {
    equipment: ['kettlebell'],
    category: 'Kettlebell',
    aliases: [],
  },
  'kettlebell-half-kneeling-press': {
    equipment: ['kettlebell'],
    category: 'Kettlebell',
    aliases: [],
  },
  'kettlebell-windmill': { equipment: ['kettlebell'], category: 'Kettlebell', aliases: [] },
  'pushup-knee': { equipment: [], category: 'Push-ups', aliases: [] },
  'pushup-incline': { equipment: ['raised-surface'], category: 'Push-ups', aliases: [] },
  'pushup-decline': { equipment: ['raised-surface'], category: 'Push-ups', aliases: [] },
  'pushup-pike': { equipment: [], category: 'Push-ups', aliases: [] },
  'pushup-plyometric': { equipment: [], category: 'Push-ups', aliases: [] },
  'plank-high': { equipment: [], category: 'Planks', aliases: [] },
  'plank-side': { equipment: [], category: 'Planks', aliases: [] },
  'plank-walkup': { equipment: [], category: 'Planks', aliases: [] },
  'plank-three-tap': { equipment: [], category: 'Planks', aliases: [] },
  'plank-quadruped-kickback': { equipment: [], category: 'Planks', aliases: [] },
  'squat-prisoner': { equipment: [], category: 'Squats', aliases: [] },
  'squat-jump': { equipment: [], category: 'Squats', aliases: [] },
  'squat-single-leg': { equipment: [], category: 'Squats', aliases: [] },
  'squat-split': { equipment: [], category: 'Squats', aliases: [] },
  'squat-bulgarian': { equipment: ['raised-surface'], category: 'Squats', aliases: [] },
  'rowing-machine': { equipment: ['rower'], category: 'Cardio', aliases: [] },
  'glute-bridge': { equipment: [], category: 'Other bodyweight', aliases: ['hip bridge'] },
  'mountain-climber': { equipment: [], category: 'Cardio', aliases: ['mountain climbers'] },
  'dead-bug': { equipment: [], category: 'Other bodyweight', aliases: ['deadbug'] },
  'bird-dog': { equipment: [], category: 'Other bodyweight', aliases: ['birddog'] },
  'hollow-body-hold': { equipment: [], category: 'Other bodyweight', aliases: ['hollow hold'] },
  'superman-hold': { equipment: [], category: 'Other bodyweight', aliases: ['superman'] },
  'standing-calf-raise': { equipment: [], category: 'Other bodyweight', aliases: ['heel raise'] },
  'inchworm-walkout': {
    equipment: [],
    category: 'Other bodyweight',
    aliases: ['walk out', 'inchworm'],
  },
  'dumbbell-goblet-squat': {
    equipment: ['dumbbell'],
    category: 'Dumbbell',
    aliases: ['db goblet squat'],
  },
  'dumbbell-reverse-lunge': {
    equipment: ['dumbbell'],
    category: 'Dumbbell',
    aliases: ['db reverse lunge'],
  },
  'dumbbell-romanian-deadlift': {
    equipment: ['dumbbell'],
    category: 'Dumbbell',
    aliases: ['dumbbell rdl', 'db rdl'],
  },
  'dumbbell-single-arm-row': { equipment: ['dumbbell'], category: 'Dumbbell', aliases: ['db row'] },
  'dumbbell-floor-press': {
    equipment: ['dumbbell'],
    category: 'Dumbbell',
    aliases: ['db floor press'],
  },
  'dumbbell-strict-press': {
    equipment: ['dumbbell'],
    category: 'Dumbbell',
    aliases: ['dumbbell shoulder press', 'db strict press'],
  },
  'dumbbell-push-press': {
    equipment: ['dumbbell'],
    category: 'Dumbbell',
    aliases: ['db push press'],
  },
  'dumbbell-thruster': { equipment: ['dumbbell'], category: 'Dumbbell', aliases: ['db thruster'] },
  'box-step-up': {
    equipment: ['raised-surface'],
    category: 'Other equipment',
    aliases: ['step up'],
  },
  'box-jump': { equipment: ['jump-box'], category: 'Other equipment', aliases: ['box jumps'] },
  'pull-up': {
    equipment: ['pullup-bar'],
    category: 'Other equipment',
    aliases: ['pullup', 'pull up'],
  },
  'medicine-ball-slam': {
    equipment: ['slam-ball'],
    category: 'Other equipment',
    aliases: ['slam ball', 'ball slam'],
  },
};
export function metadataFor(entry: ExerciseEntry) {
  return catalogMetadata[entry.catalogId ?? entry.id];
}
export function missingEquipment(required: EquipmentId[], selection: EquipmentId[]) {
  const available = new Set(selection);
  if (available.has('jump-box')) available.add('raised-surface');
  return required.filter((id) => !available.has(id));
}
export function eligibleExercise(entry: ExerciseEntry, selection: EquipmentId[] | null) {
  if (selection === null) return true;
  const metadata = metadataFor(entry);
  return !!metadata && missingEquipment(metadata.equipment, selection).length === 0;
}
export function equipmentNote(entry: ExerciseEntry, selection: EquipmentId[] | null): string {
  const metadata = metadataFor(entry);
  if (!metadata) return 'Equipment requirements unknown';
  if (selection !== null) {
    const missing = missingEquipment(metadata.equipment, selection);
    if (missing.length)
      return `Missing equipment: ${missing.map((id) => equipmentLabels[id]).join(', ')}`;
  }
  return metadata.equipment.length
    ? `Equipment: ${metadata.equipment.map((id) => equipmentLabels[id]).join(', ')}`
    : 'No equipment required';
}
