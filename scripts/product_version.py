#!/usr/bin/env python3
"""Canonical Chrome product version and derived npm/build metadata (KAR-210)."""
import argparse
import copy
import json
from pathlib import Path
import re
import sys

_COMPONENT = r'(?:0|[1-9][0-9]{0,4})'
_NUMERIC = re.compile(rf'{_COMPONENT}(?:\.{_COMPONENT}){{2,3}}')
_CORRECTION = re.compile(rf'({_COMPONENT}(?:\.{_COMPONENT}){{2}})_c(?:0|[1-9][0-9]*)')
META = ('manifest.json', 'package.json', 'package-lock.json', 'release/release-spec.json')


def require(ok, message):
    if not ok:
        raise ValueError('KAR210_VERSION: ' + message)


def parse(version):
    """Compare ordinary historic 3-part versions as if HOTFIX were zero."""
    require(isinstance(version, str) and _NUMERIC.fullmatch(version), 'invalid numeric version')
    parts = tuple(map(int, version.split('.')))
    require(any(parts) and all(part <= 65535 for part in parts), 'Chrome version outside range')
    return parts if len(parts) == 4 else (*parts, 0)


def active_version(version):
    parts = parse(version)
    require(len(version.split('.')) == (4 if parts[0] >= 2 else 3),
            'wrong component count for product generation')
    return version


def advance(version, kind):
    parts = list(parse(version))
    classes = ('major', 'minor', 'patch', 'hotfix')
    require(kind in classes, 'unknown version change class')
    index = classes.index(kind)
    require(parts[index] < 65535, 'version component overflow')
    parts[index] += 1
    parts[index + 1:] = [0] * (3 - index)
    return '.'.join(map(str, parts))


def npm_version(product):
    return '.'.join(map(str, parse(active_version(product))[:3]))


def archive_version(manifest):
    require(isinstance(manifest, dict), 'invalid manifest')
    product = active_version(manifest.get('version'))
    label = manifest.get('version_name', product)
    if label == product:
        return product
    # A historical correction label is an identifier, not a numeric version.
    match = _CORRECTION.fullmatch(label) if isinstance(label, str) else None
    require(product.count('.') == 2 and match is not None, 'invalid or mismatched archive label')
    require(parse(match.group(1))[0] < 2, 'invalid historical correction label')
    return label


def validate_metadata(meta):
    require(isinstance(meta, dict) and set(meta) == set(META)
            and all(isinstance(meta[p], dict) for p in META), 'four metadata objects required')
    manifest, package, lock, release = (meta[p] for p in META)
    product = active_version(manifest.get('version'))
    require(archive_version(manifest) == product, 'active build cannot use historical correction alias')
    npm = npm_version(product)
    packages = lock.get('packages')
    root = packages.get('') if isinstance(packages, dict) else None
    require(package.get('version') == npm and lock.get('version') == npm
            and isinstance(root, dict) and root.get('version') == npm, 'npm metadata mismatch')
    require(package.get('displayVersion') == product and release.get('version') == product
            and release.get('packageVersion') == product, 'product metadata mismatch')
    return product


def bump_metadata(meta, kind):
    current = validate_metadata(meta)
    product = active_version(advance(current, kind))
    npm = npm_version(product)
    future = copy.deepcopy(meta)
    manifest, package, lock, release = (future[p] for p in META)
    manifest['version'] = product
    if 'version_name' in manifest:
        manifest['version_name'] = product
    package.update(version=npm, displayVersion=product)
    lock['version'] = npm
    lock['packages']['']['version'] = npm
    release.update(version=product, packageVersion=product)
    validate_metadata(future)
    return future


def validate_release_transition(product, mode, tags):
    """Check regular product tags numerically; never reinterpret correction IDs."""
    new = parse(active_version(product))
    require(mode in ('fast', 'work'), 'unknown release mode')
    ordinary = []
    corrections = []
    for tag in tags:
        if not tag:
            continue
        require(tag.startswith('v'), 'unexpected product tag')
        label = tag[1:]
        match = _CORRECTION.fullmatch(label)
        if match:
            basis = parse(match.group(1))
            require(basis[0] < 2, 'invalid correction tag')
            corrections.append(basis)
        else:
            ordinary.append(parse(active_version(label)))
    if corrections:
        require(ordinary and max(corrections) < max(ordinary),
                'unresolved historical correction tag; reconcile numeric basis first')
    if ordinary:
        old = max(ordinary)
        require(new > old, 'release version must advance')
        require((new[:2] == old[:2]) == (mode == 'fast'),
                'release mode does not match major/minor change')
    return product


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, default=Path(__file__).resolve().parent.parent)
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument('--release-mode', choices=('fast', 'work'))
    mode.add_argument('--version', help='validate a regular product version without reading metadata')
    args = parser.parse_args()
    if args.version is not None:
        print(active_version(args.version))
        return
    product = validate_metadata({p: json.loads((args.root / p).read_text(encoding='utf-8')) for p in META})
    if args.release_mode:
        validate_release_transition(product, args.release_mode, sys.stdin.read().splitlines())
    print(product)


if __name__ == '__main__':
    main()
