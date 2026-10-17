# NextRound 1.23.0

## Share a complete routine

Export a named workout collection as one local JSON file, then preview and import independent copies of all its workouts. All six workout modes, exercise descriptions and targets travel together. Edit destination names before adding. Imports never overwrite existing workouts and commit the whole collection atomically. Home filters do not omit collection members from an export.

## Collection fixes

- Renaming a collection brings its name field into view and restores focus when cancelled.
- Delete confirmation keeps the safe action and confirmation visible even with long collection lists.
- Correct duplicate or invalid names in place. Storage failures retain drafts; stale edits offer an explicit reload before trying again.
- Release packaging retries recognised temporary Apple stapling transport failures with bounded backoff. Signature, ticket and Gatekeeper validation remain required.

## 20 more movements

The library grows from 183 to 203 exercises with seated and supported movements, core control and mobility work. Additions include heel slides, bent-knee fallouts, open books, thread the needle, supported hip movements and gentle stretches. Equipment requirements, focus areas, searchable aliases and editable targets accompany each exercise. Existing exercise records and workout history are preserved.

## Data and distribution

The saved-library schema remains version 2. Collection files use a separate version 1 format capped at 1 MiB. Existing single-workout v1 files remain supported. Transfers omit history, favourites and preferences and are not full backups.

GitHub downloads use signed in-app updates. TestFlight and App Store builds update through Apple. Each distribution keeps its own local data; this release does not submit App Store review.
