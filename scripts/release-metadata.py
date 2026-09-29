"""Reject mismatched tags before any release credentials are loaded."""
import json
import os
from pathlib import Path
import re
import subprocess
import tomllib


def validate(tag, versions):
    if not re.fullmatch(r'v(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)', tag):
        raise ValueError('Use a stable release tag such as v0.1.0.')
    version = tag[1:]
    if not versions or any(value != version for value in versions):
        raise ValueError('Tag and package/Tauri/Cargo versions must all match.')
    return version


def main():
    versions = [json.loads(Path(p).read_text())['version'] for p in (
        'package.json', 'apps/nextround/package.json', 'packages/core/package.json',
        'apps/nextround/src-tauri/tauri.conf.json')]
    versions.append(tomllib.loads(Path('apps/nextround/src-tauri/Cargo.toml').read_text())['package']['version'])
    lock = tomllib.loads(Path('apps/nextround/src-tauri/Cargo.lock').read_text())
    versions.extend(package['version'] for package in lock['package'] if package['name'] == 'nextround')
    tag = os.environ.get('RELEASE_TAG') or 'v' + versions[0]
    version = validate(tag, versions)
    subprocess.run(['git', 'merge-base', '--is-ancestor', 'HEAD', 'origin/main'], check=True)
    if os.environ.get('GITHUB_EVENT_NAME') == 'push':
        tagged = subprocess.check_output(['git', 'rev-parse', f'refs/tags/{tag}^{{commit}}'], text=True).strip()
        head = subprocess.check_output(['git', 'rev-parse', 'HEAD'], text=True).strip()
        if tagged != head:
            raise ValueError('The checked-out commit does not match the release tag.')
    notes = Path(f'docs/release-notes-{version}.md')
    if not notes.is_file():
        raise ValueError(f'Missing release notes: {notes}')
    if output := os.environ.get('GITHUB_OUTPUT'):
        with open(output, 'a') as stream:
            stream.write(f'version={version}\ntag={tag}\n')
    print(f'Validated {tag} on main history.')


if __name__ == '__main__':
    main()
