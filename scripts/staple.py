"""Retry transient Apple ticket transport errors, never bypass ticket validation."""
import argparse
import re
import subprocess
import time


def staple(path, operation="staple"):
    if operation not in {"staple", "validate"}:
        raise ValueError("Unsupported stapler operation")
    for attempt in range(4):
        result = subprocess.run(['xcrun', 'stapler', operation, path], text=True, capture_output=True)
        output = (result.stdout or '') + (result.stderr or '')
        print(output, end='', flush=True)
        if result.returncode == 0:
            return
        # Error 68 alone also covers permanent failures; require a transport code.
        transient = result.returncode == 68 and re.search(
            r'NSURLErrorDomain\s+Code=-(?:1001|1005|1009)\b', output)
        if not transient or attempt == 3:
            raise RuntimeError(f'Stapler {operation} failed (exit {result.returncode}); no verified artifact produced.')
        delay = 5 * 2 ** attempt
        print(f'Apple ticket transport failed; retry {attempt + 2}/4 in {delay}s.', flush=True)
        time.sleep(delay)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--validate', action='store_true')
    parser.add_argument('path')
    args = parser.parse_args()
    try:
        staple(args.path, operation='validate' if args.validate else 'staple')
    except RuntimeError as error:
        raise SystemExit(str(error)) from error
