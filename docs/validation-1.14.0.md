# NextRound 1.14.0 validation

Scope and acceptance: epic #189, children #190–#195. Implementation uses the existing local storage schemas unchanged.

Baseline: 180 TypeScript tests passed. Initial feature/fix browser regressions failed for all four expected missing behaviors. Date helper red test failed because the new module was absent; green boundary tests cover DST, leap days, invalid/reversed ranges and changed local time zones.

Final automated, physical Mac and published-channel evidence will be recorded in #195 before release closure. Do not interpret pending physical or distribution checks as completed based solely on unit/browser tests.

Physical source validation on macOS 26.6.2: isolated app identity com.stormkiln.nextround.validation1140 with synthetic history. Today matched one of three sessions; custom same-day range matched one; invalid empty dates focused From; Home round-trip preserved custom range; comparisons included all three attempts outside list dates. Native focus defect #199 reproduced before fix and passed after explicit modal initial focus (Escape then Space reopens comparisons). Existing synthetic file hashes unchanged. Native media/power lifecycle and sandbox four-cue smoke passed.

Review identified #196 midnight-skipping DST and #197 stale-query overwrite; red/green regressions and independent re-review passed. Automated browser clock setup was corrected to install the fake clock before component timers. Publication remains pending in #195.
