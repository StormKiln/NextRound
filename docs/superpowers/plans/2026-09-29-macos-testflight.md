# macOS TestFlight implementation plan

Goal: deliver the existing macOS EMOM app to App Store Connect using the configured secrets, preserving GitHub DMG releases.

Design: a separate manual/tag workflow builds an Apple Silicon macOS 14+ app with App Sandbox, explicit application/team entitlements and the matching provisioning profile. Generate configuration outside the checkout, use temporary keychains, and validate certificates against the profile before building. Use AVAudioPlayer and IOKit assertions in process for audio and idle sleep prevention. Package with productbuild, validate and upload with altool. Build numbers increase with workflow runs and retries. No App Store public submission or external tester invitations.

- [ ] Add failing tests for profile/certificate mismatch, expiry, App ID, distribution restrictions, and monotonic build numbers; implement metadata/config generation.
- [ ] Replace afplay/caffeinate with an owned native audio/power bridge; test cue validation and assertion lifecycle, then smoke-test a sandboxed build.
- [ ] Add Makefile commands, temporary signing setup, signed package verification, upload script and separate workflow with cleanup on failure.
- [ ] Run repository/browser/native checks and workflow lint. Review changes, open PR, pass merge queue.
- [ ] Dispatch main workflow; verify certificate/password/profile and Apple upload acceptance. Inspect processing status when accessible. Update #33 and setup guide with remaining installation validation.

Validation boundaries: CI can verify signatures/entitlements and upload acceptance. Actual TestFlight installation and audible cues on the user's device require a processed build and an eligible internal tester. Do not mark those checks complete from upload success alone.
