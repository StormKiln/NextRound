# NextRound 1.22.0

## Organise saved workouts

Create named collections for routines such as Quick sessions or Kettlebell days. A workout can belong to several collections. Filter by collection alongside workout type, favourites and search, or choose Unfiled to find workouts without a collection.

Rename or delete collections from Manage collections. Deleting a collection keeps every workout. Duplicates inherit their source collections; new saves and imports start unfiled. Organisation stays on your Mac and is excluded from portable workout files.

## Library fixes

- Find saved workouts by exercise names and descriptions as well as workout names. Search uses the saved snapshot, even if a personal movement changes later.
- Export files now suggest the workout name instead of a generic filename. You can still edit the filename in the macOS Save dialog.
- If a replacement import fails, the previous preview is identified and requires an explicit Use previous workout choice. Cancelling a file picker preserves the preview and edited name.

## More movements

The bundled catalog grows from 163 to 183 exercises: ten equipment-free movements, six dumbbell movements and four kettlebell movements. Additions include snow angels, split-squat jumps, spider walks, mobility stretches, wrist work, V raises and kettlebell combinations. Equipment, focus areas and editable targets accompany each addition; unilateral descriptions distinguish per-side from total repetitions.

Existing exercise records and performed-workout snapshots are unchanged.

## Local data and distribution

Existing saved-workout documents upgrade to version 2 on the first successful write, preserving workout identities, favourite state and settings. Collection membership shares the same atomic write. Earlier app versions cannot read the new document schema; keep the current version after using collections. Portable single-workout JSON remains version 1 and omits collection membership.

GitHub downloads use signed in-app updates. TestFlight and App Store builds update through Apple. Each distribution channel keeps its own local data; this release does not migrate data between channels or submit a new App Store review.
