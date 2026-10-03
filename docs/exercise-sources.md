# Exercise catalogue sources

Reviewed 2026-09-30 for the 0.3.0 seed expansion. The catalogue contains 43 entries: the original eight, 19 additional kettlebell movements (20 total), five additional push-up variations, five additional plank variations, five additional bodyweight squat variations, and rowing on a rowing machine. The two kettlebell squats are additional to the five bodyweight squat variations.

Descriptions in `apps/nextround/src/data/exercises.ts` are original, concise form cues informed by the sources below, not copied instructions or complete tutorials. The original eight entries, including their IDs, names, descriptions and order, remain unchanged. In particular the first three still supply the default EMOM exercises. New IDs are permanent catalogue identifiers used in saved workouts; rename display text rather than IDs.

Unilateral entries explicitly ask the user to choose a side for the interval; alternating movements say so. These cues do not prescribe weights, repetitions or medical adaptations. Each entry also declares `supportedUnits`: dynamic movements offer reps and seconds; static planks offer seconds; the suitcase carry offers seconds and metres; the rowing machine offers seconds, metres and machine calories. These are target-prescription choices, not measurements or estimates of energy expenditure. Difficulty, equipment and muscle-group taxonomy remain separate work.

## Kettlebells

Greg Brookes publishes these first-party coaching guides and the [exercise library](https://kettlebellsworkouts.com/kettlebell-exercises/). The guides were used for movement definitions and form cues, not their training or health claims.

| Seed IDs | Coaching reference |
| --- | --- |
| `swing` (existing), `kettlebell-single-arm-swing` | [One-arm swing](https://kettlebellsworkouts.com/kettlebell-swing-one-hand/) |
| `kettlebell-deadlift` | [Deadlift, including two-handed variation](https://kettlebellsworkouts.com/kettlebell-deadlift/) |
| `kettlebell-single-leg-deadlift` | [Single-leg deadlift](https://kettlebellsworkouts.com/kettlebell-single-leg-deadlift/) |
| `kettlebell-clean` | [Clean](https://kettlebellsworkouts.com/teaching-points-for-the-kettlebell-clean/) |
| `kettlebell-snatch` | [Snatch](https://kettlebellsworkouts.com/teaching-points-for-the-kettlebell-snatch/) |
| `kettlebell-goblet-squat`, `kettlebell-racked-squat` | [Squat form and loading variations](https://kettlebellsworkouts.com/teaching-points-for-the-kettlebell-squat/) |
| `kettlebell-reverse-lunge` | [Reverse lunge](https://kettlebellsworkouts.com/teaching-points-of-the-kettlebell-lunge/) |
| `kettlebell-side-lunge` | [Side lunge](https://kettlebellsworkouts.com/kettlebell-side-lunge/) |
| `kettlebell-row` | [Bent-over row](https://kettlebellsworkouts.com/kettlebell-row-exercise/) |
| `kettlebell-overhead-press`, `kettlebell-push-press`, `kettlebell-tall-kneeling-press`, `kettlebell-thruster` | [Overhead press, kneeling variations, push press and thruster](https://kettlebellsworkouts.com/teaching-points-for-the-kettlebell-overhead-press/) |
| `kettlebell-half-kneeling-press` | [Half-kneeling press](https://kettlebellsworkouts.com/kettlebell-half-kneeling-press/) |
| `kettlebell-halo` | [Halo](https://kettlebellsworkouts.com/kettlebell-halo/) |
| `kettlebell-slingshot` | [Slingshot](https://kettlebellsworkouts.com/why-kettlebell-slingshots-plus-workout/) |
| `kettlebell-suitcase-carry` | [Farmer's carry and single-bell suitcase variation](https://kettlebellsworkouts.com/kettlebell-farmers-walk/) |
| `kettlebell-windmill` | [Windmill](https://kettlebellsworkouts.com/teaching-points-for-the-kettlebell-windmill/) |

## Push-ups

NASM's first-party exercise library supplies the five additional variations. NextRound calls the knee-supported modified push-up “Knee push-up” for a clearer picker label.

| Seed ID | Reference |
| --- | --- |
| `pushup-knee` | [Modified push-up](https://www.nasm.org/resource-center/exercise-library/modified-push-up) |
| `pushup-incline` | [Incline push-up](https://www.nasm.org/resource-center/exercise-library/incline-push-up) |
| `pushup-decline` | [Decline push-up](https://www.nasm.org/resource-center/exercise-library/decline-push-up) |
| `pushup-pike` | [Pike push-up](https://www.nasm.org/resource-center/exercise-library/pike-push-up) |
| `pushup-plyometric` | [Plyometric push-up](https://www.nasm.org/resource-center/exercise-library/plyometric-push-up) |

## Planks

| Seed IDs | Reference |
| --- | --- |
| `plank-high`, `plank-three-tap`, `plank-quadruped-kickback` | ACE: [Five plank variations](https://www.acefitness.org/resources/pros/expert-articles/5376/5-plank-variations-that-will-challenge-your-core/) — high-plank setup, forearm plank with repeater three taps, and quadruped hover with leg kickbacks |
| `plank-side` | NASM: [Side plank](https://www.nasm.org/resource-center/exercise-library/side-plank) |
| `plank-walkup` | NASM: [Plank walkup](https://www.nasm.org/resource-center/exercise-library/plank-walkup) |

## Bodyweight squats

| Seed IDs | Reference |
| --- | --- |
| `squat-prisoner` | NASM: [Prisoner squat](https://www.nasm.org/resource-center/exercise-library/prisoner-squat) |
| `squat-jump` | NASM: [Squat jump](https://www.nasm.org/resource-center/exercise-library/squat-jump) |
| `squat-single-leg` | NASM: [Single-leg squat](https://www.nasm.org/resource-center/exercise-library/single-leg-squat) |
| `squat-split`, `squat-bulgarian` | ACE: [Six squat variations](https://www.acefitness.org/resources/everyone/blog/5564/squat-variations-6-effective-squat-variations-to-try/) — split and Bulgarian split squats; catalogue cues describe the unloaded movement |

## Rowing machine

`rowing-machine` follows Concept2's [indoor rowing technique](https://www.concept2.co.uk/training/rowing-technique) and [technique corrections](https://www.concept2.com/training/improve-your-rowing-technique): leg drive followed by body swing and arm pull; recovery reverses that sequence. This is indoor machine rowing, distinct from a kettlebell row.

## Verification

`apps/nextround/src/data/exercises.test.ts` guards minimum category counts, the original entries' identities/order, the existing Plank search description, unique IDs/names, nonempty concise text, the rower identity, movement-appropriate target units and full catalogue retrieval. Names are limited to 60 characters and descriptions to 240 characters for compact picker/detail text.

## 1.5.0 expansion and equipment audit

Reviewed October 3, 2026. Twenty net additions bring the catalog to 63; all 43 existing identities and descriptions remain unchanged. The new text is original concise guidance, not copied tutorials. Consult a qualified coach for technique or adaptations.

Sources consulted for terminology, movement families and equipment:
- [ACE exercise library](https://www.acefitness.org/resources/everyone/exercise-library/): bodyweight, dumbbell and equipment categories.
- NASM [bird dog](https://www.nasm.org/resource-center/exercise-library/bird-dog) and [dead bug](https://www.nasm.org/resource-center/exercise-library/dead-bug): opposite-limb movement patterns.
- CrossFit [dumbbell thruster](https://www.crossfit.com/essentials/the-dumbbell-thruster): squat-to-overhead movement.

New entries comprise eight bodyweight movements (glute bridge, mountain climber, dead bug, bird dog, hollow-body hold, superman hold, standing calf raise, inchworm walkout); eight explicitly single-dumbbell variants (goblet squat, reverse lunge, Romanian deadlift, single-arm row, floor press, strict press, push press, thruster); box step-up, box jump, strict pull-up and non-bouncing medicine-ball slam. Seconds-only holds and reps/seconds dynamic movements have valid editable starting targets. Unilateral targets apply per chosen side; alternating counts are explained in each description.

`data/equipment.ts` records explicit requirements, grouping and search aliases separately from immutable workout snapshots. All catalog entries were audited: incline/decline push-ups and Bulgarian split squats need a stable raised surface; box jumps require a jump-rated box; slam movements require a non-bouncing slam ball. A mat is optional. Unknown requirements never imply no equipment. Difficulty and focus-area taxonomy remain future work.

## 1.6.0: no-equipment expansion and focus areas

Reviewed October 3, 2026. Twenty additional movements bring the catalog to **83**; a frozen fixture verifies all 63 prior entries retain their values and order. Dead bug and inchworm were already present and are not counted as new exercises. All new entries need only clear standing/floor space; a mat is optional. No wall, furniture, bands, weights, machine or partner is required.

Movement references (terminology and form only; the app's short descriptions and editable starting targets are original):

| New movements | Primary reference |
| --- | --- |
| Reverse crunch, bicycle crunch, supine lateral heel reach, seated knee tuck, flutter kicks, lying leg raise | [Sport Keele exercise library](https://www.keele.ac.uk/sportatkeele/activekeele/exerciselibrary/) lists abdominal movement demonstrations, including ankle touches, tuck-ups and floor flutter kicks. The catalog selects floor versions. |
| Single-leg glute bridge, glute bridge march, unbanded clamshell | [Cambridge University Hospitals stability exercises](https://www.cuh.nhs.uk/patient-information/general-stability-exercises1/) provides bridge, unilateral bridge and clamshell definitions. Marching is our alternating foot-lift variation; no rehabilitation prescription is imported. |
| Bodyweight lateral lunge, forward lunge, bodyweight good morning | [Sport Keele lower-body library](https://www.keele.ac.uk/sportatkeele/activekeele/exerciselibrary/). These catalog variants are explicitly unloaded. |
| Side-lying leg raise | [ACE side-lying hip abduction](https://www.acefitness.org/resources/everyone/exercise-library/38/side-lying-hip-abduction/). |
| Quadruped donkey kick | [Life Time's first-party coaching instructions](https://experiencelife.lifetime.life/article/break-it-down-the-donkey-kick/), unweighted bent-knee version. |
| Fire hydrant | ACE's [abdominal exercise library](https://www.acefitness.org/resources/everyone/exercise-library/body-part/abs/) calls this movement Dirty Dog and identifies no equipment. |
| Bear crawl | [Sport Keele cardio library](https://www.keele.ac.uk/sportatkeele/activekeele/exerciselibrary/). |
| Crab walk | [EVO Fitness coaching tutorial](https://evofitness.at/en/blog/learn/crab-walk/): hands-and-feet floor locomotion, not a banded lateral squat walk. |
| Standing alternating knee drive | Our no-jump alternating knee-lift variant of the standing march in [ACE's active-aging movement guide](https://www.acefitness.org/resources/pros/expert-articles/5278/an-active-aging-workout-for-almost-everyone/). |
| Step jack | [PureGym step-jack instructions](https://www.puregym.com/exercises/cardio/jumping-jack/step-jacks/), kept distinct from jumping jacks. |
| Jumping jack | [NASM exercise library](https://www.nasm.org/workout-exercise-guidance), no-equipment full-body movement. |

Crawls and flutter kicks use seconds to avoid ambiguous distance/rep definitions. Other new entries offer reps and seconds. Alternating movements count each side as one rep; unilateral sets count the chosen side and tell users to switch between sets. Starting targets are editable suggestions, not a prescribed pace or calorie estimate.

All 83 entries now have explicit catalog-only `targetAreas`. The audit uses the existing movement-family sources above, plus [NASM's body-part listings](https://www.nasm.org/workout-exercise-guidance) and [ACE's body-part taxonomy](https://www.acefitness.org/resources/everyone/exercise-library/body-part/abs/). Tags represent a primary or important secondary focus, not every stabilizing muscle. Legs includes thigh/calf work; glutes is independently selectable; core includes abs; chest includes pecs; lats also match Back. Whole body is a deliberately assigned movement category, not a wildcard. The mapping is a browsing aid, not a clinical assessment or personalized training recommendation.

Focus selection matches **any** chosen area and combines with equipment and name search. Group totals can overlap, but suggestions deduplicate by catalog ID. Unknown/untagged metadata appears under Unspecified with no inferred targets. Metadata is not added to or migrated into historical workout snapshots. The catalog metadata tests reject unknown/duplicate tags and protect old identities.
