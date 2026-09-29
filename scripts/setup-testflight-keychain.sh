#!/usr/bin/env bash
set -euo pipefail
umask 077
: "${RUNNER_TEMP:?CI runner required}"
: "${GITHUB_ENV:?CI environment required}"
: "${KEYCHAIN_PASSWORD:?Missing KEYCHAIN_PASSWORD}"
: "${MACOS_DIST_CERT_P12_BASE64:?Missing app certificate}"
: "${MACOS_DIST_CERT_PASSWORD:?Missing app certificate password}"
: "${MACOS_INSTALLER_CERT_P12_BASE64:?Missing installer certificate}"
: "${MACOS_INSTALLER_CERT_PASSWORD:?Missing installer certificate password}"
: "${MACOS_PROVISIONING_PROFILE_BASE64:?Missing provisioning profile}"
export TESTFLIGHT_DIR="$RUNNER_TEMP/nextround-testflight"
export TESTFLIGHT_KEYCHAIN="$RUNNER_TEMP/nextround-testflight.keychain-db"
mkdir -p "$TESTFLIGHT_DIR"
trap 'rm -f "$TESTFLIGHT_DIR/app.p12" "$TESTFLIGHT_DIR/installer.p12"' EXIT
printf '%s' "$MACOS_DIST_CERT_P12_BASE64" | base64 --decode > "$TESTFLIGHT_DIR/app.p12"
printf '%s' "$MACOS_INSTALLER_CERT_P12_BASE64" | base64 --decode > "$TESTFLIGHT_DIR/installer.p12"
printf '%s' "$MACOS_PROVISIONING_PROFILE_BASE64" | base64 --decode > "$TESTFLIGHT_DIR/embedded.provisionprofile"
security create-keychain -p "$KEYCHAIN_PASSWORD" "$TESTFLIGHT_KEYCHAIN"
security set-keychain-settings -lut 7200 "$TESTFLIGHT_KEYCHAIN"
security unlock-keychain -p "$KEYCHAIN_PASSWORD" "$TESTFLIGHT_KEYCHAIN"
security list-keychains -d user -s "$TESTFLIGHT_KEYCHAIN" "$HOME/Library/Keychains/login.keychain-db"
security import "$TESTFLIGHT_DIR/app.p12" -k "$TESTFLIGHT_KEYCHAIN" -P "$MACOS_DIST_CERT_PASSWORD" -T /usr/bin/codesign
security import "$TESTFLIGHT_DIR/installer.p12" -k "$TESTFLIGHT_KEYCHAIN" -P "$MACOS_INSTALLER_CERT_PASSWORD" -T /usr/bin/productbuild -T /usr/bin/productsign
security set-key-partition-list -S apple-tool:,apple:,codesign: -s -k "$KEYCHAIN_PASSWORD" "$TESTFLIGHT_KEYCHAIN" >/dev/null
# Export public certificates only; no private key is ever printed or written unencrypted.
/usr/bin/openssl pkcs12 -in "$TESTFLIGHT_DIR/app.p12" -nokeys -clcerts -passin env:MACOS_DIST_CERT_PASSWORD -out "$TESTFLIGHT_DIR/app.pem"
/usr/bin/openssl pkcs12 -in "$TESTFLIGHT_DIR/installer.p12" -nokeys -clcerts -passin env:MACOS_INSTALLER_CERT_PASSWORD -out "$TESTFLIGHT_DIR/installer.pem"
python3 scripts/testflight-config.py
printf 'TESTFLIGHT_DIR=%s\nTESTFLIGHT_KEYCHAIN=%s\n' "$TESTFLIGHT_DIR" "$TESTFLIGHT_KEYCHAIN" >> "$GITHUB_ENV"
