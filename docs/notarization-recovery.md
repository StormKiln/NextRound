# Bounded notarization and recovery

`scripts/notarize.py` submits once, with a 10-minute upload budget and a 30-minute total budget including upload and processing. Each status request has at most 60 seconds; status transport errors retry after 15 seconds within the same total budget. Timed-out command process groups are killed. The helper does not print raw tool output or credential arguments.

The app and DMG each retain sanitized `*-notarization.json` diagnostics: stage, status, submission UUID, upload exit/timeout and status attempt count. CI retains these even on failure. Acceptance, stapling, signatures, Gatekeeper, updater signature and checksums remain mandatory.

If a submission ID is known, query that ID with `xcrun notarytool info ID --keychain-profile PROFILE --output-format json` on a fresh authenticated runner before considering any new upload. Processing timeout means pending/unknown, not rejection. Inspect Apple's submission log for a rejected ID; review it for sensitive values before sharing.

If upload ends without a confirmed ID, the outcome is ambiguous. Inspect `notarytool history` on a fresh runner and match the artifact/submission time before retrying. Do not automatically rerun the whole packaging job: it can create duplicate submissions. There are no automatic upload retries. Existing diagnostic records are preserved and block another invocation, including accepted records; archive resolved evidence deliberately before any fresh submission. After determining that no submission exists or that a terminal failure requires rebuilding, one deliberate retry on a fresh runner is reasonable; stop and investigate if it fails again. Never move an existing release tag or replace published artifacts to recover.

S3 acceleration remains at Apple's default because no evidence established it caused the earlier hang. Tests simulate accepted/rejected requests, transient status failure, ambiguous upload, upload hang and processing delay without calling Apple.
