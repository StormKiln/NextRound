#!/usr/bin/env bash
set -euo pipefail
umask 077
: "${APPSTORE_API_KEY_ID:?Missing API Key ID}"
: "${APPSTORE_API_ISSUER_ID:?Missing API Issuer ID}"
: "${APPSTORE_API_PRIVATE_KEY:?Missing API private key}"
: "${TESTFLIGHT_DIR:?Missing temporary directory}"
node scripts/testflight-status.mjs --preflight
# altool supports a private_keys directory relative to its working directory.
keys="$TESTFLIGHT_DIR/upload/private_keys"
mkdir -p "$keys"
case "$APPSTORE_API_KEY_ID" in *[!A-Z0-9]*|'') echo 'Invalid API key ID' >&2; exit 1;; esac
key="$keys/AuthKey_$APPSTORE_API_KEY_ID.p8"
trap 'rm -f "$key"' EXIT
printf '%s' "$APPSTORE_API_PRIVATE_KEY" > "$key"
package="$(pwd)/testflight/NextRound.pkg"
cd "$TESTFLIGHT_DIR/upload"
xcrun altool --validate-app --type macos --file "$package" \
  --apiKey "$APPSTORE_API_KEY_ID" --apiIssuer "$APPSTORE_API_ISSUER_ID"
xcrun altool --upload-app --type macos --file "$package" \
  --apiKey "$APPSTORE_API_KEY_ID" --apiIssuer "$APPSTORE_API_ISSUER_ID"
