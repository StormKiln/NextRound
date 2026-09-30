"""Generate a complete, version-specific feed for the supported Mac target."""
import datetime
import json
from pathlib import Path
import re
import sys

def manifest(directory, version):
    if not re.fullmatch(r'(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)',version):
        raise ValueError('A stable semantic version is required')
    archive=directory/f'NextRound_{version}_aarch64.app.tar.gz'
    signature=Path(str(archive)+'.sig')
    if not archive.is_file() or not archive.stat().st_size or not signature.is_file() or not signature.read_text().strip():
        raise ValueError('A nonempty updater archive and signature are required')
    return {'version':version,'pub_date':datetime.datetime.now(datetime.timezone.utc).isoformat(),
            'notes':f'NextRound {version}. See https://github.com/StormKiln/NextRound/releases/tag/v{version} for release notes.',
            'platforms':{'darwin-aarch64':{'url':f'https://github.com/StormKiln/NextRound/releases/download/v{version}/{archive.name}','signature':signature.read_text().strip()}}}
if __name__=='__main__':
    directory=Path(sys.argv[1]);version=sys.argv[2]
    (directory/'latest.json').write_text(json.dumps(manifest(directory,version),indent=2)+'\n')
