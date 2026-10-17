# Saved-workout collections

On Home, choose **Manage collections** to create, rename or delete collections. Names contain 1–80 characters and must be unique ignoring equivalent Unicode forms, whitespace and letter case. Up to 100 collections are supported.

Choose **Collections** on a saved workout, select one or more groups and choose **Save collections**. No selection means Unfiled. Collection filtering combines with workout type, favourites and search. Search finds workout names and saved movement names/descriptions. Clear filters resets all four filters; navigation preserves them during the app session.

Deleting a collection removes only its organisation metadata. Workouts, history and active drafts stay intact. If you delete the selected collection, the library returns to All workouts. Empty collections can be retained and filled later.

New saves and imported workouts start unfiled. Duplicates inherit their source memberships. Updating or renaming a workout preserves memberships; deleting a workout removes its membership references. If a change hides a workout behind current filters, use the explicit reveal action to clear those filters.

Collections are local. Portable JSON exports contain the saved workout snapshot, not its collections or favourites. They are not a full backup.

## Persistence and recovery

Browser preview and native app store collections inside the versioned saved-workout document. Version 1 is read without a write; the first successful mutation writes version 2 atomically. Membership references must identify existing workouts. Invalid/future documents and stale writes fail with recoverable errors rather than replacing data. Refresh the library after another instance changes a collection or workout.

The storage location is unchanged. Older app versions reject version 2 instead of discarding collections; downgrading after using this release is not supported.
