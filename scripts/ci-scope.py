"""Select full CI unless the event changes only explicitly recognized documentation."""
import json
import os
from pathlib import PurePosixPath, Path
import subprocess


def is_documentation(path):
    path = PurePosixPath(path)
    if len(path.parts) == 1 and path.suffix.lower() == '.md':
        return True
    if path.parts[0] == 'docs':
        return path.suffix.lower() in {'.md', '.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg'}
    return path.parts[0] == 'assets' and path.name == 'README.md'


def changed_files(event_name, event):
    if event_name == 'pull_request':
        base = event['pull_request']['base']['sha']
        head = event['pull_request']['head']['sha']
        separator = '...'
    elif event_name == 'merge_group':
        base = event['merge_group']['base_sha']
        head = event['merge_group']['head_sha']
        separator = '..'
    elif event_name == 'push':
        base, head, separator = event['before'], event['after'], '..'
    else:
        return None
    # Validate before passing refs to git; missing/zero/unavailable refs fail closed.
    if any(len(ref) != 40 or any(c not in '0123456789abcdef' for c in ref) or set(ref) == {'0'}
           for ref in (base, head)):
        return None
    output = subprocess.check_output([
        'git', 'diff', '--no-renames', '--name-only', '-z', f'{base}{separator}{head}', '--',
    ])
    return [name.decode('utf-8') for name in output.split(b'\0') if name]


def full_ci(event_name, event):
    try:
        files = changed_files(event_name, event)
        return not files or not all(is_documentation(path) for path in files)
    except (KeyError, TypeError, ValueError, subprocess.CalledProcessError, UnicodeError):
        return True


if __name__ == '__main__':
    event = json.loads(Path(os.environ['GITHUB_EVENT_PATH']).read_text())
    required = full_ci(os.environ['GITHUB_EVENT_NAME'], event)
    with open(os.environ['GITHUB_OUTPUT'], 'a') as output:
        output.write(f'full-ci={str(required).lower()}\n')
    with open(os.environ['GITHUB_STEP_SUMMARY'], 'a') as summary:
        summary.write('Full validation required.\n' if required else
                      'Documentation-only change: application tests and builds are skipped.\n')
