# NextRound

![NextRound — white and orange interval-timer emblem against a charcoal gym backdrop](assets/brand/nextround-splash.png)

Plan your workout. Run the clock. Track your progress.

NextRound is a workout companion for CrossFit and functional fitness. It brings together workout timers, a history of completed workouts, a library of exercises, and recommendations matched to the time, equipment, and intensity available for a session.

The initial platforms are **macOS desktop** and **iOS**.

> Status: 0.1.0 macOS implementation. The desktop EMOM flow is implemented: exercise selection and ordering, Custom entries, lead-in/warning configuration, native timing and sounds, full-screen running, pause/resume, stop, and completion. Signed public distribution is pending Developer ID/notarization setup. Other workout types, durable libraries/history, recommendations, and iOS remain planned features.

## Product scope

### Workout tools and timers

- Provide timers for running workouts.
- Proposed initial modes: stopwatch / for-time, countdown, AMRAP (as many rounds or repetitions as possible), EMOM (every minute on the minute), and configurable work/rest intervals.
- Support starting, pausing, resuming, and completing a session, with clear indications of the current interval and remaining time.
- Connect the active workout and its timer to a saved workout result.

### Workout history

- Record completed workouts and review previous sessions.
- Proposed result fields include date, workout performed, duration, rounds, repetitions, loads, scaling, and notes where relevant.
- Compare repeat attempts at the same workout.
- Preserve the workout as performed so later edits to a template or exercise do not rewrite historical results.

### Exercise library

Store reusable exercises with:

| Attribute | Purpose |
| --- | --- |
| Name | Identify the movement. |
| Description | Explain the exercise and how to perform it. |
| Required equipment | Identify what is needed to perform the exercise. |
| Type | Categorize movements, such as strength, conditioning, gymnastics, or mobility. |
| Intensity | Describe the intended effort; the scale still needs to be defined. |

Proposed additions include scaling options and substitutions. Exercise intensity is contextual: load, pace, repetitions, rest, and the athlete affect the effort of a complete workout.

### Workout library and recommendations

- Store workout definitions composed of exercises, prescriptions, and timing or scoring rules.
- Recommend workouts using conditions such as available time and desired intensity.
- Include available equipment as a proposed initial recommendation constraint, using exercise equipment requirements.
- Show why each recommendation fits and distinguish estimated duration from a fixed time cap.
- If no workout meets the constraints, explain the mismatch instead of silently relaxing them.

Example: “I have 20 minutes, a kettlebell, and want moderate intensity.” NextRound should suggest suitable workouts, explain the match, provide the appropriate timer, and save the completed result.

The recommended first implementation is transparent filtering and ranking of stored workouts. Generative AI is not a prerequisite; personalized or generated programming can be evaluated later.

## Initial platform experience

- **macOS:** a desktop application for managing exercises and workouts, reviewing history, and running training sessions.
- **iOS:** a touch-friendly application for choosing workouts, using timers, and recording results during training.
- Share the product model and most UI code, while adapting navigation, layout, keyboard interactions, and touch targets to each platform.

## Proposed technical direction

Use a **monorepo with one Tauri 2 application targeting macOS and iOS**, backed by a shared React interface. Separate desktop and mobile React applications are unnecessary initially; isolate platform-specific behavior behind small adapters.

| Technology | Intended role |
| --- | --- |
| Tauri 2 | Application shell, native capabilities, and macOS / iOS packaging. |
| React + TypeScript | Shared application UI and typed feature code. |
| Vite | Frontend development server and production asset builds. |
| shadcn/ui | Accessible UI building blocks owned and customized in the repository. |
| Tailwind CSS | Styling, responsive layouts, and design tokens. |
| Zustand | Ephemeral client state, such as workout selection, editing state, and active-session UI. |
| TanStack Router | Typed application navigation. |
| TanStack Query | Asynchronous reads, mutations, caching, and invalidation through the persistence layer. |

Use the **latest stable compatible releases at scaffolding time**, then pin the resolved toolchain and commit lockfiles for reproducible builds. Do not use prerelease or canary versions by default. As of September 29, 2026, React's official documentation lists React 19.3; shadcn/ui documents support for React 19 and Tailwind CSS 4. Recheck exact releases and peer compatibility when installing dependencies.

TanStack refers here to Router and Query. Add other TanStack libraries only when a feature needs them. Keep persisted workout data in the persistence layer; avoid maintaining competing copies in Zustand and Query.

### Proposed repository layout

The workspace layout is:

```text
NextRound/
├── apps/
│   └── nextround/
│       ├── src/              # Shared React UI, routes, and feature integration
│       └── src-tauri/        # Tauri shell, native adapters, and platform configuration
├── packages/
│   └── core/                 # Exercise/workout types, validation, recommendation rules
├── docs/                     # Product decisions and implementation notes
├── Makefile                  # Consistent development, checks, and packaging commands
└── README.md
```

Application components remain in the app; shared validation and timeline types live in `packages/core`. pnpm 12.8.1 manages the workspace with committed JavaScript and Rust lockfiles. The root Makefile provides development, validation, and packaging commands.

### Persistence and synchronization

**Recommendation, pending a product decision:** make core workouts, exercise browsing, timers, and history usable offline, with durable local storage such as SQLite. Cross-device synchronization between macOS and iOS is a separate requirement to decide before finalizing the data model and persistence architecture.

No backend, account system, cloud provider, or synchronization service has been selected. Local persistence alone does not synchronize devices.

### Timer and native integration validation

Validate the timer experience on a physical iPhone early, including screen locking, backgrounding, interruptions, and returning to an active workout. Treat JavaScript callbacks as UI refresh triggers rather than the source of elapsed time; persist enough session state to reconstruct the timeline on resume.

Continuous background execution and audible interval alerts must be validated separately from restoring an accurate timer display. Evaluate native integrations for notifications, audio, haptics, and keeping the display awake where needed. If these requirements cannot be met satisfactorily with Tauri integrations, reconsider the iOS shell while retaining shared domain logic.

## Proposed delivery sequence

1. **Foundation:** scaffold the workspace and Tauri app; establish Makefile workflows; launch on macOS and an iOS device; validate critical timer lifecycle behavior.
2. **Library:** create and edit exercises and workout definitions, including equipment, type, and intensity attributes.
3. **Training:** select a workout, run its timer, record a result, and browse history.
4. **Recommendations:** filter and rank workouts by time, intensity, and equipment, with explanations.
5. **Distribution:** establish signing, packaging, and release workflows for both platforms. Decide on TestFlight and macOS distribution channels before release.

## Initial acceptance criteria

- The application launches on macOS and iOS.
- An exercise can be saved with its description, equipment, type, and intensity and retrieved after restarting the app.
- A workout can reference stored exercises and define timing and scoring requirements.
- A user can run a workout timer, save a result, and find it in history after restarting.
- Editing a workout template does not alter a previously recorded result.
- Recommendations respect the selected time, equipment, and intensity constraints, and explain matches or lack of matches.
- Timer behavior through pause/resume, screen lock, and background/foreground transitions is tested on a physical iPhone, with supported alert behavior explicitly documented.

## Decisions still to make

- Whether cross-device synchronization and accounts are required for the first release.
- Intensity vocabulary, equipment taxonomy, and rules for estimating workout duration.
- Whether the initial exercise and workout library is curated, user-created, or both.
- Expected timer alerts while the phone is locked or the app is backgrounded.
- Supported macOS and iOS versions, package manager, application identifiers, and distribution channels.

## Development status

See [CONTRIBUTING.md](CONTRIBUTING.md) for the PR workflow, required checks, and merge queue. PRs into `main` do not require reviewer approval.

### Local development

Prerequisites: macOS 14 or later, Node 24.3.0 (see `.node-version`), Xcode command-line tools, and Rust via rustup. `rust-toolchain.toml` pins Rust 1.98.1. The Makefile bootstraps pnpm 12.8.1 through npm without changing global tooling.

```sh
make install       # Install the locked workspace dependencies
make dev           # Run the macOS Tauri application
make dev-web       # Browser preview; production timing runs natively
make check         # Types, unit tests, Rust tests/lints, frontend lint/build
make test-e2e      # Browser interaction tests (install Chromium first)
make build-app     # Produce a local ad-hoc-signed .app for testing
make build-macos   # Produce the app and DMG for local testing
```

Before `make test-e2e`, install its browser with `npm exec --offline --yes --package=pnpm@12.8.1 -- pnpm exec playwright install chromium` after `make install`.

The app bundle is generated in `apps/nextround/src-tauri/target/release/bundle/macos/`. Initial distribution targets Apple Silicon. Local test builds are not Developer ID signed or notarized and are not public releases. See [release instructions](docs/release.md) for the signed distribution process.

Run `make icons` to regenerate the [macOS and iOS icons](assets/icons/README.md), or `make sounds` to regenerate the original offline audio cues.

### EMOM behavior

Choose 1–1440 whole minutes, 0–3600 lead-in seconds, and 0–59 warning seconds. At least one exercise is required. Exercises repeat in order; 15 minutes with three exercises gives five turns each. Lead-in and pauses do not consume workout time. The timer tocks on each positive warning second, beeps at workout start and each new minute, and plays a distinct completion sound after the last round.

The native process owns timing and plays bundled sounds independently of webview refreshes. Pause/stop cancels current sound playback. The app requests that macOS stay awake while running; if the timer process is suspended or detects a long system interruption, it pauses without replaying missed cues and asks you to resume. Normal backgrounding does not pause the workout. Escape exits full screen without ending the workout.

Workout setup and completion are transient in 0.1.0: they are not saved across app restarts. No account or network connection is required to run a workout.

## Technical references

- [Tauri overview and supported platform approach](https://v2.tauri.app/start/)
- [Tauri prerequisites, including Apple development requirements](https://v2.tauri.app/start/prerequisites/)
- [Tauri iOS signing](https://v2.tauri.app/distribute/sign/ios/)
- [React versions](https://react.dev/versions)
- [shadcn/ui with Tailwind CSS 4 and React 19](https://ui.shadcn.com/docs/tailwind-v4)
- [TanStack libraries for React](https://tanstack.com/libraries/react)
- [TanStack Query overview](https://tanstack.com/query/latest/docs/framework/react/overview)

### 0.2.0 desktop experience

Start on Home, choose **Build an EMOM**, and return home without losing the setup in your current session. Open **Settings** from the toolbar or Command-comma for app information and software updates. The branded startup screen stays visible for at least three seconds.

GitHub installs support signed updates from Settings starting with 0.2.0; 0.1.0 users need one manual upgrade. Updates never install during a running or paused workout. TestFlight/App Store builds update through Apple. See [0.2.0 release notes](docs/release-notes-0.2.0.md).

### 0.3.0

Choose EMOM or a fixed-duration Countdown from Home. The bundled picker now contains 43 exercises, including 20 kettlebell movements, five extra variations each of push-ups/planks/bodyweight squats, and rowing-machine rowing. Set per-exercise repetition, time, distance or machine-calorie targets; see [exercise sources](docs/exercise-sources.md). EMOM rounds remain 60 seconds.

Red-close minimizes by default and keeps workouts running. General Settings can switch it to Quit, retaining active-workout confirmation. Click the Dock icon to restore the window. See [0.3.0 release notes](docs/release-notes-0.3.0.md).

### 0.4.0: build once, use again

Home now has matching, clearly labeled workout cards. Exercise selection groups movements into collapsible categories; drag handles support pointer and keyboard reordering. Countdown can include an optional exercise checklist. Save named EMOM/Countdown templates locally and load, search, rename or delete them from Home. Templates persist across restarts; workout history and active-session recovery are still future work. See [0.4.0 release notes](docs/release-notes-0.4.0.md) for update behavior and data boundaries.
