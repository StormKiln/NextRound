# NextRound 1.12.0 validation

Scope: epic #172, favourites/filtering #173, stale-record recovery #174, rename conflict guard #175, focus restoration #176, release #177.

## Regression evidence

Baseline: 168 TypeScript tests passed. New tests failed on missing favourite commands and stale rename acceptance before repository implementation. Browser tests reproduced missing Favourite/Refresh controls and lost focus after deleting first, middle and last rows. The focused run then passed recovery, rename conflict review, failed refresh, deletion/filtered rename focus and failed-write cases; an initial workout-type label mismatch was corrected using an explicit label association.

Favourite metadata is optional in the existing document format and omitted when false. Native and browser parsers reject unsupported fields. Content updates compare identity/name/configuration and retain current favourite status; rename compares only the expected original name and preserves unrelated changes. Native writes retain the existing serialized atomic-write path. Older native builds reject documents with favourite metadata instead of overwriting it.

## Verification tracking

Final automated counts, independent review, physical Mac checks, hosted CI and signed publication evidence are recorded in #177. Source validation apps use a separate bundle identifier and isolated synthetic data; those checks do not substitute for installed-distribution or live-upgrade observations tracked by #164.

## Local verification

- `make check`: 172 TypeScript, 44 Rust and 16 release-tooling tests passed; two host-only Rust checks are excluded from the ordinary suite. Type checking, lint, formatting and production build passed.
- Full browser suite: 167 tests passed, including combined filtering across six modes, write/read failures, stale records and keyboard focus. A final status-message correction is covered by the same suite and tracked in #177.
- Independent whole-change review found no actionable defects.
- Physical macOS 26.6.2, isolated ad-hoc source build: favourites-only filtering, stale rename rejection, refresh retaining proposed text, reviewed rename preserving favourite status, and Escape returning focus to the originating Rename button (Space reopened it) verified.
- Native audio/power lifecycle smoke passed. Minimum-size 760×620 library screenshot inspected; controls remain separated and fit with long names.
- Final native source build: the renamed favourite survived quit/relaunch. App Sandbox smoke passed all four cues and display-idle assertion creation/release. The recovery status-message correction was reproduced in a browser regression before the fix.
- Final `make check` and all 167 browser tests passed after the status-message correction.
