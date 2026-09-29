"""Validate public signing metadata and generate the isolated App Store configuration."""
import datetime
import hashlib
import json
import os
from pathlib import Path
import plistlib
import re
import subprocess
import stat
import sys


def build_number(run, attempt):
    if not 1 <= run < 999900 or not 1 <= attempt <= 99:
        raise ValueError('Run number or attempt exceeds the supported build-number range')
    return f'{1 + run // 100}.{run % 100}.{attempt}'


def validate_profile(profile, certificate, team, bundle):
    entitlements = profile.get('Entitlements', {})
    prefixes = profile.get('ApplicationIdentifierPrefix', [])
    app_id = entitlements.get('com.apple.application-identifier')
    if profile.get('TeamIdentifier') != [team] or entitlements.get('com.apple.developer.team-identifier') != team:
        raise ValueError('Provisioning profile belongs to a different team')
    if len(prefixes) != 1 or app_id != f'{prefixes[0]}.{bundle}':
        raise ValueError('Provisioning profile does not match the app bundle ID')
    if certificate not in profile.get('DeveloperCertificates', []):
        raise ValueError('App distribution certificate is not included in the provisioning profile')
    if profile.get('ExpirationDate', datetime.datetime.min) <= datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None):
        raise ValueError('Provisioning profile has expired')
    if profile.get('ProvisionedDevices') or profile.get('ProvisionsAllDevices') or entitlements.get('get-task-allow') or entitlements.get('com.apple.security.get-task-allow'):
        raise ValueError('An App Store distribution profile is required')
    if profile.get('Platform') != ['OSX']:
        raise ValueError('A macOS provisioning profile is required')
    return app_id


def output(*args, **kwargs):
    return subprocess.check_output(args, **kwargs)


def cert_details(path):
    data = output('openssl', 'x509', '-in', str(path), '-outform', 'DER')
    subject = output('openssl', 'x509', '-in', str(path), '-noout', '-subject', '-nameopt', 'multiline').decode()
    fields = dict(re.findall(r'^\s*(\w+)\s*=\s*(.+)$', subject, re.M))
    subprocess.run(['openssl', 'x509', '-in', str(path), '-noout', '-checkend', '0'], check=True, stdout=subprocess.DEVNULL)
    return data, fields['commonName'], fields['organizationalUnitName']


def prepare_embedded_profile(path):
    # A provisioning profile is public signing metadata embedded in every app.
    # The containing temporary directory and private signing material stay private.
    path.chmod(0o644)


def check_bundle_permissions(bundle):
    for path in [bundle, *bundle.rglob('*')]:
        if path.is_symlink():
            continue
        required = stat.S_IROTH | (stat.S_IXOTH if path.is_dir() else 0)
        if path.stat().st_mode & required != required:
            raise ValueError(f'Bundle path must be readable/traversable by all users: {path}')


def main():
    directory = Path(os.environ['TESTFLIGHT_DIR'])
    team = os.environ['APPLE_TEAM_ID']
    config = json.loads(Path('apps/nextround/src-tauri/tauri.conf.json').read_text())
    profile_path = directory / 'embedded.provisionprofile'
    profile = plistlib.loads(output('security', 'cms', '-D', '-i', str(profile_path)))
    app_der, app_name, app_team = cert_details(directory / 'app.pem')
    installer_der, installer_name, installer_team = cert_details(directory / 'installer.pem')
    if app_team != team or installer_team != team:
        raise ValueError('Both distribution certificates must match APPLE_TEAM_ID')
    if not app_name.startswith(('Apple Distribution: ', '3rd Party Mac Developer Application: ')):
        raise ValueError('App certificate must be an App Store distribution identity')
    if not installer_name.startswith('3rd Party Mac Developer Installer: '):
        raise ValueError('Installer certificate must be Mac Installer Distribution')
    # Identity listing proves each imported certificate has its matching private key.
    identities = output('security', 'find-identity', '-v', '-p', 'basic', os.environ['TESTFLIGHT_KEYCHAIN']).decode()
    for cert in [app_der, installer_der]:
        if hashlib.sha1(cert).hexdigest().upper() not in identities:
            raise ValueError('A distribution certificate is missing its usable private key')
    app_id = validate_profile(profile, app_der, team, config['identifier'])
    prepare_embedded_profile(profile_path)
    entitlements = {'com.apple.security.app-sandbox': True,
                    # WKWebView's networking process requires this even for bundled content.
                    'com.apple.security.network.client': True,
                    'com.apple.application-identifier': app_id,
                    'com.apple.developer.team-identifier': team}
    entitlements_path = directory / 'entitlements.plist'
    entitlements_path.write_bytes(plistlib.dumps(entitlements))
    number = build_number(int(os.environ['GITHUB_RUN_NUMBER']), int(os.environ['GITHUB_RUN_ATTEMPT']))
    store_config = {'bundle': {'category': 'HealthcareAndFitness', 'macOS': {
        'signingIdentity': app_name, 'bundleVersion': number,
        'entitlements': str(entitlements_path),
        'files': {'embedded.provisionprofile': str(profile_path)},
        'infoPlist': str(Path('apps/nextround/src-tauri/Info.appstore.plist').resolve())}}}
    (directory / 'tauri.appstore.json').write_text(json.dumps(store_config))
    (directory / 'metadata.json').write_text(json.dumps({'version':config['version'], 'build':number, 'bundle':config['identifier'], 'team':team}))
    with open(os.environ['GITHUB_ENV'], 'a') as env:
        env.write(f'APPSTORE_INSTALLER_IDENTITY={installer_name}\nAPPSTORE_BUILD_NUMBER={number}\n')
    print(f'Validated App Store identities/profile for {config["identifier"]}, build {number}')


if __name__ == '__main__':
    if len(sys.argv) == 3 and sys.argv[1] == '--check-bundle':
        check_bundle_permissions(Path(sys.argv[2]))
    else:
        main()
