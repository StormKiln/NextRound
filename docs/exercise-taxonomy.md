# Exercise vocabulary and content policy

## Stable catalog identity
The bundled catalog has103 movements. Exercise IDs identify movements; workout entries have independent IDs and optional catalogId. Saved templates and results retain copied names, descriptions and prescribed targets. Catalog metadata or alias changes never rewrite performed snapshots. Workout-local Custom entries are user-authored and have no inferred catalog equipment/focus metadata.

## Equipment, type and focus
Canonical equipment IDs (data/equipment.ts): kettlebell, dumbbell, jump-rope, rower, raised-surface, jump-box, pullup-bar and slam-ball. Every required item must be available. An empty list means no mandatory equipment; mats may be optional. Equipment type does not encode quantity: instructions explicitly identify two dumbbells, a stable surface or a non-rolling pair when required. Unconfigured equipment preferences show everything; a saved empty selection means bodyweight only. Unknown Custom metadata is not proof of no equipment.

Picker type categories: Kettlebell, Dumbbell, Push-ups, Planks, Squats, Cardio, Other bodyweight, Other equipment, Uncategorized. These are navigation categories rather than exclusive physiological classifications. Focus IDs: legs, glutes, core, arms, shoulders, chest, back, lats, whole-body. A movement may have zero or multiple focus areas. Lats implies Back; Whole body is an explicit tag, not a wildcard. Multiple selected focus areas match ANY, combined with equipment eligibility AND search. Search aliases such as abs/core and pecs/chest improve discovery without changing IDs. Canonical mappings live in data/focus.ts and data/equipment.ts; unsupported metadata changes need an explicit migration decision.

## Intensity vocabulary
Use low, moderate and high only as contextual descriptors for a specified workout prescription. They are not permanent exercise attributes or personalized readiness advice. Load, pace, range, rest, skill and duration all change effort: an air squat can be easy practice or part of a demanding circuit. Distinguish:
- Movement descriptors: equipment, type and focus; no automatic intensity score.
- Prescribed workout effort: a future author-selected low/moderate/high descriptor with the intended load/pace/rest context. Low means an intentionally easy pace, moderate a sustained controlled effort, and high a deliberately demanding effort; these are qualitative labels, not measured physiological thresholds.
- Actual perceived effort: a future user report recorded separately from the prescription, never inferred from timer completion.

Neither intensity editing nor an effort-rating field is added in1.8.0. Recommendations (#20), editable catalog (#15) and workout scoring (#18/#19) must adopt these distinctions rather than silently inventing scores.

## Prescriptions, results and time
Targets support reps, seconds, metres and calories only when the movement supports that unit. Calories refer to equipment readouts, not estimated calories burned by NextRound. Repetitions follow the movement's documented side/counting convention. Targets are planned work; checkmarks and advancement are user declarations, not sensor measurements. Do not sum mixed units into a rep score.

EMOM, Countdown, AMRAP and Intervals specify timer durations. For Time and Ladder optionally set a cap; a cap limits active time but does not predict completion. Ladder uses the same rep progression for each chosen movement; seconds-only movements are ineligible and units are never converted. The preview total is prescribed reps, not a duration estimate or achieved score. Active elapsed results exclude lead-in and pauses. Future duration estimates must be labeled estimates with uncertainty; only explicit caps/fixed durations satisfy guaranteed timer constraints.

## Content and provenance
Bundled descriptions are concise original prose referencing the movement sources documented in exercise-sources.md; do not copy proprietary coaching text, photographs or branded workout programs. Record the precise variant, required equipment and counting convention. Aliases and renames do not count as new movements. Avoid promises of suitability, medical benefit or measured intensity. Updates preserve IDs and saved snapshots; meaningful changed variants require distinct IDs.

Current content is curated plus workout-local Custom entries. A future persistent editable library (#15) must separate user records from curated source records, define archive/reference semantics, retain attribution and validate units/metadata. Shared user-content services and their moderation requirements are outside the offline app's current scope.
