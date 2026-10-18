# Training data in 2.0

The six existing workout engines and 1.x files remain unchanged. `training-v1.json` adds session templates, parent session results, optional actual performance keyed by standalone result ID, and one recovery checkpoint. Existing workouts and results are not rewritten or assigned invented performance values. This additive migration runs by opening an empty training document when the file does not exist; malformed or future-version files produce an error instead of replacement.

Session and block IDs are stable. Each block contains an independent validated workout configuration. Training writes use an atomic temporary-file/sync/rename operation and compare the expected prior document under a process mutex. Browser development uses the same validation and serializes mutations. A downgrade can still read the unchanged 1.x stores, but cannot display 2.0 training data; do not use an older app to manage restored 2.0 data.

The full backup format and coordinated restore transaction are documented with the backup implementation. No account or cloud service is introduced.

## Actual performance contract

Entry is optional and manually recorded, never derived from a target. Blank is unknown and zero is explicit. Each exercise entry has its own identity even when names repeat. Countdown and For Time use whole-block totals. EMOM and Intervals allow whole-block totals or the numbered occurrence of that movement (not the global timer round); AMRAP uses circuit rounds and Ladder uses rungs. A movement uses totals or numbered entries, never both. Load requires kg or lb. Supported exercise units constrain the available fields. Existing AMRAP movement progress, Ladder rung progress and checklists remain separate from optional manual actuals.

Comparisons require the same ordered prescription, timing, lead-ins, boundary rest and transition mode. Generated identifiers and display names do not make a different prescription. Incomplete sessions are not ranked. Recorded bests currently cover higher reps, metres and calories for matching occurrences at the same recorded load; ties are explicit. Missing actuals and incompatible loads are not treated as zero. Time is shown as recorded, without assuming that faster is better for a hold or stretch. Historical prescribed targets never change when actuals are corrected.

## Backup and restore

`nextround-backup` version 1 contains saved standalone workouts and collections, saved sessions, both kinds of history, custom exercises (including archived entries), actual performance, notes, equipment, favourites, update preferences and window-close preference. Files are limited to 32 MiB, contain private data and are not encrypted. Portable session/collection sharing excludes history, notes and preferences.

Restore validates all records before replacement and rejects active or unresolved training. A prepared native journal stores the previous and next dataset, then all files are atomically replaced under repository locks. Failure rolls back; a crash before the commit marker rolls back at startup. A committed journal is retained until webview preferences are applied and acknowledged. Startup blocks normal use until pending recovery succeeds. The pre-restore dataset remains available as a rollback backup. Existing 1.x files remain readable; collection version 2 adds sessions while retaining version 1 import.

## Explicit session comparison in 2.2

From History, open a session result and choose Compare session results. Attempt A and B are independently selectable; matching complete prescriptions are offered by default. Enable changed/partial inspection to view other snapshots without deltas. Alignment uses ordered block/exercise prescription and occurrence, resolving each snapshot's own IDs. Duplicate movement names do not merge slots. Equal timestamps remain distinct selectable attempts.

The table shows Attempt A minus Attempt B. Non-load differences require an explicit equal load on both entries: omitted load is not bodyweight or zero. Recorded kg/lb values remain in their original units, with comparisons normalized using 1 lb = 0.45359237 kg and rounded to 0.001 kg. A difference below this precision is treated as equal. No overall winner, effort equivalence or time-based best is inferred. Durations, completion status, saved AMRAP/Ladder progress and applicable checklist ticks remain visible in each snapshot. These recorded outcomes are separate from optional manual actuals and are not ranked.

Comparison is read-only and consumes current successful history reads. During refresh or after a read failure it hides comparison evidence; cached history is labelled and export/edit/repeat actions are unavailable until retry succeeds. A deleted attempt must be replaced explicitly. Opening comparison respects unsaved note confirmation; Escape closes only the comparison and returns focus to its parent result.
