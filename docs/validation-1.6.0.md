# 1.6.0 validation

Local validation on October 3, 2026:

- `make check`: 115 TypeScript tests, 31 Rust tests (two explicit host tests ignored in the ordinary suite), 16 Python release tests; typecheck, lint/clippy and production web build pass.
- Complete browser suite: **73 passed**, covering all four timers, focus/type grouping, ANY-area filters, overlapping shared identity, preset/filters/override across Equipment settings, minimum-size dismissal/focus, hidden-history messaging, and a new-exercise template/history/repeat/usage round trip.
- Original 63 catalog entries match a frozen value/order fixture. Twenty new entries bring the total to 83; all new entries are eligible with explicitly no equipment, have compatible defaults and units, and all catalog tags validate.
- `make test-native-media`: host audio and display-idle assertion lifecycle passed.
- `make test-sandbox-media`: four cues started; display-idle assertion created and released in the sandbox smoke app.
- Isolated `NextRound Validation 160.app` built with its own identifier. This local validation build is not the published notarized artifact.
- The 760×620 picker screenshot was inspected: fixed search and dismissal, scrollable body, readable nonoverlapping preset controls.
- A test-only 100 ms fake-notary startup deadline flaked during native compilation (#117). Test subprocess budgets now allow interpreter startup while remaining bounded; production limits/no-resubmit behavior are unchanged. Release tests pass alongside compilation.
- The main web chunk exceeds Vite's 500 kB advisory; tracked separately as performance backlog #118. The production build succeeds.

Physical packaged-app interaction, the exact TestFlight-installed build and an isolated signed 1.5.0→1.6.0 live update have not yet been observed: computer-use reports the Mac locked. An unlock request is pending. These checks remain explicit in #116, not inferred from browser tests, native smoke tests or Apple processing acceptance. Earlier version-specific checks remain separate.

Independent review and publication evidence (protected merge, immutable tag, public artifact hashes/signatures/staples/updater, exact Apple build and Internal-group availability) will be recorded in #116.
