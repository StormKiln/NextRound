# NextRound

Plan your workout. Run the clock. Track your progress.

NextRound is a workout companion for CrossFit and functional fitness. It brings together workout timers, a history of completed workouts, a library of exercises, and recommendations matched to the time, equipment, and intensity available for a session.

The initial platforms are **macOS desktop** and **iOS**.

> Status: product definition. This repository currently contains documentation only. The application, dependencies, and build commands have not been scaffolded. Features below describe the intended product, not functionality already available.

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

This is a target layout, not a list of files already present:

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

Keep application components in the app initially; extract additional shared packages when there is an actual consumer. Use a JavaScript workspace and a committed package-manager version. The package manager remains to be selected. Expose routine workflows through a root Makefile when scaffolding is added.

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

There are no install, development, test, or build commands yet. This README is the initial product brief and proposed technical direction; implementation setup will be documented as the application is scaffolded.

## Technical references

- [Tauri overview and supported platform approach](https://v2.tauri.app/start/)
- [Tauri prerequisites, including Apple development requirements](https://v2.tauri.app/start/prerequisites/)
- [Tauri iOS signing](https://v2.tauri.app/distribute/sign/ios/)
- [React versions](https://react.dev/versions)
- [shadcn/ui with Tailwind CSS 4 and React 19](https://ui.shadcn.com/docs/tailwind-v4)
- [TanStack libraries for React](https://tanstack.com/libraries/react)
- [TanStack Query overview](https://tanstack.com/query/latest/docs/framework/react/overview)
