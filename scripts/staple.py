"""Retry transient Apple ticket transport errors, never bypass ticket validation."""
import re
import subprocess
import sys
import time


def staple(path):
    for attempt in range(4):
        result = subprocess.run(['xcrun', 'stapler', 'staple', path], text=True, capture_output=True)
        output = (result.stdout or '') + (result.stderr or '')
        print(output, end='', flush=True)
        if result.returncode == 0:
            return
        # Error 68 alone also covers permanent failures; require a transport code.
        transient = result.returncode == 68 and re.search(
            r'NSURLErrorDomain\s+Code=-(?:1001|1005|1009)\b', output)
        if not transient or attempt == 3:
            raise RuntimeError(f'Stapling failed (exit {result.returncode}); no verified artifact produced.')
        delay = 5 * 2 ** attempt
        print(f'Apple ticket transport failed; retry {attempt + 2}/4 in {delay}s.', flush=True)
        time.sleep(delay)


if __name__ == '__main__':
    if len(sys.argv) != 2:
        raise SystemExit('Usage: staple.py <app-or-dmg>')
    try:
        staple(sys.argv[1])
    except RuntimeError as error:
        raise SystemExit(str(error)) from error
