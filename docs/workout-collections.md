# Saved-workout collections

On Home, choose **Manage collections** to create, rename or delete collections. Names contain 1–80 characters and must be unique ignoring equivalent Unicode forms, whitespace and letter case. Up to 100 collections are supported.

Choose **Collections** on a saved workout, select one or more groups and choose **Save collections**. No selection means Unfiled. Collection filtering combines with workout type, favourites and search. Search finds workout names and saved movement names/descriptions. Clear filters resets all four filters; navigation preserves them during the app session.

Deleting a collection removes only its organisation metadata. Workouts, history and active drafts stay intact. If you delete the selected collection, the library returns to All workouts. Empty collections can be retained and filled later.

New saves and single-workout imports start unfiled. Duplicates inherit their source memberships. Updating or renaming a workout preserves memberships; deleting a workout removes its membership references. If a change hides a workout behind current filters, use the explicit reveal action to clear those filters.

Collections are local. Single-workout JSON exports contain the workout snapshot without organisation metadata. Collection files transfer one named collection and its members; neither format is a full backup.

## Persistence and recovery

Browser preview and native app store collections inside the versioned saved-workout document. Version 1 is read without a write; the first successful mutation writes version 2 atomically. Membership references must identify existing workouts. Invalid/future documents and stale writes fail with recoverable errors rather than replacing data. Refresh the library after another instance changes a collection or workout.

The storage location is unchanged. Older app versions reject version 2 instead of discarding collections; downgrading after using this release is not supported.

## Sharing a collection (1.23.0)

Select a named collection on Home and choose **Export collection**. The file contains every member in collection order, regardless of search, type or favourites filters. Empty collections cannot be exported. The Save dialog suggests a readable filename; cancellation writes nothing.

Choose **Import collection**, open a JSON file and review every workout. Names that already exist receive suggested copy suffixes. Edit the collection and workout names before adding; all destination names must be distinct. The library is checked again when saving. All members and their new collection are written together or nothing is changed. Imported workouts receive independent identities, are unfavourited and belong only to the new collection. Movement snapshots do not create personal exercises. Your current setup is preserved.

Files use `format: "nextround-collection"`, `version: 1`, `name` and an ordered `workouts` array of `{name, config}` snapshots. All six workout modes are supported. The limit is 1 MiB of UTF-8 JSON and 1–100 workouts, subject to the destination's 100-workout and 100-collection limits. Unknown fields, unsupported versions, invalid configurations and repeated identical entries are rejected. Give identical entries distinct names before exporting. Source workout/collection identities, favourites, history, notes and preferences are excluded. Exercise snapshot identities are replaced on import. Single-workout v1 files remain compatible and use their separate import action.

Cancelling file selection retains an edited preview. If a replacement file fails, choose **Use previous collection** explicitly to return to it. Validation and storage errors preserve drafts. For stale collection edits, **Reload collection data** explicitly discards those unsaved edits and loads current data for review.
