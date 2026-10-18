#!/usr/bin/env bash
# Retry transient runner/network failures without changing the pinned toolchain.
set -uo pipefail
for attempt in 1 2 3; do
  echo "Installing Rust 1.98.1 (attempt ${attempt}/3)" >&2
  if rustup toolchain install 1.98.1 --profile minimal --component rustfmt --component clippy; then
    exit 0
  else
    status=$?
  fi
  if [ "$attempt" -eq 3 ]; then
    echo "Rust setup failed after 3 attempts (exit ${status})." >&2
    exit "$status"
  fi
  sleep "$((attempt * 5))"
done
