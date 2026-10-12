# Workout history CSV

In Workout History, apply your date, workout-type and search filters, then choose **Export CSV**. The dialog captures those matching saved sessions, in the displayed order, at the moment it opens. Later history changes do not alter that export. Invalid/unapplied date drafts are not export filters. Reopen the dialog for a fresh snapshot.

Notes are excluded by default. Select **Include workout notes** to include them. Choose **Save CSV** and a destination in the macOS Save dialog. Cancel leaves the dialog open without a success message. A write error preserves the export for another attempt. CSV export is a report, not a backup that can be imported into NextRound.

The file uses UTF-8 with a byte-order mark, comma separators, CRLF records and standard doubled quotes. Open it in Numbers or Excel. Text that could be interpreted as a formula receives a leading apostrophe (including when whitespace or control/format characters precede the formula). Embedded NUL characters are replaced with the Unicode replacement character. These protective changes affect only the report; stored data is unchanged.

| Column | Meaning |
| --- | --- |
| session_id | Stable saved result ID |
| completed_at_utc | ISO 8601 completion time in UTC (Z); History date filtering uses local calendar dates |
| workout_type | emom, countdown, intervals, amrap, forTime or ladder |
| outcome | completed for saved fixed-duration sessions; finished or timeCapReached for For Time/Ladder |
| elapsed_ms | Exact recorded workout milliseconds, excluding lead-in and pauses; includes programmed rest |
| workout_time | Human-readable elapsed duration, rounded up to a whole second, with days rather than a 24-hour wrap |
| checked_movements | Checked items for enabled Countdown/For Time checklists; blank when unavailable |
| amrap_completed_movements | Recorded AMRAP movement completions, not total reps |
| amrap_partial_value | Recorded partial target value for the next AMRAP movement |
| amrap_partial_unit | Unit associated with that partial value |
| amrap_partial_movement_number | One-based position in the AMRAP exercise order |
| ladder_completed_movements | Recorded completed Ladder movements |
| workout_note | Optional; this column exists only when notes are included |

Mode-specific cells are blank when not applicable. Exercise targets, calories burned, effort estimates, exercise descriptions and performed-rep estimates are not exported. Progress is user-recorded; timer completion is not a sensor measurement.

The native app writes only to the destination selected in the Save dialog; no folder-wide access or cloud transmission is required. Browser preview downloads the same report through the browser.
