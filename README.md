# NextRound

![NextRound — white and orange interval-timer emblem against a charcoal gym backdrop](assets/brand/nextround-splash.png)

Plan your workout. Run the clock. Track your progress.

NextRound is an offline workout timer and planner for **Apple Silicon Macs running macOS 14 or later**. No account is required. Workouts, personal exercises, preferences and saved results stay on your Mac.

**Current release: 1.15.0.** [Download for macOS](https://github.com/StormKiln/NextRound/releases/latest) · [Release notes](docs/release-notes-1.15.0.md) · [Privacy policy](PRIVACY.md)

## What you can do

- **Choose from six workout modes:** EMOM, Countdown, work/rest Intervals, AMRAP, For Time and Ladder. Configure lead-in and warning cues, pause/resume, and follow large workout clocks. The Mac stays awake during an active workout.
- **Build your exercise order:** browse 103 bundled exercises, create personal movements, filter by equipment or focus area, drag to reorder, replace a movement, and set supported repetition, time, distance or calorie targets. Targets guide planned work; they are not measured performance.
- **Generate a workout:** choose My Favorites, Try something new or Mix It Up and the exercise count. Suggestions use retained local history and equipment preferences; review and adjust targets before starting.
- **Reuse your favourites:** save named workouts for all six modes, update, duplicate directly from Home, mark favourites, and filter by name and workout type.
- **Review your training:** explicitly save completed results, review the performed workout, compare matching attempts, add searchable notes, or repeat a result from setup. Later exercise/template edits never rewrite historical snapshots.

### Duplicate saved workouts

Duplicate saved workouts directly from Home to make independent, unfavourited variants without replacing your current setup. Saved-workout filters stay with you as you navigate during the app session.

### Find history by date

Combine **All dates**, **Today**, **Last 7 days**, **Last 30 days**, or **Custom range** with workout type and exercise/description/note search. Presets count local calendar days including today. Custom dates include both endpoints; choose **Apply dates** to apply valid dates. Incomplete or invalid drafts leave the previous range applied and clearly displayed.

History filters survive navigation within the app session; restarting resets them. **Reset filters** clears everything. Relative presets refresh after local midnight and when returning to the app. Comparisons include all retained matching attempts regardless of list filters. Closing comparisons returns to the originating result, or safely to history if it was removed.

## Screenshots

The 1.13.0 interface, captured in the browser preview with sample data. The macOS app uses the same shared interface.

**Choose your workout.** Start with EMOM, Countdown, Intervals, AMRAP, For Time or Ladder.

![NextRound Home with six workout modes](docs/screenshots/home.png)

**Build your session.** Set the timing, arrange movements and adjust exercise targets.

![EMOM setup with timing controls and an ordered exercise list](docs/screenshots/emom-setup.png)

**Find your movements.** Browse exercise groups, use focus-area and equipment filters, or get suggestions from saved history.

![Exercise picker with grouped movements, suggestions and equipment controls](docs/screenshots/exercise-picker.png)

**Remember your progress.** Review completed sessions, add notes, compare attempts and repeat a workout from setup.

![Saved EMOM result with a workout note and exercise targets](docs/screenshots/workout-notes.png)

**Find the session you want.** Combine date ranges with workout type and text search. The date-filter view below is from the 1.14.0 browser preview with sample data.

![Workout history with an inclusive custom date range and saved EMOM and Countdown results](docs/screenshots/history-dates.png)

## Data and distribution

The macOS app stores versioned JSON documents with atomic native writes for workout history, saved templates and personal exercises. Core functionality works offline; there is no account, backend, cloud sync or AI service. Notes stay separate from scores, comparison matching and exercise usage. Only completed sessions explicitly saved by the user appear in history; interrupted-session crash recovery is not available.

GitHub downloads are Developer ID signed and notarized, with signed in-app updates. TestFlight/App Store builds update through Apple. The two distribution channels have separate local data; switching channels does not transfer your library or history. Updates do not install during an active workout or an unsaved result/note flow.

**Planned:** iOS support and validation, cross-device synchronization decisions, and recommendations matched to available time and desired intensity. These are not shipped features. The existing history-based exercise suggestions are heuristics, not personalized coaching.

## Development

NextRound uses a pnpm monorepo with a Tauri 2 macOS shell, React/TypeScript, Vite, Tailwind CSS, shadcn/ui components, Zustand, TanStack Router and TanStack Query. Shared workout types and validation live in `packages/core`; native timing, audio, storage and distribution adapters live in `apps/nextround/src-tauri`.

```text
apps/nextround/src/        React interface and feature integration
apps/nextround/src-tauri/  Native shell, timing, storage and packaging
packages/core/            Shared workout models and validation
docs/                     Product, release and validation documentation
```

Prerequisites: macOS 14 or later, Node 24.3.0 (`.node-version`), Xcode command-line tools and Rust via rustup. `rust-toolchain.toml` pins Rust 1.98.1. The Makefile bootstraps pnpm 12.8.1 through npm.

```sh
make install       # Install locked dependencies
make dev           # Run the macOS Tauri app
make dev-web       # Browser preview
make check         # Types, tests, native checks, lint and frontend build
make test-e2e      # Browser interaction tests
make build-app     # Local ad-hoc-signed app for testing
make build-macos   # Local app and DMG
```

Before browser tests, install Chromium with `npm exec --offline --yes --package=pnpm@12.8.1 -- pnpm exec playwright install chromium`. Native production timing/audio require the macOS app; browser preview is for interface development.

Local test builds are not public signed/notarized releases. See [contributing](CONTRIBUTING.md), [GitHub release instructions](docs/release.md) and [TestFlight packaging](docs/testflight-macos.md). PRs use required checks and the merge queue without required reviewer approvals.

## Further reading

- [1.15.0 release notes](docs/release-notes-1.15.0.md)
- [1.13.0: workout notes](docs/release-notes-1.13.0.md)
- [1.12.0: saved-workout favourites](docs/release-notes-1.12.0.md)
- [Exercise sources](docs/exercise-sources.md) and [taxonomy](docs/exercise-taxonomy.md)
- [Brand artwork](assets/brand/README.md) and [icons](assets/icons/README.md)

Earlier version notes and validation records remain in [docs](docs/).
