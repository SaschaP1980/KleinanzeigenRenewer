#!/usr/bin/env python3
"""Reproducible standalone Windows first-user OneClick ZIP; never installs software."""
from __future__ import annotations
import argparse
import hashlib
import io
from pathlib import Path
from zipfile import ZIP_STORED, ZipFile, ZipInfo

ROOT = Path(__file__).resolve().parents[1]
VERSION = '1.23.36'  # the approved, already released Windows kit source, NOT a Chrome bump
DEST = ROOT / 'release' / f'kleinanzeigen-oneclick-einrichtung-v{VERSION}.zip'
DIGEST_FILE = ROOT / 'release' / f'kleinanzeigen-oneclick-einrichtung-v{VERSION}.sha256'
NAMES = (
    'OneClick-Einrichtung.cmd',
    'Manage-KleinanzeigenRenewer-OneClick.ps1',
    'OneClick-Update-KleinanzeigenRenewer.cmd',
    'KleinanzeigenRenewer-Updater.ps1',
)

def build() -> bytes:
    out = io.BytesIO()
    with ZipFile(out, mode='w', compression=ZIP_STORED, allowZip64=False) as z:
        for name in NAMES:
            source = ROOT / 'tools' / 'windows' / name
            contents = source.read_bytes()
            info = ZipInfo(name, (2020, 1, 1, 0, 0, 0))
            info.compress_type = ZIP_STORED
            info.create_system = 3
            info.external_attr = 0o100644 << 16
            z.writestr(info, contents)
    return out.getvalue()

def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument('--check', action='store_true', help='fail if committed package differs')
    parser.add_argument('--write', action='store_true', help='write reproducible source package')
    args = parser.parse_args()
    if args.check == args.write:
        parser.error('choose exactly one of --check or --write')
    data = build()
    sha = hashlib.sha256(data).hexdigest()
    digest_line = sha + '  ' + DEST.name + '\n'
    if args.check:
        if DEST.read_bytes() != data:
            raise SystemExit('KAR94_ZIP_SOURCE_MISMATCH')
        if DIGEST_FILE.read_text(encoding='ascii') != digest_line:
            raise SystemExit('KAR94_ZIP_DIGEST_MISMATCH')
    else:
        DEST.parent.mkdir(parents=True, exist_ok=True)
        DEST.write_bytes(data)
        DIGEST_FILE.write_text(digest_line, encoding='ascii')
    print(f'PASS KAR94 ZIP {DEST.name} bytes={len(data)} sha256={sha}')

if __name__ == '__main__':
    main()
