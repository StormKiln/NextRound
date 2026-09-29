# Contributing to NextRound

Work on a feature branch and open a pull request into `main`. Link the relevant issue and describe the final behavior and validation. PRs do not require reviewer approval; this repository currently has one maintainer.

## Checks and merging

Run `make check-repo` for the initial repository checks. These validate tracked-file whitespace, shell syntax, the icon catalog JSON, and the presence of brand assets. They do not yet test or build the application.

The `Repository checks` GitHub Actions job is required on PRs and merge groups. Once checks pass and review conversations are resolved, add the PR to the merge queue (or enable auto-merge while checks run). The queue tests the combined changes against `main` and squash-merges one PR at a time. Use the PR title as a useful commit summary. Merged feature branches are deleted automatically.

`main` requires PRs, the merge queue, and linear history. Force pushes and deletion are blocked. There are no configured bypass actors, required approvals, code-owner approvals, or last-pusher approvals. Repository admins can edit settings for recovery, but normal work must use PRs.

## Extending CI with the application

As the framework is added in [#2](https://github.com/StormKiln/NextRound/issues/2) and application validation in [#11](https://github.com/StormKiln/NextRound/issues/11):

- Add Makefile commands for lint, typechecking, meaningful tests, and a macOS build, then run them in CI.
- Keep the stable required `Repository checks` job as a gate that fails if any required dependent job fails or is cancelled; do not report success after failed dependencies.
- Preserve both `pull_request` and `merge_group` triggers. Do not path-filter away a required check or it can leave the merge queue waiting indefinitely.
- Keep GitHub tokens read-only by default; grant additional permissions only to jobs that need them. Do not execute untrusted PR code with `pull_request_target` and write credentials.
- Pin external actions to immutable commit SHAs. Dependabot checks GitHub Actions weekly; add JavaScript and Cargo dependency ecosystems when their manifests exist.
- Increase the queue check timeout if the complete macOS build needs more than the initial 30-minute window.

Secret scanning, push protection, Dependabot alerts, and security updates are enabled in repository settings. Never commit signing keys or other credentials; use scoped GitHub secrets when release workflows are introduced.

## Release planning

The [0.1.0 epic](https://github.com/StormKiln/NextRound/issues/1) and [milestone](https://github.com/StormKiln/NextRound/milestone/1) cover the macOS framework and EMOM feature. iOS and the broader workout feature set remain outside that release.
