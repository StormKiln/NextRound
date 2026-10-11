# NextRound 1.14.0

## Find your training by date

Filter Workout history by Today, Last 7 days, Last 30 days or a custom range, alongside workout type and exercise/description/note search. Presets include today in the Mac’s local time zone. Custom endpoints are inclusive; Apply dates validates the draft before changing the active filter. Invalid or incomplete dates leave the previous range in place. Reset filters clears dates, type and search together.

Filters and unapplied date drafts survive navigation during the app session, including returning from setup. Restarting resets filters. Relative presets update within 30 seconds of local midnight while visible, and immediately on focus/visibility changes. There is no new stored history format or network service.

## History fixes

- Return from comparisons to the original result, with current saved data and keyboard focus. If the result disappeared, return to the filtered list with an explanation; failed reads offer retry.
- Superseded refresh/missing-result notices no longer linger after a new refresh.
- Date controls remain available when no results match or history becomes empty, and wrap at the supported minimum window size.
- Comparisons explicitly include all retained matching attempts, even when the history list is date-filtered. Matching and score rules are unchanged.

The README now includes sample screenshots and distinguishes shipped macOS capabilities from planned iOS/sync work.

## Compatibility and distribution

macOS 14 or later on Apple Silicon. Existing history, workout notes, templates/favourites, personal exercises and preferences are preserved. GitHub downloads are signed/notarized and use the signed updater; Apple-distributed copies remain managed by TestFlight/App Store. The channels retain separate data stores.

Release verification evidence is tracked in GitHub issue #195. A successful upload is distinct from Apple processing and actual tester availability; all are checked before release closure.
