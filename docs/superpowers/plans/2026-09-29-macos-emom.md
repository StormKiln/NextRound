# macOS EMOM 0.1.0 implementation plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task by task. The user explicitly authorized full execution of the existing epic; do not reopen approval gates for the agreed scope.

**Goal:** Deliver the macOS application foundation and complete EMOM flow, with verified builds and an honestly documented distribution channel.

**Architecture:** A pnpm workspace contains `apps/nextround` (React/Vite/Tauri) and `packages/core` (pure typed workout validation and timeline). Zustand coordinates the current draft/session, TanStack Router handles setup/workout/completion navigation, and Query supplies the bundled exercise provider. A native Rust timer service drives elapsed time and sound events even when the webview is backgrounded; the core model is independently testable.

**Tech stack:** Latest stable compatible React, TypeScript, Vite, shadcn/ui, Tailwind, Zustand, TanStack Router/Query, and Tauri 2; commit exact manifests and lockfiles.

**Spec:** [Epic #1](https://github.com/StormKiln/NextRound/issues/1), issues #2–#12, and README.md. The user approved execution of this scope on September 29, 2026.

## Global constraints

- macOS only for 0.1.0. Preserve the shared domain boundary for future iOS work.
- One minute per round; lead-in and paused time excluded from active workout time.
- Ordered exercises repeat, including uneven rotations; Custom requires a name and optional description.
- Warnings 0–59 seconds, tocks on positive remaining warning seconds, beep at start/new round, distinct completion replacing the final beep.
- No backend, accounts, durable workout library/history, or recommendations in this release.
- Use Makefile commands; merge through the existing queue with its stable `Repository checks` gate and no reviewers required.
- Keep issue acceptance criteria honest: automated checks, real-time tests, device/UI inspection, and signing evidence are separate.

## Review focus

1. Delayed callbacks, backgrounding, and sleep cannot produce stale sound bursts or advance a paused workout.
2. Pause/start/stop races cannot create two sessions or sounds after cancellation.
3. Invalid numeric inputs, blank Custom names, and long descriptions must be safe and usable.
4. Completion and the last round boundary cannot produce both beep and completion or a phantom extra round.
5. Native full-screen/window-close navigation and audio failures cannot silently discard a session or trap the user.

## Task 1: workspace and native foundation (#2–#5)

Files: root package.json/pnpm-workspace.yaml/tsconfig, apps/nextround package/Vite/Tauri configuration, packages/core package, Makefile, CI, application routing/styles/UI primitives.

- [ ] Pin pnpm and current stable dependencies; install and lock them.
- [ ] Add the smallest working React/Tauri shell with approved splash/icon; build and run it.
- [ ] Configure Router, Query, Zustand, Tailwind/shadcn components and a native adapter boundary.
- [ ] Establish Makefile lint/typecheck/test/build commands, native format/lint/tests, and queue-compatible CI.
- [ ] Record framework decisions and update issue progress with actual evidence.

## Task 2: domain and timing (#3, #8, #10)

Files: packages/core/src/{model,timeline}.ts and tests; apps/nextround/src-tauri/src/{lib,timer,audio}.rs and unit tests.

Interfaces: `EmomConfig { minutes, leadInSeconds, warningSeconds, exercises }`; `ExerciseEntry { id, name, description? }`; `SessionSnapshot { phase, remainingMs, roundRemainingMs, roundIndex, elapsedMs, paused, notice? }`. Native commands start/pause/resume/stop/read take typed configuration and return a snapshot. Native events provide snapshots; UI never counts timer callbacks as elapsed time.

- [ ] Write and run failing validation/rotation tests for positive whole minutes, lead-in, warnings, empty/blank exercises, uneven rotation, and immutable snapshots.
- [ ] Implement validation and a pure `snapshotAt(config, elapsedMs)` function; run tests green.
- [ ] Write failing native timeline/cue tests for 3/2/1/start, short/zero lead-in, warning zero/59, all 15 rounds, final completion, pauses, and delayed updates.
- [ ] Implement a monotonic native session loop and original synthesized/offline sound cues; derive both clocks from one active timeline.
- [ ] Pause on suspend-sized gaps and prevent idle sleep only while running; release all resources on pause/stop/complete/exit.
- [ ] Verify real packaged-app audio separately from pure scheduling tests.

## Task 3: setup and exercise picker (#6–#7)

Files: apps/nextround/src/features/setup/*, data/exercises.ts, state/session.ts, feature tests.

- [ ] Write failing interaction tests for Custom name/description, selection, remove/reorder, numeric validation, and rotation preview.
- [ ] Build a focused two-column desktop setup: left workout configuration, right ordered exercise list; single clear Start workout action.
- [ ] Use a bundled provider via Query; preserve the transient draft after stop/return; freeze configuration at start.
- [ ] Test keyboard controls, descriptive errors, long entries, and narrow windows.

## Task 4: runner and completion (#9–#10)

Files: features/workout/*, native adapter, audio fallback/browser preview adapter, tests/e2e.

- [ ] Test lead-in versus workout clocks, simultaneous round/total display, pause/resume, explicit stop confirmation, final screen, repeat, and navigation blocking.
- [ ] Enter native full screen after Start; Escape exits full screen without stopping the workout.
- [ ] Make the round countdown the dominant element; show current/next exercise, round number, total time, and clear pause/stop controls.
- [ ] Keep live countdowns quiet for assistive technology; announce phase changes and support reduced motion.
- [ ] Inspect screenshots and run browser interaction tests plus native app smoke tests.

## Task 5: verification and release (#11–#12)

Files: CI/release workflows, release scripts, docs/validation/0.1.0.md, README/CONTRIBUTING, release notes.

- [ ] Run lint, typecheck, core/UI/native tests and macOS production build from Makefiles; record outputs.
- [ ] Run a real-time 15-minute session and verify five turns for each of three exercises and all cue counts.
- [ ] Review the whole branch with a fresh reviewer per executing-plans; fix meaningful findings with regression tests.
- [ ] Create/merge PRs via required queue, updating issues and checking only fulfilled acceptance criteria.
- [ ] Build installable artifacts, check installation/launch and supported architecture; sign/notarize only if credentials and the chosen channel permit it.
- [ ] Publish the authorized release channel with limitations and artifact checksums, or report the exact external blocker without falsely closing the release epic.

## Visual direction

Use the approved brand: charcoal #141414, panel #202020, orange #ff5b0a, warm white #faf5ef, muted gray #aaa49e, and red #e86e67. Use a locally bundled geometric sans for the UI and a tabular monospace for timer digits. The setup is an exercise workbench, not a marketing page; the runner prioritizes large timing digits, current movement, and an orange progress arc. Reuse the actual splash artwork during startup.

## Execution ledger

- Baseline: clean main at 22cc245; make check-repo passes. Current host is Apple Silicon macOS 26.6.2 with Xcode 26.6, Node 24.3.0 and Rust 1.98.1.
- Ruling: execute in a feature branch at the user-requested local checkout, rather than move the code; main remains protected and all integration uses PRs.
- Distribution decision requested asynchronously; continue implementation independently of signing.
