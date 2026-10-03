#!/usr/bin/env python3
"""Bound upload and processing separately; never repeat an ambiguous submission."""
import argparse
import json
import os
from pathlib import Path
import signal
import subprocess
import time
import uuid


def run_bounded(args, timeout):
    process = subprocess.Popen(args, stdout=subprocess.PIPE, stderr=subprocess.PIPE, start_new_session=True)
    try:
        stdout, _ = process.communicate(timeout=max(.01, timeout))
        return stdout.decode('utf-8', errors='replace'), process.returncode, False
    except (subprocess.TimeoutExpired, KeyboardInterrupt):
        # Only this child's process group, including descendants that inherited pipes.
        try:
            os.killpg(process.pid, signal.SIGKILL)
        except ProcessLookupError:
            pass
        stdout, _ = process.communicate()
        return stdout.decode('utf-8', errors='replace'), process.returncode, True


def document(raw):
    try:
        value = json.loads(raw)
        return value if isinstance(value, dict) else {}
    except ValueError:
        return {}


def submission_id(value):
    try:
        return str(uuid.UUID(str(value)))
    except (ValueError, TypeError, AttributeError):
        return None


def notarize(artifact, credentials, output, *, command=None, upload_timeout=600,
             total_timeout=1800, request_timeout=60, poll_interval=15):
    command = command or ['xcrun', 'notarytool']
    deadline = time.monotonic() + total_timeout
    diagnostic = {'stage': 'upload', 'status': 'Submitting', 'id': None, 'statusAttempts': 0}
    output = Path(output)
    output.parent.mkdir(parents=True, exist_ok=True)
    if output.exists():
        print('Existing notarization record preserved. Resolve it before another upload.', flush=True)
        return False

    def record(stage, status):
        diagnostic.update(stage=stage, status=status)
        output.write_text(json.dumps(diagnostic, indent=2) + '\n')
        print(f'Notarization: {stage}: {status}' + (f' ({diagnostic["id"]})' if diagnostic['id'] else ''), flush=True)

    record('upload', 'Submitting')
    try:
        raw, code, timed_out = run_bounded([*command, 'submit', str(artifact), *credentials, '--output-format', 'json'], min(upload_timeout, total_timeout))
    except OSError:
        record('upload', 'Could not launch notarytool')
        return False
    diagnostic['id'] = submission_id(document(raw).get('id'))
    diagnostic['uploadTimedOut'] = timed_out
    diagnostic['uploadExitCode'] = code
    if not diagnostic['id']:
        record('upload', 'Upload outcome unknown')
        print('No retry: inspect Apple submission history on a fresh runner before uploading again.', flush=True)
        return False
    record('processing', 'Checking submitted artifact')
    while time.monotonic() < deadline:
        diagnostic['statusAttempts'] += 1
        try:
            raw, code, timed_out = run_bounded([*command, 'info', diagnostic['id'], *credentials, '--output-format', 'json'], min(request_timeout, deadline-time.monotonic()))
        except OSError:
            raw, code, timed_out = '', -1, False
        status = document(raw).get('status') if code == 0 and not timed_out else None
        if status in ('Accepted', 'Invalid', 'Rejected'):
            record('complete', status)
            return status == 'Accepted'
        record('processing', 'In Progress' if status == 'In Progress' else 'Status temporarily unavailable')
        time.sleep(max(0, min(poll_interval, deadline-time.monotonic())))
    record('processing', 'Processing timed out')
    print('No resubmission: query the recorded ID on a fresh runner before any retry.', flush=True)
    return False


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('artifact')
    parser.add_argument('output')
    parser.add_argument('--keychain-profile', required=True)
    parser.add_argument('--keychain')
    args = parser.parse_args()
    credentials = ['--keychain-profile', args.keychain_profile]
    if args.keychain:
        credentials += ['--keychain', args.keychain]
    raise SystemExit(0 if notarize(args.artifact, credentials, args.output) else 1)
