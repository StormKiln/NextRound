#!/usr/bin/env bash
set -euo pipefail
umask 077
: "${RUNNER_TEMP:?CI runner required}"
: "${GITHUB_ENV:?CI environment file required}"
: "${APPLE_CERTIFICATE:?Missing APPLE_CERTIFICATE}"
: "${APPLE_CERTIFICATE_PASSWORD:?Missing APPLE_CERTIFICATE_PASSWORD}"
: "${KEYCHAIN_PASSWORD:?Missing KEYCHAIN_PASSWORD}"
: "${APPLE_ID:?Missing APPLE_ID}"
: "${APPLE_PASSWORD:?Missing APPLE_PASSWORD}"
: "${APPLE_TEAM_ID:?Missing APPLE_TEAM_ID}"
keychain="$RUNNER_TEMP/nextround-release.keychain-db"
certificate="$RUNNER_TEMP/nextround-certificate.p12"
trap 'rm -f "$certificate"' EXIT
printf '%s' "$APPLE_CERTIFICATE" | base64 --decode > "$certificate"
security create-keychain -p "$KEYCHAIN_PASSWORD" "$keychain"
security set-keychain-settings -lut 7200 "$keychain"
security unlock-keychain -p "$KEYCHAIN_PASSWORD" "$keychain"
security list-keychains -d user -s "$keychain" "$HOME/Library/Keychains/login.keychain-db"
security import "$certificate" -k "$keychain" -P "$APPLE_CERTIFICATE_PASSWORD" -T /usr/bin/codesign
security set-key-partition-list -S apple-tool:,apple:,codesign: -s -k "$KEYCHAIN_PASSWORD" "$keychain" >/dev/null
identity=$(security find-identity -v -p codesigning "$keychain" | python3 -c 'import re,sys; matches=re.findall(r"\"(Developer ID Application: [^\"]+)\"",sys.stdin.read()); assert len(matches)==1, "Exactly one valid Developer ID Application identity is required"; print(matches[0])')
if [[ "$identity" != *"($APPLE_TEAM_ID)" ]]; then
  echo 'Signing certificate and APPLE_TEAM_ID do not match.' >&2; exit 1
fi
xcrun notarytool store-credentials nextround-release --keychain "$keychain" --apple-id "$APPLE_ID" --password "$APPLE_PASSWORD" --team-id "$APPLE_TEAM_ID" >/dev/null
printf 'APPLE_SIGNING_IDENTITY=%s\nNOTARYTOOL_PROFILE=nextround-release\nNOTARYTOOL_KEYCHAIN=%s\n' "$identity" "$keychain" >> "$GITHUB_ENV"
