# Exercise vocabulary and content policy

## Stable catalog identity
The bundled catalog has 243 movements (verified by catalog tests). Exercise IDs identify movements; workout entries have independent IDs and optional catalogId. Saved templates and results retain copied names, descriptions and prescribed targets. Catalog metadata or alias changes never rewrite performed snapshots. Workout-local Custom entries are user-authored and have no inferred catalog equipment/focus metadata.

## Equipment, type and focus
Canonical equipment IDs (data/equipment.ts): kettlebell, dumbbell, jump-rope, rower, raised-surface, jump-box, pullup-bar and slam-ball. Every required item must be available. An empty list means no mandatory equipment; mats may be optional. Equipment type does not encode quantity: instructions explicitly identify two dumbbells, a stable surface or a non-rolling pair when required. Unconfigured equipment preferences show everything; a saved empty selection means bodyweight only. Unknown Custom metadata is not proof of no equipment.

Picker type categories: Kettlebell, Dumbbell, Push-ups, Planks, Squats, Cardio, Other bodyweight, Other equipment, Uncategorized. These are navigation categories rather than exclusive physiological classifications. Focus IDs: legs, glutes, core, arms, shoulders, chest, back, lats, whole-body. A movement may have zero or multiple focus areas. Lats implies Back; Whole body is an explicit tag, not a wildcard. Multiple selected focus areas match ANY, combined with equipment eligibility AND search. Search aliases such as abs/core and pecs/chest improve discovery without changing IDs. Canonical mappings live in data/focus.ts and data/equipment.ts; unsupported metadata changes need an explicit migration decision.

## Intensity vocabulary
Catalog metadata includes optional `trainingType` (mobility/strength) and `intensity` (low/moderate/high) editorial descriptors. These are broad content annotations, not measured effort, load prescriptions or personalized readiness advice. Equipment, load, pace, range, rest, skill and duration all affect effort. The picker uses equipment, focus, search and favourites; curated alternatives do not rank effort or promise equivalence. Personal records currently expose equipment, focus and supported units rather than an intensity editor. Actual performance records contain user-entered quantities and optional load; there is no perceived-effort rating.

## Prescriptions, results and time
Targets support reps, seconds, metres and calories only when the movement supports that unit. Calories refer to equipment readouts, not estimated calories burned by NextRound. Repetitions follow the movement's documented side/counting convention. Targets are planned work; checkmarks and advancement are user declarations, not sensor measurements. Do not sum mixed units into a rep score.

EMOM, Countdown, AMRAP and Intervals specify timer durations. For Time and Ladder optionally set a cap; a cap limits active time but does not predict completion. Ladder uses the same rep progression for each chosen movement; seconds-only movements are ineligible and units are never converted. The preview total is prescribed reps, not a duration estimate or achieved score. Active elapsed results exclude lead-in and pauses. Future duration estimates must be labeled estimates with uncertainty; only explicit caps/fixed durations satisfy guaranteed timer constraints.

## Content and provenance
Bundled descriptions are concise original prose referencing the movement sources documented in exercise-sources.md; do not copy proprietary coaching text, photographs or branded workout programs. Record the precise variant, required equipment and counting convention. Aliases and renames do not count as new movements. Avoid promises of suitability, medical benefit or measured intensity. Updates preserve IDs and saved snapshots; meaningful changed variants require distinct IDs.

Current content includes curated movements, persistent personal exercises and workout-local Custom entries. Personal records use distinct IDs and can be copied, edited, archived and restored; archived records remain referenced by existing snapshots but are hidden from new selections. Workout-local Custom entries need not belong to the personal library. Saved templates, sessions and history preserve their captured exercise names, descriptions and targets. Shared user-content services and moderation are outside the offline app's scope.

## Curated alternatives
Directed catalog-ID relationships in `data/exercise-alternatives.ts` explain changes in movement or equipment. They are not symmetric by default or medical advice. Replace offers an explicit preview, target explanation and confirmation, with slot-local Undo. Equipment, focus, search, favourites and workout compatibility remain active; Show all equipment is a temporary explicit override. Unknown custom or personal IDs fall back to ordinary replacement. No numeric effort/load conversion, running-workout substitution or historical rewrite is performed. All six builders and session-block editing share this flow.


The 1.17.0 additions include three carries measured in seconds/metres and seventeen rep/time movements. Wall push-ups require a sturdy wall but no purchased apparatus; this is stated in the cue. Equipment tags identify the implement type, while descriptions specify whether one or two dumbbells/kettlebells are needed. See the [variant-specific references](exercise-sources.md#1170-additions).

The 1.18.0 expansion adds ten equipment-free, six dumbbell and four kettlebell movements. Exercise favourites store stable library IDs independently of history; archived personal movements retain their star but are hidden until restored. Copies have new IDs and do not inherit stars. See [sources](exercise-sources.md#1180-additions).
