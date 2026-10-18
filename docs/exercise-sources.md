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

## 1.7.0: whole-body and core expansion

Reviewed October 3, 2026. Exactly 20 additions bring the catalog to **103**. `catalog-160-baseline.json` preserves all 83 prior records byte-for-value after parsing; metadata remains separate from saved workout snapshots. Ten additions focus on core and ten are assigned whole-body. Fifteen require no equipment; five require kettlebells or dumbbells.

The following primary coaching references inform terminology and the selected variants. Descriptions and editable starting targets are original; targets are suggestions, not measured performance or a pace prescription.

| Movements | Reference and variant decision |
| --- | --- |
| Abdominal crunch | [ACE abdominal library](https://www.acefitness.org/resources/everyone/exercise-library/body-part/abs/) identifies the floor crunch as equipment-free. This is a shoulder curl, distinct from the existing sit-up. |
| Bodyweight Russian twist | [NASM Russian twist](https://www.nasm.org/resource-center/exercise-library/russian-twist) describes bodyweight/weighted rotation. Our explicitly seated, feet-down, unweighted variant does not require the stability ball in NASM's separate library listing. Each side counts once. |
| V-up | [Peloton core class with V-ups](https://www.onepeloton.com/classes/strength/15-min-strength-roll-call-core-callie-gullickson-1671625320) and [CrossFit Gymnastics demo referenced by Joint Strike](https://jointstrikecrossfit.com/2020/03/30/) identify the simultaneous trunk/leg lift. Bent knees are the scaling cue. |
| Hollow-body rock | [CrossFit movement guide](https://www.crossfit.com/essentials/the-hollow-rock). One forward/back cycle counts once, distinct from the existing static hold. |
| Side-plank hip lift | [Peloton forearm-side-plank hip-dip class](https://www.onepeloton.com/en-GB/classes/strength/5-min-core-strength-callie-gullickson-1687546380?classId=80d07b96567e4d3e87c275bd8aa6641e). Lower/lift is counted per working side. |
| Side-plank reach-through | [FIFA training progressions](https://www.fifatrainingcentre.com/en/practice/training-perspectives/athleticism-for-young-players/athleticism-for-young-players-core-strength-progressions.php) and [Kysero coaching instructions](https://kysero.io/exercise-library/side-plank-reach-through/). Our version is unloaded, without FIFA's resisted progression. |
| High-plank shoulder tap; reverse-plank hold | [Peloton plank variations](https://www.onepeloton.com/blog/plank-variations). Taps count each hand; the reverse plank is static and seconds-only. |
| Bear-plank hold | [Peloton bear plank](https://www.onepeloton.com/blog/bear-plank). Bent knees hover under hips; seconds-only, distinct from the existing moving bear crawl. |
| Standing cross-body crunch | [Beyond the Scale Healthy demonstration](https://www.youtube.com/watch?v=spy6bh20sW0). Alternating knee/opposite-elbow movement; each side counts once. |
| Squat thrust | [NASM library](https://www.nasm.org/workout-exercise-guidance) lists squat thrusts/burpees. Our explicit variant omits both push-up and jump, distinguishing it from the existing burpee. |
| Burpee broad jump | [HYROX movement rules](https://maintain.hyrox.com/rulebooks/HYROX_RulebookAdaptive_EN.pdf). Chest-to-floor plus two-foot forward jump; the app counts one combined rep and does not claim competition judging or prescribe race distance. |
| Skater bound; high-knees running | [Nourish Move Love coach demonstrations](https://www.nourishmovelove.com/strength-walking-workout/comment-page-1/). Our skater uses a lateral bound; high knees run in place rather than the existing planted-foot knee drive. Each landing/knee lift counts once. |
| Inchworm with push-up | [Peloton low-impact exercise guide](https://www.onepeloton.com/en-GB/blog/low-impact-workout). One walkout, push-up and standing return is a rep; distinct from the existing walkout without push-up. |
| Kettlebell Turkish get-up; clean and press | [Greg Brookes' kettlebell library](https://kettlebellsworkouts.com/kettlebell-exercises/). One bell; get-up counts a full up/down on one side, clean/strict press counts a complete combination. The get-up starts at only one editable rep and specifically says never rush or skip unloaded practice. |
| Alternating dumbbell snatch | [CrossFit 24.1 movement standard](https://games.crossfit.com/workouts/open/2024?division=36&scaled=2). One dumbbell from floor to overhead; our variant alternates after each rep with hand changes on the floor. |
| Dumbbell devil press | [CrossFit Reverb coaching instructions](https://crossfitreverb.net/training/technique-tuesday-devil-press/). Two non-rolling dumbbells, burpee then direct overhead lift; no rack/press. |
| Dumbbell man maker | [Nourish Move Love coach demonstration](https://www.nourishmovelove.com/dumbbell-arm-workout/) provides the compound movement. Our counted sequence is push-up, row each arm, squat/curl, standing press and reset; two non-rolling dumbbells are required. |

Equipment settings currently express equipment types, not quantities or geometry. The two-dumbbell movements explicitly name both the quantity and non-rolling requirement in their descriptions. Core holds use seconds only; other additions use reps/seconds, with compound and alternating counting conventions stated. No calorie estimates or unsupported distance targets are supplied. Focus tags are browsing aids and include important secondary areas; whole-body is explicitly assigned to the ten whole-body additions. Full and short plural search aliases are tested.

## 1.17.0 additions

Reviewed October 12, 2026. Twenty additions bring the catalog from 103 to **123**. The full previous records are retained in `catalog-1160-baseline.json`. Descriptions are original short cues; no source images or text are bundled. Default targets are editable starting suggestions, not pace predictions or exercise prescriptions.

| New movements | Reference and variant decision |
| --- | --- |
| Walking lunge | [Catalyst Athletics: Lunge](https://www.catalystathletics.com/exercise/354/Lunge/) includes the walking variation. This entry travels forward without load rather than returning to the start after each rep. |
| Cossack squat | [Catalyst Athletics](https://www.catalystathletics.com/exercise/584/Cossack-Squat/). Unloaded wide-stance lateral squat; distinct from stepping out into a lateral lunge. Each side counts once. |
| Wall push-up | [Mayo Clinic: modified pushups, including wall variation](https://www.mayoclinic.org/healthy-lifestyle/fitness/multimedia/modified-pushup/vid-20084674). Requires a sturdy wall, explicitly stated; no purchased apparatus. |
| Diamond push-up; triceps kickback | [ACE triceps exercise study and technique](https://contentcdn.eacefitness.com/certifiednews/images/article/pdfs/ACETricepsStudy.pdf). Diamond refers to the close-hand triangle push-up; our kickback uses two light dumbbells with a standing hinge, no supporting bench. |
| Prone Y raise; prone T raise | [ACE prone scapular series](https://www.acefitness.org/resources/everyone/exercise-library/249/prone-scapular-shoulder-stabilization-series-i-y-t-w-o-formation/). Two separate arm paths, unloaded and face down, not a combined series rep. |
| Side-plank leg raise | [ACE Kick Start phase II](https://www.acefitness.org/resources/everyone/blog/6595/ace-s-kick-start-workout-phase-ii/) describes the raised-leg side-plank progression. Our dynamic version counts a top-leg raise/lower, distinct from the catalog's static side plank and hip lift. |
| Glute-bridge walkout | [Catalyst Athletics: glute-ham bridge walkout](https://www.catalystathletics.com/exercise/731/Glute-Ham-Bridge-Walkout/). One full out-and-back sequence counts once. |
| Dumbbell standing biceps curl; bent-over reverse fly | [Mayo Clinic Health System dumbbell demonstrations](https://www.mayoclinichealthsystem.org/hometown-health/speaking-of-health/pump-you-up-exercise-with-dumbbells-video). Standing bilateral variants, two dumbbells, no bench. |
| Dumbbell hammer curl | [ACE hammer curl](https://www.acefitness.org/resources/everyone/exercise-library/10/hammer-curl/). Neutral grip, bilateral paired rep. |
| Dumbbell lateral raise | [ACE lateral raise](https://www.acefitness.org/resources/everyone/exercise-library/26/lateral-raise/). Two light weights; one paired lift/lower counts once. |
| Dumbbell front raise | [ACE front raise](https://www.acefitness.org/resources/everyone/exercise-library/54/front-raise/). Bilateral forward arm path. |
| Dumbbell overhead triceps extension | [ACE triceps extension](https://www.acefitness.org/resources/everyone/exercise-library/74/triceps-extension/). One dumbbell held with both hands, no bench. |
| Dumbbell farmer carry; kettlebell two-bell farmer carry | [ACE farmer carry](https://www.acefitness.org/resources/everyone/exercise-library/359/farmer-s-carry/). Bilateral carries with the named implement; explicitly require two weights. Seconds/metres only. |
| Kettlebell single-arm floor press | [StrongFirst floor press](https://www.strongfirst.com/using-the-floor-to-strengthen-your-press/). Single kettlebell; one press/lower counts once on the chosen arm. |
| Kettlebell front-rack carry | [StrongFirst carries](https://www.strongfirst.com/two-important-carries-clinician/). Single-arm rack carry, distinct from a suitcase carry; choose a side per interval. |
| Kettlebell sumo deadlift | [Muscle & Strength one-kettlebell sumo deadlift demonstration](https://www.muscleandstrength.com/exercises/one-kettlebell-sumo-deadlift). Explicit wider stance and turned-out toes distinguish this from the standard catalog deadlift. |

Equipment vocabulary continues to describe implement types, not quantities: descriptions specify one versus two weights. The wall push-up is grouped with no-apparatus movements and states its wall requirement. Carries accept seconds/metres and are excluded from reps-only Ladder selection; the other 17 additions accept reps/seconds. Paired arm movements count each simultaneous pair once, alternating leg movements count each side once, and unilateral exercises use per-side targets. Focus metadata describes movement emphasis, not medical or therapeutic claims.

## 1.18.0 additions

Reviewed October 14, 2026. Twenty additions bring the library from 123 to **143**. `catalog-1170-baseline.json` preserves every prior entry. The cues are original summaries, with no source images bundled. Targets are editable starting suggestions. Unilateral movements use one side per set unless the cue explicitly says to alternate; alternating movements count each side as one rep. A figure eight counts a complete loop around both legs; a half get-up counts the full ascent and return.

| Added movement | Technique reference |
| --- | --- |
| Cat-cow | [ACE](https://www.acefitness.org/resources/everyone/exercise-library/15/cat-cow/) |
| Child’s pose | [ACE](https://www.acefitness.org/resources/everyone/exercise-library/227/childs-pose/) |
| Cobra stretch | [ACE](https://www.acefitness.org/resources/everyone/exercise-library/16/cobra/) |
| Prone contralateral limb raise | [ACE](https://www.acefitness.org/resources/everyone/exercise-library/53/contralateral-limb-raises/) |
| Downward-facing dog | [ACE](https://www.acefitness.org/resources/everyone/exercise-library/18/downward-facing-dog/) |
| Diagonal glute-activation lunge | [ACE, cross-body variant](https://www.acefitness.org/resources/everyone/exercise-library/96/glute-activation-lunges/) |
| High-plank T-spine rotation | [ACE](https://www.acefitness.org/resources/everyone/exercise-library/330/high-plank-t-spine-rotation/) |
| High-plank hip rotation | [ACE](https://www.acefitness.org/resources/everyone/exercise-library/110/hip-rotations-push-up-position/) |
| Side-lying hip adduction | [ACE](https://www.acefitness.org/resources/everyone/exercise-library/39/side-lying-hip-adduction/) |
| Half-kneeling hip-flexor stretch | [ACE](https://www.acefitness.org/resources/everyone/blog/5681/3-stretches-for-opening-up-tight-hips/) |
| Dumbbell diagonal raise | [ACE](https://www.acefitness.org/resources/everyone/exercise-library/371/diagonal-raise/) |
| Two-dumbbell front squat | [ACE](https://www.acefitness.org/resources/everyone/exercise-library/22/front-squat/) |
| Dumbbell lateral lunge | [ACE](https://www.acefitness.org/resources/everyone/exercise-library/364/lateral-lunge/) |
| Dumbbell suitcase carry | [Muscle & Strength](https://www.muscleandstrength.com/exercises/dumbbell-suitcase-carry) |
| Dumbbell renegade row | [Muscle & Strength](https://www.muscleandstrength.com/exercises/renegade-row), knee-supported scaling; existing man-maker also documents the plank row |
| Dumbbell floor fly | [Muscle & Strength floor adaptation](https://www.muscleandstrength.com/workouts/single-pair-dumbbell-bodyweight-workout) |
| Kettlebell figure eight | [ACE](https://www.acefitness.org/resources/everyone/exercise-library/382/figure-eight/) |
| Kettlebell half Turkish get-up | [ACE](https://www.acefitness.org/resources/everyone/exercise-library/381/half-turkish-get-up/) |
| Kettlebell low windmill | [ACE](https://www.acefitness.org/resources/everyone/exercise-library/387/low-windmill/) |
| Kettlebell pull-over crunch | [ACE](https://www.acefitness.org/resources/everyone/exercise-library/380/pull-over-crunch/) |

The ten bodyweight additions need no apparatus; a mat is optional. Six additions need dumbbells and four need a kettlebell. Static mobility holds use seconds; suitcase carry uses seconds/metres and neither enters reps-only Ladder. The low windmill holds the bell in the lower hand, distinct from the existing overhead version. The half get-up stops before standing, and the floor fly uses the floor to limit its range. Equipment and focus tags describe the movement, not a personalized training prescription.

## 1.21.0 additions

Reviewed October 16, 2026. Twenty distinct additions bring the catalog to **163**. `catalog-1200-baseline.json` freezes all 143 prior entries. Cues are original summaries; no third-party images are included. The ten bodyweight movements require no apparatus (mat optional). Six dumbbell entries include a step-up that additionally requires a stable weight-bearing platform. Four additions use kettlebells. Quantities are explicit in descriptions.

| Movement | Technique reference |
| --- | --- |
| Supine pelvic tilt | [Reference](https://www.acefitness.org/resources/everyone/exercise-library/7/supine-pelvic-tilts/) |
| Standing chest stretch | [Reference](https://www.acefitness.org/resources/everyone/exercise-library/209/standing-chest-stretch/) |
| Standing gate opener | [Reference](https://www.acefitness.org/resources/everyone/exercise-library/201/standing-gate-openers-frankensteins/) |
| Triangle side stretch | [Reference](https://www.acefitness.org/resources/everyone/exercise-library/225/standing-triangle-straddle-bends/) |
| Sumo rotational squat | [Reference](https://www.acefitness.org/resources/everyone/exercise-library/129/sumo-rotational-squats/) |
| Single-leg balance | [Reference](https://www.acefitness.org/resources/everyone/exercise-library/112/single-leg-stand/) |
| Bodyweight single-leg Romanian deadlift | [Reference](https://www.acefitness.org/resources/everyone/exercise-library/329/single-leg-romanian-deadlift/) |
| Knee-supported side plank | [Reference](https://www.acefitness.org/resources/everyone/exercise-library/100/side-plank-modified/) |
| Single-arm plank | [Reference](https://www.acefitness.org/resources/everyone/exercise-library/321/single-arm-plank/) |
| Prone W raise | [Reference](https://www.acefitness.org/resources/everyone/exercise-library/249/prone-scapular-shoulder-stabilization-series-i-y-t-w-o-formation/) |
| Dumbbell two-arm bent-over row | [Reference](https://www.muscleandstrength.com/exercises/bent-over-dumbbell-row.html) |
| Dumbbell shrug | [Reference](https://www.muscleandstrength.com/exercises/dumbbell-shrugs.html) |
| Dumbbell side bend | [Reference](https://www.muscleandstrength.com/exercises/dumbbell-side-bends.html) |
| Dumbbell suitcase squat | [Reference](https://www.muscleandstrength.com/exercises/dumbbell-squat.html) |
| Dumbbell floor pullover | [Reference](https://www.youtube.com/watch?v=k6b7vIjJxy0) |
| Dumbbell step-up | [Reference](https://www.acefitness.org/resources/everyone/exercise-library/28/step-up/) |
| Kettlebell bottoms-up press | [Reference](https://www.acefitness.org/resources/everyone/exercise-library/396/bottom-up-press/) |
| Kettlebell double push press | [Reference](https://www.acefitness.org/resources/everyone/exercise-library/384/double-push-press/) |
| Kettlebell suitcase deadlift | [Reference](https://www.strongfirst.com/seven-basic-human-movements/) |
| Kettlebell bottoms-up carry | [Reference](https://www.strongfirst.com/military-press-strength-that-transfers-only-if-you-use-your-lats/) |

Static stretches, balance and plank holds use seconds. The bottoms-up carry accepts seconds/metres. These are excluded from reps-only Ladder. Dynamic unilateral movements count each complete action on the chosen side; paired lifts count the simultaneous pair once. Step-ups alternate leading legs and count each ascent/descent once. A rotational squat counts each squat/turn once. Starting targets are editable suggestions, not pace or performance estimates.

Variants are deliberately distinct: the W arm path differs from Y/T raises; knee-supported and single-arm plank holds differ from existing straight-leg/tapping planks. The suitcase squat carries two weights beside the legs instead of a goblet/front rack. Two-arm rows use a bilateral unsupported hinge. Suitcase deadlifts load one side with both feet down. Bottoms-up movements balance an inverted bell; the double push press uses two bells. No existing exercise or historical snapshot is rewritten.


## 1.22.0 additions

Twenty distinct movements; the prior 163 records are unchanged. Descriptions are original concise cues. Defaults are editable prescriptions, not predictions. Timed unilateral holds are per side; switch between sets. Training type and intensity are qualitative catalog guidance, not measured effort. Wall support is stated explicitly for ankle/calf movements; wrist work requires a stable raised surface.

| Movement | Technique reference | Default | Type / intensity |
|---|---|---|---|
| Supine snow angel | [Source](https://www.acefitness.org/resources/everyone/exercise-library/124/supine-snow-angel-wipers-exercise/) | 8 reps | mobility / moderate |
| Seated side-straddle stretch | [Source](https://www.acefitness.org/resources/everyone/exercise-library/212/seated-side-straddle-stretch/) | 30 seconds | mobility / low |
| Cycled split-squat jump | [Source](https://www.acefitness.org/resources/everyone/exercise-library/234/cycled-split-squat-jump/) | 6 reps | strength / high |
| Single-arm single-leg plank | [Source](https://www.acefitness.org/resources/everyone/exercise-library/325/single-arm-single-leg-plank/) | 30 seconds | strength / moderate |
| Spider walk | [Source](https://www.acefitness.org/resources/everyone/exercise-library/247/spider-walks/) | 6 reps | strength / high |
| Sprinter pull | [Source](https://www.acefitness.org/resources/everyone/exercise-library/250/sprinter-pulls/) | 6 reps | strength / moderate |
| Standing ankle mobilization | [Source](https://www.acefitness.org/resources/everyone/exercise-library/224/standing-ankle-mobilization/) | 6 reps | mobility / low |
| Standing calf stretch | [Source](https://www.acefitness.org/resources/everyone/exercise-library/152/standing-dorsi-flexion-calf-stretch/) | 30 seconds | mobility / low |
| Seated hamstring stretch | [Source](https://contentcdn.eacefitness.com/assets/education-resources/lifestyle/acefit/ofk-curriculum-6-8.pdf) | 30 seconds | mobility / low |
| Seated butterfly stretch | [Source](https://www.nasm.org/resource-center/exercise-library/static-butterfly-stretch) | 30 seconds | mobility / low |
| Dumbbell single-arm single-leg Romanian deadlift | [Source](https://www.acefitness.org/resources/everyone/exercise-library/127/single-arm-single-leg-romanian-dead-lift/) | 6 reps | strength / moderate |
| Dumbbell squat to overhead raise | [Source](https://www.acefitness.org/resources/everyone/exercise-library/361/squat-to-overhead-raise/) | 6 reps | strength / moderate |
| Dumbbell transverse lunge | [Source](https://www.acefitness.org/resources/everyone/exercise-library/365/transverse-lunge/) | 6 reps | strength / moderate |
| Dumbbell V raise | [Source](https://www.acefitness.org/resources/everyone/exercise-library/370/v-raise/) | 8 reps | strength / moderate |
| Dumbbell wrist extension | [Source](https://www.acefitness.org/resources/everyone/exercise-library/29/wrist-curl-extension/) | 10 reps | strength / moderate |
| Dumbbell wrist flexion | [Source](https://www.acefitness.org/resources/everyone/exercise-library/30/wrist-curl-flexion/) | 10 reps | strength / moderate |
| Kettlebell high pull | [Source](https://kettlebellsworkouts.com/kettlebell-exercises/) | 6 reps | strength / high |
| Kettlebell bob and weave | [Source](https://kettlebellsworkouts.com/kettlebell-exercises/) | 8 reps | strength / moderate |
| Kettlebell clean, squat and press | [Source](https://kettlebellsworkouts.com/kettlebell-exercises/) | 3 reps | strength / high |
| Kettlebell forward-and-reverse lunge | [Source](https://kettlebellsworkouts.com/kettlebell-exercises/) | 4 reps | strength / moderate |

## 1.23.0 — twenty low-impact additions

The catalog grows from 183 to 203. All prior exercise records remain unchanged. The new entries emphasize controlled bodyweight movement, trunk mobility and balance, rather than jumping or added load. A stable chair/fixed support is explicitly required and tagged as **Stable raised surface** for the seated and supported entries; it must suit the specific movement. Dynamic repetitions describe what counts as one rep and unilateral intervals state which side to use. Defaults are editable suggestions, not a prescription.

Technique references checked 17 October 2026; all app cues are original summaries. Clinical source pages are used for movement mechanics only: NextRound does not reproduce their treatment programmes or claim rehabilitation benefits.

| New movements | Primary technique reference |
| --- | --- |
| Seated knee extension; supine heel slide; bent-knee fallout; supported standing hip extension; supported standing hip abduction | [Worcestershire NHS lower-limb exercises](https://www.worcsacute.nhs.uk/leaflets/lower-limb-strengthening-exercises/) |
| Standing shoulder roll | [NHS warm-up movements](https://www.nhs.uk/live-well/exercise/how-to-warm-up-before-exercising/) |
| Seated march; seated trunk rotation | [NHS sitting exercises](https://www.nhs.uk/live-well/exercise/sitting-exercises/) |
| Seated toe raise | [North Tees and Hartlepool NHS chair exercises](https://www.nth.nhs.uk/resources/chair-exercises/) |
| Supported tandem walk; supported heel walk; supported toe walk | [Worcestershire NHS strength and balance exercises](https://www.worcsacute.nhs.uk/leaflets/strength-and-balance-exercise-programme/) |
| Sideways walk | [NHS balance exercises](https://www.nhs.uk/live-well/exercise/balance-exercises/) |
| Side-lying open book | [SOS Physiotherapy: open-book rotation](https://sosphysiotherapy.ca/weeklyexercises/upper-back-stretch-thoracic-rotation-the-open-book-by-courtney-voisin/) |
| Thread the needle | [South Tees NHS kneeling exercises](https://www.southtees.nhs.uk/services/back-pain/backtracks/kneeling-exercises/) |
| Quadruped rock-back | [P]rehab's [quadruped rock-back demonstration](https://theprehabguys.com/vimeo-video/quadruped-rock-back/) |
| Supine figure-four stretch; side-lying quadriceps stretch | [NHS post-exercise stretches](https://www.nhs.uk/live-well/exercise/how-to-stretch-after-exercising/) |
| Cross-body shoulder stretch | [AAOS crossover arm stretch](https://orthoinfo.aaos.org/globalassets/pdfs/2024-rotator-cuff-and-shoulder-conditioning-program.pdf) |
| Overhead triceps stretch | [ACE overhead triceps stretch](https://www.acefitness.org/resources/everyone/exercise-library/174/overhead-triceps-stretch/) |

## 1.24.0: 20 core and whole-body movements

Reviewed 2026-10-17 against the preceding 203 IDs/names and aliases. Original concise cues are used; no source images or text are copied. Twelve movements need no dedicated equipment (a comfortable floor surface is recommended); six use dumbbells and two use a kettlebell. Targets are editable starting suggestions, not measured effort or individual readiness guidance.

| Movements | Technique reference |
| --- | --- |
| Pilates hundred, roll-up, supine single-leg circle, single-leg stretch, double-leg stretch | [Pilates Anytime: Connecting to the Mat, Lesley Logan](https://www.pilatesanytime.com/class-view/3465/video/Pilates-Connecting-to-the-Mat-by-Lesley-Logan) |
| Pilates saw, supine corkscrew, seated spine stretch forward, prone single-leg kick, prone double-leg kick | [Pilates Anytime: No Tension Mat, Amy Taylor Alpers](https://www.pilatesanytime.com/class-view/3539/video/Pilates-No-Tension-Mat-by-Amy-Taylor-Alpers) |
| Standing broad jump | [Catalyst Athletics: Broad Jump](https://www.catalystathletics.com/exercise/549/Broad-Jump/) |
| Tuck jump | [NASM: Tuck Jump](https://www.nasm.org/resource-center/exercise-library/tuck-jump) |
| Dumbbell hang power clean, squat clean, push jerk, split jerk, overhead walking lunge, overhead squat | [CrossFit Dumbbells Training Guide](https://assets.crossfit.com/pdfs/seminars/Dumbbell_Training_Guide.pdf) |
| Kettlebell crush curl in squat | [NASM: Kettlebell Crush Curl With Squat](https://www.nasm.org/resource-center/exercise-library/kettlebell-crush-curl-with-squat) |
| Kettlebell sumo deadlift high pull | [Original Kettlebell: Sumo Deadlift High Pull](https://www.originalkettlebell.com/en-us/exercise/kettlebell-sumo-deadlift) |

### Catalogue decisions

- Corkscrew uses small circles with hips down, not an overhead rollover. Single-leg circles rotate at the hip while the torso stays still; this differs from the existing leg raise. Single-/double-leg stretches coordinate a curled trunk and reaching limbs, rather than duplicating dead bugs.
- Prone kicks use controlled knee flexion with supported trunk work, distinct from the existing quadruped donkey kick and contralateral limb raise. Counting conventions are included for multi-pulse/alternating movements.
- Power versus squat cleans differ in receiving depth; push versus split jerks differ in receiving stance. Neither is a renamed push press. The overhead squat/lunge adds an overhead stabilization task to existing rack/goblet variants.
- The sumo deadlift high pull starts from the floor with a two-handed wide stance, distinct from the existing single-arm swing-based kettlebell high pull. Crush curls hold a squat while the elbows flex.
- The hundred is timed; other additions support reps and seconds. Defaults are 4–8 controlled repetitions (30 seconds for the hundred). Jumps and ballistic lifts are labelled high intensity; users can edit or replace them.

## 2.1.0: twenty alternatives and mobility additions

The catalog grows from 223 to 243: twelve equipment-free, four dumbbell and four kettlebell movements. Prior snapshots are preserved. Descriptions are original summaries of technique references checked 18 October 2026. Defaults are editable suggestions, not pace or effort equivalence. Static poses and holds use seconds; the overhead carry also supports metres. Dynamic additions use 4–8 reps or seconds, with counting and side conventions in their descriptions.

| Movements | Primary technique reference |
| --- | --- |
| Warrior I | [ACE Warrior I](https://www.acefitness.org/resources/everyone/exercise-library/228/warrior-i/) |
| Warrior II, Tree pose, Upward-facing dog | [ACE yoga poses](https://www.acefitness.org/resources/everyone/blog/5295/a-beginner-s-guide-to-yoga-5-widely-practiced-poses/) |
| Quadruped staggered-hand hold | [ACE CKC parascapular exercise](https://www.acefitness.org/resources/everyone/exercise-library/259/ckc-parascapular-exercises/) |
| Prone I raise, Prone O raise | [ACE prone scapular series](https://www.acefitness.org/resources/everyone/exercise-library/249/prone-scapular-shoulder-stabilization-series-i-y-t-w-o-formation/) |
| Push-up with single-leg raise | [ACE](https://www.acefitness.org/resources/everyone/exercise-library/42/push-up-with-single-leg-raise/) |
| Staggered-hand push-up | [ACE](https://www.acefitness.org/resources/everyone/exercise-library/327/push-up-with-staggered-hands/) |
| Seated bent-knee biceps stretch | [ACE](https://www.acefitness.org/resources/everyone/exercise-library/208/seated-bent-knee-biceps-stretch/) |
| Forward lunge with arm drivers | [ACE](https://www.acefitness.org/resources/everyone/exercise-library/95/forward-lunge-with-arm-drivers/) |
| Standing lunge stretch | [ACE](https://www.acefitness.org/resources/everyone/exercise-library/137/standing-lunge-stretch/) |
| Dumbbell rotational overhead press | [ACE](https://www.acefitness.org/resources/everyone/exercise-library/368/rotational-overhead-press/) |
| Dumbbell rotational uppercut | [ACE](https://www.acefitness.org/resources/everyone/exercise-library/369/rotational-uppercut/) |
| Dumbbell reverse lunge with rotation | [ACE](https://www.acefitness.org/resources/everyone/exercise-library/360/reverse-lunge-with-rotation/) |
| Dumbbell side-lying arm roll; Kettlebell arm bar | [ACE weighted arm-roll mechanics and kettlebell variant](https://www.acefitness.org/resources/everyone/exercise-library/223/side-lying-arm-rolls/), [StrongFirst arm-bar demonstration](https://www.youtube.com/watch?v=k7qyA5bMYRA) |
| Kettlebell dead-stop swing | [Andrea DuCane: single-rep dead-stop swing](https://kettlebellfitness.com/2015/07/the-single-rep-dead-stop-swing-clean-snatch-workout/) |
| Kettlebell single-arm overhead carry; Kettlebell overhead hold | [Greg Brookes: overhead carry and static hold](https://kettlebellsworkouts.com/kettlebell-overhead-carry/) |

Variant audit: I and O use different shoulder positions from existing Y/T/W raises. Upward dog lifts the thighs rather than the floor-supported cobra. Tree pose uses external hip rotation and foot-to-calf contact. Arm drivers add a forward reach and hinge to a lunge. The dumbbell roll is dynamic; the kettlebell arm bar is a timed side-lying hold. The overhead hold stays stationary while the carry walks. A dead-stop swing parks and resets between repetitions. No new equipment categories or rehabilitation claims are introduced.

### Curated alternative decisions

Relationships are editorial choices based on the technique references above and the earlier catalog sources on this page, not claims endorsed by those sources. Pressing variants change support/lever or implement; squat and lunge variants change load or stepping; plank variants change support; swing variants change reset or ballistic movement; carries change load position or remove walking. Cardio options offer rhythmic movement with different mechanics, not rowing-distance or calorie equivalents. Directed rationales explicitly describe these differences. Targets use existing compatible-unit rules, never physiological or numeric load conversion. New poses and raises are related only where the movement change can be clearly explained.

## 2.2.0 additions (20; catalog total 263)

Reviewed October 18, 2026. Eight equipment-free, six dumbbell and six kettlebell movements. These are original short technique summaries, not copied source text or medical advice. Prior 243 IDs/descriptions remain unchanged. Holds use seconds; the overhead carry uses seconds/metres; dynamic movements use reps/seconds. Suggested EMOM counts are editable planning defaults, not prescribed loads or effort equivalences. Unilateral holds/carries use a chosen side; alternating movements count each individual press/swing/lunge; simultaneous two-arm lifts count one completed cycle.

| Movements | Primary technique references |
| --- | --- |
| Bent-knee Boat, Chair, Eagle | Yoga Journal: [Boat](https://www.yogajournal.com/poses/boat-pose/?scope=anon), [Chair](https://www.yogajournal.com/poses/chair-pose-2/?scope=anon), [Eagle](https://www.yogajournal.com/poses/eagle-pose/?scope=anon) |
| Happy baby, Sphinx, Locust | Yoga Journal: [Happy baby](https://www.yogajournal.com/poses/happy-baby-pose/?scope=anon), [Sphinx](https://www.yogajournal.com/poses/sphinx-pose/?scope=anon), [Locust](https://www.yogajournal.com/poses/locust-pose/?scope=anon) |
| Extended side angle | [Sally Parkes: anatomy and technique](https://sallyparkesyoga.com/wp-content/uploads/2017/06/ANATOMY-OF-POSE-EX-SIDE-ANGLE-PAGE-1-ultraFit_P84_yoga-1.pdf), using the forearm-on-thigh variation |
| Half moon | [Erin Sampson, Five Parks Yoga](https://fiveparksyoga.com/yoga-poses/half-moon/), floor-supported variation |
| Zottman curl, standing Arnold press, standing reverse curl | Muscle & Strength: [Zottman](https://www.muscleandstrength.com/exercises/zottman-curl.html), [Arnold](https://www.muscleandstrength.com/exercises/standing-arnold-press.html), [reverse curl](https://www.muscleandstrength.com/exercises/standing-dumbbell-reverse-curl.html) |
| Alternating dumbbell floor press | [OPEX Fitness technique demonstration](https://www.youtube.com/watch?v=5t9ggij1eXk) |
| Dumbbell kickstand Romanian deadlift | [PureGym B-stance deadlift](https://www.puregym.com/exercises/legs/hamstring-exercises/deadlifts/b-stance-deadlift/) |
| Dumbbell single-arm overhead carry | [Catalyst Athletics](https://www.catalystathletics.com/exercise/888/Single-Arm-Dumbbell-Overhead-Carry/) |
| Double kettlebell clean, double front squat | StrongFirst: [the three cleans](https://www.strongfirst.com/3-cleans-relationship-form-function/), [double-bell patterns](https://www.strongfirst.com/get-stronger-with-odd-load-kettlebell-training/) |
| Double kettlebell jerk | [StrongFirst: kettlebell jerk](https://www.strongfirst.com/go-ballistic-the-jerk-for-barbell-and-kettlebell/) |
| Kettlebell seesaw press | StrongFirst: [press variations](https://www.strongfirst.com/get-stronger-with-odd-load-kettlebell-training/), [practitioner description of reciprocal pressing](https://www.strongfirst.com/community/threads/see-saw-press-programming.22629/) |
| Hand-to-hand swing, tactical lunge | Greg Brookes: [changing hands](https://kettlebellsworkouts.com/changing-hands/), [tactical lunge](https://kettlebellsworkouts.com/kettlebell-tactical-lunge/) |

Distinctness audit: Boat is a static bent-knee balance, not the existing dynamic seated knee tuck. Sphinx rests on forearms rather than pressing into Cobra. Locust reaches arms backward rather than Superman's forward reach. Arnold press rotates the arms without the existing rotational press's trunk pivot. Alternating floor press works one arm at a time. Kickstand RDL retains rear-foot support. Double clean/front squat require two bells; double jerk adds a second knee dip absent from push press. Seesaw pressing moves arms reciprocally, hand-to-hand swings add a transfer, and tactical lunges add an under-leg pass.

Curated alternatives were added only where justified: dumbbell to kettlebell overhead carry changes the implement; double front squat to goblet squat changes rack/load setup; hand-to-hand to two-handed swing removes the hand transfer. Targets and equipment are reviewed in the existing confirmation; no load conversion is inferred.
