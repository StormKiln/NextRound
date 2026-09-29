# Contributing to NextRound

Work on a feature branch and open a pull request into `main`. Link the relevant issue and describe the final behavior and validation. PRs do not require reviewer approval; this repository currently has one maintainer.

## Checks and merging

Run `make install`, then `make check` for repository checks, typechecking, core/native tests, lint, and a production frontend build. Run `make test-e2e` for browser acceptance tests and `make build-macos` for a local ad-hoc signed app and DMG. Signing and notarization are described in [release documentation](docs/release.md).

The `Repository checks` GitHub Actions job is required on PRs and merge groups. Once checks pass and review conversations are resolved, add the PR to the merge queue (or enable auto-merge while checks run). The queue tests the combined changes against `main` and squash-merges one PR at a time. Use the PR title as a useful commit summary. Merged feature branches are deleted automatically.

`main` requires PRs, the merge queue, and linear history. Force pushes and deletion are blocked. There are no configured bypass actors, required approvals, code-owner approvals, or last-pusher approvals. Repository admins can edit settings for recovery, but normal work must use PRs.

## Maintaining CI

The required job runs all checks, browser tests, and a macOS app build:

- Keep Makefile commands and CI aligned when adding checks.
- Keep the stable required `Repository checks` job as a gate that fails if any required dependent job fails or is cancelled; do not report success after failed dependencies.
- Preserve both `pull_request` and `merge_group` triggers. Do not path-filter away a required check or it can leave the merge queue waiting indefinitely.
- Keep GitHub tokens read-only by default; grant additional permissions only to jobs that need them. Do not execute untrusted PR code with `pull_request_target` and write credentials.
- Pin external actions to immutable commit SHAs. Dependabot checks GitHub Actions weekly; JavaScript and Cargo dependencies are also checked weekly.
- Increase the queue check timeout if the complete macOS build needs more than the initial 30-minute window.

Secret scanning, push protection, Dependabot alerts, and security updates are enabled in repository settings. Never commit signing keys or other credentials; use scoped GitHub secrets when release workflows are introduced.

## Release planning

The [0.1.0 epic](https://github.com/StormKiln/NextRound/issues/1) and [milestone](https://github.com/StormKiln/NextRound/milestone/1) cover the macOS framework and EMOM feature. iOS and the broader workout feature set remain outside that release.
