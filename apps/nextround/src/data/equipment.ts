import type { ExerciseEntry } from '@nextround/core';
import type { FocusArea } from './focus';
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
  targetAreas?: FocusArea[];
};
export const catalogMetadata: Record<string, CatalogMetadata> = {
  squat: { targetAreas: ['legs', 'glutes'], equipment: [], category: 'Squats', aliases: [] },
  pushup: {
    targetAreas: ['chest', 'arms', 'shoulders'],
    equipment: [],
    category: 'Push-ups',
    aliases: [],
  },
  situp: { targetAreas: ['core'], equipment: [], category: 'Other bodyweight', aliases: [] },
  burpee: {
    targetAreas: ['whole-body', 'legs', 'core'],
    equipment: [],
    category: 'Cardio',
    aliases: [],
  },
  swing: {
    targetAreas: ['legs', 'glutes', 'back'],
    equipment: ['kettlebell'],
    category: 'Kettlebell',
    aliases: [],
  },
  lunge: {
    targetAreas: ['legs', 'glutes'],
    equipment: [],
    category: 'Other bodyweight',
    aliases: [],
  },
  plank: { targetAreas: ['core'], equipment: [], category: 'Planks', aliases: [] },
  jump: { targetAreas: ['legs'], equipment: ['jump-rope'], category: 'Cardio', aliases: [] },
  'kettlebell-deadlift': {
    targetAreas: ['legs', 'glutes', 'back'],
    equipment: ['kettlebell'],
    category: 'Kettlebell',
    aliases: [],
  },
  'kettlebell-single-leg-deadlift': {
    targetAreas: ['legs', 'glutes', 'back'],
    equipment: ['kettlebell'],
    category: 'Kettlebell',
    aliases: [],
  },
  'kettlebell-single-arm-swing': {
    targetAreas: ['legs', 'glutes', 'back'],
    equipment: ['kettlebell'],
    category: 'Kettlebell',
    aliases: [],
  },
  'kettlebell-clean': {
    targetAreas: ['whole-body', 'legs', 'glutes', 'shoulders'],
    equipment: ['kettlebell'],
    category: 'Kettlebell',
    aliases: [],
  },
  'kettlebell-snatch': {
    targetAreas: ['whole-body', 'legs', 'glutes', 'shoulders'],
    equipment: ['kettlebell'],
    category: 'Kettlebell',
    aliases: [],
  },
  'kettlebell-goblet-squat': {
    targetAreas: ['legs', 'glutes'],
    equipment: ['kettlebell'],
    category: 'Kettlebell',
    aliases: [],
  },
  'kettlebell-racked-squat': {
    targetAreas: ['legs', 'glutes'],
    equipment: ['kettlebell'],
    category: 'Kettlebell',
    aliases: [],
  },
  'kettlebell-reverse-lunge': {
    targetAreas: ['legs', 'glutes'],
    equipment: ['kettlebell'],
    category: 'Kettlebell',
    aliases: [],
  },
  'kettlebell-side-lunge': {
    targetAreas: ['legs', 'glutes'],
    equipment: ['kettlebell'],
    category: 'Kettlebell',
    aliases: [],
  },
  'kettlebell-row': {
    targetAreas: ['lats', 'arms', 'back'],
    equipment: ['kettlebell'],
    category: 'Kettlebell',
    aliases: [],
  },
  'kettlebell-overhead-press': {
    targetAreas: ['shoulders', 'arms'],
    equipment: ['kettlebell'],
    category: 'Kettlebell',
    aliases: [],
  },
  'kettlebell-push-press': {
    targetAreas: ['legs', 'shoulders', 'arms'],
    equipment: ['kettlebell'],
    category: 'Kettlebell',
    aliases: [],
  },
  'kettlebell-thruster': {
    targetAreas: ['whole-body', 'legs', 'glutes', 'shoulders', 'arms'],
    equipment: ['kettlebell'],
    category: 'Kettlebell',
    aliases: [],
  },
  'kettlebell-halo': {
    targetAreas: ['shoulders', 'core'],
    equipment: ['kettlebell'],
    category: 'Kettlebell',
    aliases: [],
  },
  'kettlebell-slingshot': {
    targetAreas: ['core', 'arms'],
    equipment: ['kettlebell'],
    category: 'Kettlebell',
    aliases: [],
  },
  'kettlebell-suitcase-carry': {
    targetAreas: ['core', 'arms'],
    equipment: ['kettlebell'],
    category: 'Kettlebell',
    aliases: [],
  },
  'kettlebell-tall-kneeling-press': {
    targetAreas: ['shoulders', 'arms'],
    equipment: ['kettlebell'],
    category: 'Kettlebell',
    aliases: [],
  },
  'kettlebell-half-kneeling-press': {
    targetAreas: ['shoulders', 'arms'],
    equipment: ['kettlebell'],
    category: 'Kettlebell',
    aliases: [],
  },
  'kettlebell-windmill': {
    targetAreas: ['core', 'shoulders'],
    equipment: ['kettlebell'],
    category: 'Kettlebell',
    aliases: [],
  },
  'pushup-knee': {
    targetAreas: ['chest', 'arms', 'shoulders'],
    equipment: [],
    category: 'Push-ups',
    aliases: [],
  },
  'pushup-incline': {
    targetAreas: ['chest', 'arms', 'shoulders'],
    equipment: ['raised-surface'],
    category: 'Push-ups',
    aliases: [],
  },
  'pushup-decline': {
    targetAreas: ['chest', 'arms', 'shoulders'],
    equipment: ['raised-surface'],
    category: 'Push-ups',
    aliases: [],
  },
  'pushup-pike': {
    targetAreas: ['shoulders', 'arms'],
    equipment: [],
    category: 'Push-ups',
    aliases: [],
  },
  'pushup-plyometric': {
    targetAreas: ['chest', 'arms', 'shoulders'],
    equipment: [],
    category: 'Push-ups',
    aliases: [],
  },
  'plank-high': { targetAreas: ['core'], equipment: [], category: 'Planks', aliases: [] },
  'plank-side': { targetAreas: ['core'], equipment: [], category: 'Planks', aliases: [] },
  'plank-walkup': {
    targetAreas: ['core', 'shoulders', 'arms'],
    equipment: [],
    category: 'Planks',
    aliases: [],
  },
  'plank-three-tap': {
    targetAreas: ['core', 'shoulders', 'arms'],
    equipment: [],
    category: 'Planks',
    aliases: [],
  },
  'plank-quadruped-kickback': {
    targetAreas: ['core', 'glutes'],
    equipment: [],
    category: 'Planks',
    aliases: [],
  },
  'squat-prisoner': {
    targetAreas: ['legs', 'glutes'],
    equipment: [],
    category: 'Squats',
    aliases: [],
  },
  'squat-jump': { targetAreas: ['legs', 'glutes'], equipment: [], category: 'Squats', aliases: [] },
  'squat-single-leg': {
    targetAreas: ['legs', 'glutes'],
    equipment: [],
    category: 'Squats',
    aliases: [],
  },
  'squat-split': {
    targetAreas: ['legs', 'glutes'],
    equipment: [],
    category: 'Squats',
    aliases: [],
  },
  'squat-bulgarian': {
    targetAreas: ['legs', 'glutes'],
    equipment: ['raised-surface'],
    category: 'Squats',
    aliases: [],
  },
  'rowing-machine': {
    targetAreas: ['whole-body', 'legs', 'core'],
    equipment: ['rower'],
    category: 'Cardio',
    aliases: [],
  },
  'glute-bridge': {
    targetAreas: ['glutes', 'legs'],
    equipment: [],
    category: 'Other bodyweight',
    aliases: ['hip bridge'],
  },
  'mountain-climber': {
    targetAreas: ['whole-body', 'core', 'legs'],
    equipment: [],
    category: 'Cardio',
    aliases: ['mountain climbers'],
  },
  'dead-bug': {
    targetAreas: ['core'],
    equipment: [],
    category: 'Other bodyweight',
    aliases: ['deadbug'],
  },
  'bird-dog': {
    targetAreas: ['core', 'back', 'glutes'],
    equipment: [],
    category: 'Other bodyweight',
    aliases: ['birddog'],
  },
  'hollow-body-hold': {
    targetAreas: ['core'],
    equipment: [],
    category: 'Other bodyweight',
    aliases: ['hollow hold'],
  },
  'superman-hold': {
    targetAreas: ['back', 'glutes'],
    equipment: [],
    category: 'Other bodyweight',
    aliases: ['superman'],
  },
  'standing-calf-raise': {
    targetAreas: ['legs'],
    equipment: [],
    category: 'Other bodyweight',
    aliases: ['heel raise'],
  },
  'inchworm-walkout': {
    targetAreas: ['whole-body', 'core', 'shoulders'],
    equipment: [],
    category: 'Other bodyweight',
    aliases: ['walk out', 'inchworm'],
  },
  'dumbbell-goblet-squat': {
    targetAreas: ['legs', 'glutes'],
    equipment: ['dumbbell'],
    category: 'Dumbbell',
    aliases: ['db goblet squat'],
  },
  'dumbbell-reverse-lunge': {
    targetAreas: ['legs', 'glutes'],
    equipment: ['dumbbell'],
    category: 'Dumbbell',
    aliases: ['db reverse lunge'],
  },
  'dumbbell-romanian-deadlift': {
    targetAreas: ['legs', 'glutes', 'back'],
    equipment: ['dumbbell'],
    category: 'Dumbbell',
    aliases: ['dumbbell rdl', 'db rdl'],
  },
  'dumbbell-single-arm-row': {
    targetAreas: ['lats', 'arms', 'back'],
    equipment: ['dumbbell'],
    category: 'Dumbbell',
    aliases: ['db row'],
  },
  'dumbbell-floor-press': {
    targetAreas: ['chest', 'arms', 'shoulders'],
    equipment: ['dumbbell'],
    category: 'Dumbbell',
    aliases: ['db floor press'],
  },
  'dumbbell-strict-press': {
    targetAreas: ['shoulders', 'arms'],
    equipment: ['dumbbell'],
    category: 'Dumbbell',
    aliases: ['dumbbell shoulder press', 'db strict press'],
  },
  'dumbbell-push-press': {
    targetAreas: ['legs', 'shoulders', 'arms'],
    equipment: ['dumbbell'],
    category: 'Dumbbell',
    aliases: ['db push press'],
  },
  'dumbbell-thruster': {
    targetAreas: ['whole-body', 'legs', 'glutes', 'shoulders', 'arms'],
    equipment: ['dumbbell'],
    category: 'Dumbbell',
    aliases: ['db thruster'],
  },
  'box-step-up': {
    targetAreas: ['legs', 'glutes'],
    equipment: ['raised-surface'],
    category: 'Other equipment',
    aliases: ['step up'],
  },
  'box-jump': {
    targetAreas: ['legs', 'glutes'],
    equipment: ['jump-box'],
    category: 'Other equipment',
    aliases: ['box jumps'],
  },
  'pull-up': {
    targetAreas: ['lats', 'arms', 'back'],
    equipment: ['pullup-bar'],
    category: 'Other equipment',
    aliases: ['pullup', 'pull up'],
  },
  'medicine-ball-slam': {
    targetAreas: ['whole-body', 'legs', 'core'],
    equipment: ['slam-ball'],
    category: 'Other equipment',
    aliases: ['slam ball', 'ball slam'],
  },
  'reverse-crunch': {
    equipment: [],
    category: 'Other bodyweight',
    aliases: ['reverse crunches'],
    targetAreas: ['core'],
  },
  'bicycle-crunch': {
    equipment: [],
    category: 'Other bodyweight',
    aliases: ['bicycle crunches'],
    targetAreas: ['core'],
  },
  'supine-heel-reach': {
    equipment: [],
    category: 'Other bodyweight',
    aliases: ['heel reaches', 'supine lateral heel reaches'],
    targetAreas: ['core'],
  },
  'seated-knee-tuck': {
    equipment: [],
    category: 'Other bodyweight',
    aliases: ['knee tucks', 'seated knee tucks'],
    targetAreas: ['core'],
  },
  'flutter-kicks': {
    equipment: [],
    category: 'Other bodyweight',
    aliases: ['flutter kicks'],
    targetAreas: ['core'],
  },
  'lying-leg-raise': {
    equipment: [],
    category: 'Other bodyweight',
    aliases: ['leg raises', 'lying leg raises'],
    targetAreas: ['core'],
  },
  'single-leg-glute-bridge': {
    equipment: [],
    category: 'Other bodyweight',
    aliases: ['single leg glute bridges', 'single-leg glute bridges'],
    targetAreas: ['glutes', 'legs'],
  },
  'glute-bridge-march': {
    equipment: [],
    category: 'Other bodyweight',
    aliases: ['glute bridge marches'],
    targetAreas: ['glutes', 'core'],
  },
  'bodyweight-lateral-lunge': {
    equipment: [],
    category: 'Other bodyweight',
    aliases: ['lateral lunges', 'bodyweight lateral lunges'],
    targetAreas: ['legs', 'glutes'],
  },
  'forward-lunge': {
    equipment: [],
    category: 'Other bodyweight',
    aliases: ['forward lunges'],
    targetAreas: ['legs', 'glutes'],
  },
  'bodyweight-good-morning': {
    equipment: [],
    category: 'Other bodyweight',
    aliases: ['good mornings', 'bodyweight good mornings'],
    targetAreas: ['legs', 'glutes', 'back'],
  },
  'side-lying-leg-raise': {
    equipment: [],
    category: 'Other bodyweight',
    aliases: ['side lying leg raises', 'side-lying leg raises'],
    targetAreas: ['glutes'],
  },
  'unbanded-clamshell': {
    equipment: [],
    category: 'Other bodyweight',
    aliases: ['clamshells', 'unbanded clamshells'],
    targetAreas: ['glutes'],
  },
  'quadruped-donkey-kick': {
    equipment: [],
    category: 'Other bodyweight',
    aliases: ['donkey kicks', 'quadruped donkey kicks'],
    targetAreas: ['glutes'],
  },
  'fire-hydrant': {
    equipment: [],
    category: 'Other bodyweight',
    aliases: ['fire hydrants'],
    targetAreas: ['glutes', 'core'],
  },
  'bear-crawl': {
    equipment: [],
    category: 'Other bodyweight',
    aliases: ['bear crawls'],
    targetAreas: ['whole-body', 'core', 'shoulders'],
  },
  'crab-walk': {
    equipment: [],
    category: 'Other bodyweight',
    aliases: ['crab walks'],
    targetAreas: ['whole-body', 'arms', 'shoulders'],
  },
  'standing-knee-drive': {
    equipment: [],
    category: 'Cardio',
    aliases: ['knee drives', 'standing alternating knee drives'],
    targetAreas: ['legs', 'core'],
  },
  'step-jack': {
    equipment: [],
    category: 'Cardio',
    aliases: ['step jacks'],
    targetAreas: ['whole-body'],
  },
  'jumping-jack': {
    equipment: [],
    category: 'Cardio',
    aliases: ['jumping jacks'],
    targetAreas: ['whole-body'],
  },
  'abdominal-crunch': {
    equipment: [],
    category: 'Other bodyweight',
    targetAreas: ['core'],
    aliases: ['crunches', 'ab crunch', 'ab crunches', 'abdominal crunches'],
  },
  'bodyweight-russian-twist': {
    equipment: [],
    category: 'Other bodyweight',
    targetAreas: ['core'],
    aliases: ['russian twists', 'seated twist', 'seated twists', 'bodyweight russian twists'],
  },
  'v-up': {
    equipment: [],
    category: 'Other bodyweight',
    targetAreas: ['core'],
    aliases: ['v ups', 'v up', 'vups', 'jackknife situp', 'v-ups'],
  },
  'hollow-body-rock': {
    equipment: [],
    category: 'Other bodyweight',
    targetAreas: ['core'],
    aliases: ['hollow rocks', 'hollow rock', 'hollow body rocks', 'hollow-body rocks'],
  },
  'side-plank-hip-lift': {
    equipment: [],
    category: 'Planks',
    targetAreas: ['core', 'glutes', 'shoulders'],
    aliases: [
      'side plank hip lifts',
      'side plank dips',
      'side plank hip dips',
      'side-plank hip lifts',
    ],
  },
  'side-plank-reach-through': {
    equipment: [],
    category: 'Planks',
    targetAreas: ['core', 'shoulders'],
    aliases: [
      'side plank reach throughs',
      'side plank rotations',
      'thread the needle plank',
      'side-plank reach-throughs',
    ],
  },
  'high-plank-shoulder-tap': {
    equipment: [],
    category: 'Planks',
    targetAreas: ['core', 'shoulders', 'arms'],
    aliases: ['shoulder taps', 'plank shoulder taps', 'shoulder tap', 'high-plank shoulder taps'],
  },
  'reverse-plank-hold': {
    equipment: [],
    category: 'Planks',
    targetAreas: ['core', 'glutes', 'shoulders'],
    aliases: ['reverse plank', 'reverse planks', 'supine plank', 'reverse-plank holds'],
  },
  'bear-plank-hold': {
    equipment: [],
    category: 'Planks',
    targetAreas: ['core', 'shoulders'],
    aliases: ['bear plank', 'bear planks', 'quadruped hover', 'bear-plank holds'],
  },
  'standing-cross-body-crunch': {
    equipment: [],
    category: 'Other bodyweight',
    targetAreas: ['core'],
    aliases: [
      'standing cross body crunches',
      'standing crunch',
      'standing crunches',
      'standing cross-body crunches',
    ],
  },
  'squat-thrust': {
    equipment: [],
    category: 'Cardio',
    targetAreas: ['whole-body', 'legs', 'core'],
    aliases: ['squat thrusts', 'no pushup burpee'],
  },
  'burpee-broad-jump': {
    equipment: [],
    category: 'Cardio',
    targetAreas: ['whole-body', 'legs', 'core'],
    aliases: ['burpee broad jumps', 'broad jump burpee', 'broad jump burpees'],
  },
  'skater-bound': {
    equipment: [],
    category: 'Cardio',
    targetAreas: ['whole-body', 'legs', 'glutes'],
    aliases: ['skater bounds', 'skater hops', 'speed skaters'],
  },
  'high-knees-running': {
    equipment: [],
    category: 'Cardio',
    targetAreas: ['whole-body', 'legs', 'core'],
    aliases: ['high knees', 'high knee run', 'high knee running', 'high-knees running in place'],
  },
  'inchworm-pushup': {
    equipment: [],
    category: 'Other bodyweight',
    targetAreas: ['whole-body', 'core', 'chest', 'arms'],
    aliases: [
      'inchworm pushups',
      'inchworm push up',
      'inchworm push ups',
      'inchworms with push-ups',
    ],
  },
  'kettlebell-turkish-getup': {
    equipment: ['kettlebell'],
    category: 'Kettlebell',
    targetAreas: ['whole-body', 'core', 'shoulders'],
    aliases: [
      'turkish getups',
      'turkish get up',
      'turkish get ups',
      'kb tgu',
      'kettlebell turkish get-ups',
    ],
  },
  'kettlebell-clean-press': {
    equipment: ['kettlebell'],
    category: 'Kettlebell',
    targetAreas: ['whole-body', 'legs', 'shoulders', 'arms'],
    aliases: [
      'kb clean and press',
      'kettlebell clean presses',
      'clean and presses',
      'kettlebell clean and presses',
    ],
  },
  'alternating-dumbbell-snatch': {
    equipment: ['dumbbell'],
    category: 'Dumbbell',
    targetAreas: ['whole-body', 'legs', 'shoulders'],
    aliases: [
      'alternating db snatch',
      'dumbbell snatches',
      'db snatches',
      'alternating dumbbell snatches',
    ],
  },
  'dumbbell-devil-press': {
    equipment: ['dumbbell'],
    category: 'Dumbbell',
    targetAreas: ['whole-body', 'core', 'chest', 'shoulders'],
    aliases: ['devil presses', 'db devil press', 'dumbbell devil presses'],
  },
  'dumbbell-man-maker': {
    equipment: ['dumbbell'],
    category: 'Dumbbell',
    targetAreas: ['whole-body', 'core', 'back', 'chest', 'shoulders'],
    aliases: ['man makers', 'manmaker', 'manmakers', 'db man maker', 'dumbbell man makers'],
  },
};
export function metadataFor(entry: ExerciseEntry) {
  return (
    (entry as ExerciseEntry & { metadata?: CatalogMetadata }).metadata ??
    catalogMetadata[entry.catalogId ?? entry.id]
  );
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
