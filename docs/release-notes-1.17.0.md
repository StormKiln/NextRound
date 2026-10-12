# NextRound 1.17.0

## Take your workout history to a spreadsheet

Export the sessions matching your applied history filters as a local CSV file. Review the session count, optionally include workout notes, and choose a destination in the macOS Save dialog. The report contains recorded timing and mode-specific progress for all six workout types. It is a report, not a restorable backup, and prescribed targets are not measured performance. See [CSV columns and handling](history-csv.md).

## Twenty more movements

The bundled library now contains 123 exercises, including walking lunges, wall and diamond push-ups, prone Y/T raises, glute-bridge walkouts, dumbbell curls and raises, and kettlebell presses and carries. Equipment, focus areas, searchable aliases and editable starting targets accompany each addition. Carries support seconds or metres and stay out of reps-only Ladder workouts.

## Fixes and reliability

- Copying a bundled exercise now finds the same movement aliases as the workout picker, and an empty search offers a clear recovery action.
- Closing an exercise editor with unsaved changes asks whether to keep editing or discard. Returning to the library restores keyboard focus to the opening action.
- Release browser checks use bounded parallelism while retaining every regression scenario.
- Apple processing can be checked again by exact version and build without rebuilding or uploading a duplicate package.

Existing saved workouts, personal exercises, results and preferences retain their storage formats. macOS 14 or later on Apple Silicon. GitHub installations use the signed updater; TestFlight and App Store installations remain Apple-managed.

Publication and validation evidence: [issue #225](https://github.com/StormKiln/NextRound/issues/225).
