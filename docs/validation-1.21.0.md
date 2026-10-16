# NextRound 1.21.0 validation

Scope: epic #256; portable workouts #257; personal-library usability #258–#260; catalog #261; release evidence #262.

- Baseline: 230 unit tests. New codec and browser persistence tests cover all six workout modes, independent imported identities, name collisions, unknown formats, size/field bounds and create-only persistence.
- Eight initial browser scenarios passed: import preview/reveal, invalid input/cancel, hidden personal save, archive/restore announcements, readable defaults, export/reimport, concurrent name collision/write failure, and a 100-movement preview at 760×620.
- The 143 existing bundled exercise records are preserved against a complete baseline fixture; 20 new entries bring the library to 163. Source notes and counting conventions are in `exercise-sources.md`.
- Independent whole-branch review identified inactive-field validation and replacement-file cancellation defects. Both were reproduced in regression tests and fixed before publication.
- Final source check passed: 242 unit tests, 52 native tests, release-tool tests, types, lint and frontend build. All 23 focused Chromium tests and nine WebKit tests passed, including the review regressions.
- Final complete Chromium suite: 273 passed. Native audio/power lifecycle and signed sandbox media smoke passed.
- Native Open/Save uses user-selected security-scoped URLs, regular-file checks, bounded reads and atomic writes. Automated tests do not substitute for actual panel and installed-channel acceptance.

Final full-suite, native acceptance and publication evidence is tracked in #262. Earlier release acceptance issues remain separate; no App Store review submission is part of this release.

Physical native validation used `com.stormkiln.nextround.validation1210` at 760×620: selected a JSON file using NSOpenPanel, reviewed timing/targets, edited the proposed name, cancelled a replacement selection without losing that name or preview, added the independent saved workout, and exported it with NSSavePanel. The written JSON was inspected for its expected format, name and two movement snapshots. `docs/screenshots/workout-import.jpg` captures this isolated sample preview. The Open button was temporarily disabled while macOS validated the selected URL, then enabled normally.
