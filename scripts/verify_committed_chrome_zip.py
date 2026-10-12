#!/usr/bin/env python3
"""KAR-48: fail-closed, source-rebuilt proof of the committed Chrome ZIP.

The archive under release/ is the tested binary, not an arbitrary CI build.
No publication, git writes, live account traffic or product mutation.
"""
from __future__ import annotations

import argparse
import base64
import hashlib
import io
import json
import os
from pathlib import Path, PurePosixPath
import re
import subprocess
import sys
import tempfile
import zipfile

ROOT = Path(__file__).resolve().parent.parent
KEY_SHA256 = "70507977688f3465a60227cd0261bd07d92fad620625cd7ebff8f0856d9c5ed3"
EXTENSION_ID = "hafahjhhgiipdegfkgacchmnacgblnah"
PERMISSIONS = {"activeTab", "scripting", "storage", "unlimitedStorage"}
HOST_PERMISSIONS = {
    "https://www.kleinanzeigen.de/*",
    "https://kleinanzeigen.de/*",
    "https://img.kleinanzeigen.de/*",
}


def require(condition: bool, message: str):
    if not condition:
        raise ValueError("KAR48_ZIP_PARITY_FAILED: " + message)


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def check_identity(manifest: dict, app_id: str):
    require(isinstance(manifest, dict), "manifest must be a JSON object")
    require(manifest.get("manifest_version") == 3, "MV3 manifest required")
    require(set(manifest.get("permissions") or []) == PERMISSIONS
            and len(manifest.get("permissions") or []) == len(PERMISSIONS),
            "manifest permissions changed without explicit authorization")
    require(set(manifest.get("host_permissions") or []) == HOST_PERMISSIONS
            and len(manifest.get("host_permissions") or []) == len(HOST_PERMISSIONS),
            "host permissions changed without explicit authorization")
    try:
        key_bytes = base64.b64decode(manifest["key"], validate=True)
    except (KeyError, ValueError) as exc:
        raise ValueError("KAR48_ZIP_PARITY_FAILED: manifest key missing/malformed") from exc
    require(digest(key_bytes) == KEY_SHA256, "fixed extension public key changed")
    require(re.search(r"Chrome Extension ID:\s*" + EXTENSION_ID + r"\b", app_id) is not None,
            "APP_ID.txt no longer identifies the authorized extension")


def verify_structure(data: bytes, manifest: dict, expected_files: set[str] | None = None):
    try:
        with zipfile.ZipFile(io.BytesIO(data)) as z:
            entries = z.infolist()
            names = [info.filename for info in entries]
            require(bool(names) and len(names) == len(set(names)), "empty/duplicate ZIP entries")
            require(all(not info.is_dir() for info in entries), "directory entries not permitted")
            for name in names:
                p = PurePosixPath(name)
                require(bool(name) and not name.startswith("/") and "\\" not in name
                        and ".." not in p.parts and p.parts[0] not in ("", ".")
                        and not re.match(r"^[A-Za-z]:", name),
                        "unsafe ZIP member path")
            require("manifest.json" in names and "APP_ID.txt" in names,
                    "manifest or APP_ID missing from Chrome ZIP")
            require(z.testzip() is None, "ZIP CRC check failed")
            packed = json.loads(z.read("manifest.json"))
            require(packed == manifest, "embedded manifest differs from checked source")
            if expected_files is not None:
                require(set(names) == expected_files, "runtime/source package closure changed")
            return names
    except (zipfile.BadZipFile, UnicodeError, json.JSONDecodeError) as exc:
        raise ValueError("KAR48_ZIP_PARITY_FAILED: malformed ZIP or manifest") from exc


def validate_bytes(committed: bytes, generated: bytes, manifest: dict, app_id: str):
    check_identity(manifest, app_id)
    generated_members = set(verify_structure(generated, manifest))
    committed_members = verify_structure(committed, manifest, generated_members)
    require(committed == generated, "committed archive differs byte-for-byte from clean source rebuild")
    return {"sha256": digest(committed), "bytes": len(committed),
            "runtimeEntries": len(committed_members)}


def reject_base_collision(root: Path, relative: str, committed: bytes, base_sha: str):
    require(re.fullmatch(r"[0-9a-f]{40}", base_sha) is not None, "invalid exact base SHA")
    check = subprocess.run(["git", "cat-file", "-e", f"{base_sha}:{relative}"],
                           cwd=root, capture_output=True, timeout=15)
    if check.returncode != 0:
        # Distinguish a nonexistent new version archive from an invalid commit.
        valid = subprocess.run(["git", "cat-file", "-t", base_sha],
                               cwd=root, capture_output=True, text=True, timeout=15)
        require(valid.returncode == 0 and valid.stdout.strip() == "commit",
                "expected base commit unavailable")
        return "new-path"
    previous = subprocess.run(["git", "show", f"{base_sha}:{relative}"], cwd=root,
                              capture_output=True, check=True, timeout=30).stdout
    require(previous == committed,
            "duplicate-version/path overwrite: base already has different archive bytes")
    return "unchanged-existing-path"


def run_self_test(root: Path):
    source_manifest = json.loads((root / "manifest.json").read_text(encoding="utf-8"))
    app_id = (root / "APP_ID.txt").read_text(encoding="utf-8")
    version = source_manifest.get("version_name") or source_manifest["version"]
    archive_path = root / "release" / f"kleinanzeigen-renewal-chrome-v{version}.zip"
    if archive_path.is_file():
        current = archive_path.read_bytes()
    else:
        # KAR-46's isolated 1.23.25 future-PATCH fixture deliberately does
        # not publish/commit a new ZIP. Execute the negative verifier on a
        # real ephemeral package built from that fixture, without making a
        # false claim that release/ already contains a distributable.
        require(os.environ.get("KAR46_SYNTHETIC_PATCH") == "1",
                "current archive missing outside the nonpublishing synthetic PATCH fixture")
        with tempfile.TemporaryDirectory(prefix="kar48-synthetic-") as tmp:
            subprocess.run([sys.executable, "scripts/package.py", tmp], cwd=root,
                           capture_output=True, text=True, check=True, timeout=90)
            current = (Path(tmp) / archive_path.name).read_bytes()
    assert validate_bytes(current, current, source_manifest, app_id)["bytes"] > 1000
    negatives: list[tuple[str, bytes, dict, str]] = [
        ("tampered-bytes", current + b"bad", source_manifest, app_id),
        ("truncated", current[:72], source_manifest, app_id),
        ("wrong-app-id", current, source_manifest, "Chrome Extension ID: " + "a" * 32),
        ("changed-key", current, {**source_manifest, "key": base64.b64encode(b"foreign key").decode()}, app_id),
        ("changed-permission", current, {**source_manifest, "permissions": ["storage"]}, app_id),
        ("changed-host", current, {**source_manifest, "host_permissions": []}, app_id),
        ("mismatched-version", current, {**source_manifest, "version": "1.23.999"}, app_id),
    ]
    for label, candidate, m, a in negatives:
        try:
            validate_bytes(candidate, current, m, a)
        except (ValueError, KeyError):
            continue
        raise AssertionError("KAR-48 negative case was accepted: " + label)
    # Mutation tests for duplicated entries, unsafe path and missing files.
    for label, extra in [("duplicate", "manifest.json"), ("path-escape", "../escape.js")]:
        stream = io.BytesIO()
        with zipfile.ZipFile(stream, "w") as z:
            z.writestr("manifest.json", json.dumps(source_manifest))
            z.writestr("APP_ID.txt", app_id)
            z.writestr(extra, "tampered")
        try:
            verify_structure(stream.getvalue(), source_manifest)
        except ValueError:
            continue
        raise AssertionError("KAR-48 malformed ZIP accepted: " + label)
    stream = io.BytesIO()
    with zipfile.ZipFile(stream, "w") as z:
        z.writestr("APP_ID.txt", app_id)
    try:
        verify_structure(stream.getvalue(), source_manifest)
    except ValueError:
        pass
    else:
        raise AssertionError("KAR-48 missing manifest accepted")
    print(f"PASS KAR-48 ZIP verifier self-test: authentic archive + {len(negatives)+3} fail-closed mutations")


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--self-test", action="store_true")
    p.add_argument("--base-sha", help="Exact pre-merge base commit for duplicate-path protection")
    p.add_argument("--report", type=Path)
    opts = p.parse_args()
    if opts.self_test:
        run_self_test(ROOT)
        return
    manifest = json.loads((ROOT / "manifest.json").read_text(encoding="utf-8"))
    version = manifest.get("version_name") or manifest["version"]
    require(re.fullmatch(r"[0-9]+\.[0-9]+\.[0-9]+(?:_c[0-9]+)?", version) is not None,
            "unsafe/unsupported package version")
    relative = f"release/kleinanzeigen-renewal-chrome-v{version}.zip"
    archive = ROOT / relative
    require(archive.is_file(), "versioned Chrome ZIP missing from committed release/")
    data = archive.read_bytes()
    with tempfile.TemporaryDirectory(prefix="kar48-rebuild-") as tmp:
        subprocess.run([sys.executable, "scripts/package.py", tmp], cwd=ROOT, check=True,
                       stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=90)
        rebuilt = Path(tmp) / archive.name
        require(rebuilt.is_file(), "packager did not produce expected versioned Chrome ZIP")
        generated = rebuilt.read_bytes()
    app_id = (ROOT / "APP_ID.txt").read_text(encoding="utf-8")
    result = validate_bytes(data, generated, manifest, app_id)
    if opts.base_sha:
        result["baseCollision"] = reject_base_collision(ROOT, relative, data, opts.base_sha)
    result.update({"schema": 1, "proof": "exact-committed-zip-clean-rebuild",
                   "archive": relative, "version": version,
                   "sourceHead": subprocess.check_output(["git", "rev-parse", "HEAD"],
                       cwd=ROOT, text=True, timeout=15).strip(),
                   "githubRunId": os.environ.get("GITHUB_RUN_ID"),
                   "githubRunAttempt": os.environ.get("GITHUB_RUN_ATTEMPT")})
    require(re.fullmatch(r"[0-9a-f]{40}", result["sourceHead"]) is not None,
            "source SHA unavailable")
    if opts.report:
        opts.report.parent.mkdir(parents=True, exist_ok=True)
        opts.report.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    print("PASS KAR-48 exact committed Chrome ZIP verified against clean rebuild: "
          + json.dumps(result, sort_keys=True))


if __name__ == "__main__":
    try:
        main()
    except (OSError, ValueError, subprocess.CalledProcessError, subprocess.TimeoutExpired) as exc:
        print("KAR48_ZIP_PARITY_FAILED:", str(exc), file=sys.stderr)
        sys.exit(1)
