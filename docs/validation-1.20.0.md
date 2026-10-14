# NextRound 1.20.0 validation

Scope: epic #248; preview #249; library usability #250–#252; release evidence #253.

- Existing 225 unit tests passed. New regressions reproduced delayed favourite focus stealing, hidden-rename recovery absence, filter-reset focus loss and the missing Preview action before changes. Expanded unit suite: 230 passed, including dismissed pending reads and semantic record equality.
- New Chromium scenarios: 15 passed, covering read-only preview/cancel, explicit load confirmation, stale change/deletion/corruption/retry, all six modes, optional empty lists and long-content actions at 760×620. Existing 1.12/1.15 library scenarios passed in the combined run. Initial new-test failures used a wrong Countdown field label and an invalid Ladder fixture; these were corrected to existing product semantics.
- Isolated physical Mac app uses `com.stormkiln.nextround.validation1200`. At 760×620, preview shows saved targets/descriptions and timing with fixed actions. Changing its isolated saved file during confirmation displayed refreshed timing and required review again without loading the changed configuration.
- `docs/screenshots/workout-preview.png` is a native minimum-window screenshot using isolated sample data.
- Full repository/browser/WebKit checks, fresh review, signed publication and installed-channel acceptance are recorded in #253 and the release PR when complete. Source tests do not substitute for installed-release verification.

No catalog or schema changes. Prior exact-version acceptance issues remain separate.
