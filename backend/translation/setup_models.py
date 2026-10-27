"""One-time download. Translation itself only reads the resulting local files."""
import json
import os
from pathlib import Path
import shutil
import urllib.error
import urllib.request
import zipfile

root = Path(__file__).resolve().parents[2]
runtime = root / '.translation-runtime'
model_root = Path(os.environ.get('TRANSLATION_MODEL_DIR') or runtime / 'models').resolve()
downloads = runtime / 'downloads'
downloads.mkdir(parents=True, exist_ok=True)
with urllib.request.urlopen('https://raw.githubusercontent.com/argosopentech/argospm-index/main/index.json', timeout=60) as response:
    packages = json.load(response)
for target in ('ms', 'zh'):
    destination = model_root / ('en-' + target)
    if (destination / 'model' / 'model.bin').exists():
        print(f'{target}: model already installed', flush=True)
        continue
    package = next(p for p in packages if p['from_code'] == 'en' and p['to_code'] == target and p['package_version'] == '1.9')
    archive_path = downloads / f'en-{target}-1.9.argosmodel'
    if not archive_path.exists():
        print(f'{target}: downloading offline model...', flush=True)
        partial = archive_path.with_suffix('.part')
        try:
            urllib.request.urlretrieve(package['links'][0], partial)
        except urllib.error.HTTPError:
            mirror = 'https://data.argosopentech.com/argospm/v1/' + package['links'][0].rsplit('/', 1)[-1]
            print(f'{target}: using the official Argos data mirror', flush=True)
            urllib.request.urlretrieve(mirror, partial)
        partial.replace(archive_path)
    unpack = downloads / ('unpack-' + target)
    unpack.mkdir(exist_ok=True)
    with zipfile.ZipFile(archive_path) as archive:
        for item in archive.infolist():
            resolved = (unpack / item.filename).resolve()
            if not resolved.is_relative_to(unpack.resolve()):
                raise ValueError('Invalid model archive path')
        archive.extractall(unpack)
    model_file = next(unpack.rglob('model.bin'))
    package_root = model_file.parent.parent
    destination.mkdir(parents=True, exist_ok=True)
    shutil.copytree(package_root, destination, dirs_exist_ok=True)
    manifest = {k: package[k] for k in ('from_code', 'to_code', 'package_version', 'links')}
    (destination / 'package-manifest.json').write_text(json.dumps(manifest, indent=2), encoding='utf8')
    print(f'{target}: installed at {destination}', flush=True)
