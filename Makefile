.PHONY: icons check-repo

# Lightweight checks while the application toolchain is being scaffolded.
check-repo:
	git diff --check "$$(git hash-object -t tree /dev/null)" HEAD
	bash -n scripts/package-icons.sh
	python3 -m json.tool assets/icons/ios/AppIcon.appiconset/Contents.json > /dev/null
	test -s assets/icons/ios/AppIcon.appiconset/AppIcon.png
	test -s assets/icons/macos/NextRound.icns
	test -s assets/brand/nextround-splash.png

# Package the approved source artwork using macOS system tools.
icons:
	bash scripts/package-icons.sh
