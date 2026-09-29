PNPM := npm exec --offline --yes --package=pnpm@12.8.1 -- pnpm
NATIVE := apps/nextround/src-tauri/Cargo.toml
.PHONY: icons check-repo install dev dev-web lint format typecheck test test-native test-e2e build build-macos check

install:
	npm exec --yes --package=pnpm@12.8.1 -- pnpm install --frozen-lockfile

dev:
	$(PNPM) tauri dev

dev-web:
	$(PNPM) dev

lint:
	$(PNPM) lint
	cargo fmt --manifest-path $(NATIVE) --check
	cargo clippy --manifest-path $(NATIVE) --all-targets -- -D warnings

format:
	$(PNPM) format
	cargo fmt --manifest-path $(NATIVE)

typecheck:
	$(PNPM) typecheck

test:
	$(PNPM) test

test-native:
	cargo test --manifest-path $(NATIVE)

test-e2e:
	$(PNPM) test:e2e

build:
	$(PNPM) build

build-macos:
	CI=true $(PNPM) tauri build --bundles app,dmg

build-app:
	$(PNPM) tauri build --bundles app $(if $(TAURI_CONFIG),--config "$(TAURI_CONFIG)")

sounds:
	python3 scripts/generate-sounds.py

release-package:
	bash scripts/package-release.sh

check: check-repo test-release typecheck test test-native lint build

# Lightweight checks while the application toolchain is being scaffolded.
check-repo:
	git diff --check "$$(git hash-object -t tree /dev/null)" HEAD
	bash -n scripts/package-icons.sh scripts/package-release.sh scripts/setup-release-keychain.sh
	python3 -m json.tool assets/icons/ios/AppIcon.appiconset/Contents.json > /dev/null
	test -s assets/icons/ios/AppIcon.appiconset/AppIcon.png
	test -s assets/icons/macos/NextRound.icns
	test -s assets/brand/nextround-splash.png

# Package the approved source artwork using macOS system tools.
icons:
	bash scripts/package-icons.sh

.PHONY: test-release release-metadata release-keychain check-workflows
test-release:
	python3 -m unittest discover -s tests/release

release-metadata:
	python3 scripts/release-metadata.py

release-keychain:
	bash scripts/setup-release-keychain.sh

check-workflows:
	actionlint
