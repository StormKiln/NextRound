# 1.9.2 validation

Scope: #153 home action spacing, #154 whole-workout generation with an explicit exercise count, #155 truthful equipment filtering. Release delivery is tracked in #156.

## Investigation

The home action row had top margin but no separation from the following workout cards. New geometric regressions failed at 760 and 1280px before the fix. The picker initialized its temporary override unchecked even though an unset equipment preference bypassed filtering. A fresh-user regression failed before the checkbox/filter changes.

Generation reuses the existing usage ranking with a variable count. The prior fixed-three ranking failed the new count test; the browser flow failed before the generator existed. All six modes use the shared editor, preserve timing, provide mode-compatible targets and support Undo. Invalid counts and insufficient candidates leave the draft unchanged; unreadable preferences/library/history block generation with retry instead of invented data.

Independent review identified that reparsing identical saved equipment could reset a temporary override; regression coverage includes visiting Settings without changing the saved selection. Final verification results and publication evidence are recorded in #156.

## Final local verification

- `make check` passed: 153 TypeScript tests, 43 Rust tests (two host-dependent tests intentionally ignored), 16 release-tooling tests, type checks, lint and production build. Final formatting also passed.
- `make test-e2e`: 136 passed. The full suite exposed a broad validation focus fallback that selected the new generator button; it now focuses the actual invalid control, preserving the existing keyboard regression.
- Browser screenshots inspected at 760×620 and 1280×620: home spacing, dropdown, count dialog and generated list.
- Final isolated native Mac app verified: preset dropdown, five-exercise generation with targets, unchanged timing, Undo to the original three movements, checked all-equipment default and unchecked equipment-free filtering.
- Independent code review found one equipment reset issue; the content comparison and its red/green regression resolved it. No remaining blocking findings.

Signed-distribution and Apple-processing evidence will be recorded in #156 after the protected merge and tag workflows complete.
