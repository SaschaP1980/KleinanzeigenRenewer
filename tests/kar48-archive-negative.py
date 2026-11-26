#!/usr/bin/env python3
"""Independent, executable KAR-48 negative mutation proof in an isolated Git repo."""
from pathlib import Path
import json
import contextlib
import io
import os
import subprocess
import sys
import tempfile

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from scripts import verify_committed_chrome_zip as z  # noqa: E402


def command(argv, cwd):
    return subprocess.check_output(argv, cwd=cwd, timeout=20).decode().strip()


def require(ok, message):
    if not ok:
        raise AssertionError("KAR48_ARCHIVE_NEGATIVE_FAILED: " + message)


def rejected(action, expected):
    try:
        action()
    except ValueError as error:
        require(expected in str(error), "unrelated failure: " + str(error))
        return
    raise AssertionError("Invalid archive or version collision accepted: " + expected)


def main():
    original_root = z.ROOT
    with tempfile.TemporaryDirectory(prefix="kar48-archive-negatives-") as folder:
        fixture = Path(folder)
        (fixture / "manifest.json").write_bytes((ROOT / "manifest.json").read_bytes())
        (fixture / "APP_ID.txt").write_bytes((ROOT / "APP_ID.txt").read_bytes())
        # Real main() must fail closed before it tries packaging a missing release.
        try:
            z.ROOT = fixture
            old_argv = sys.argv
            try:
                sys.argv = ["verify_committed_chrome_zip.py"]
                rejected(z.main, "missing from committed release/")
            finally:
                sys.argv = old_argv
        finally:
            z.ROOT = original_root
        # Exercise the explicit synthetic mode without any archive. It cannot
        # authorize parity, generate a report or mask an existing archive.
        old_root, old_argv = z.ROOT, sys.argv
        old_env = os.environ.pop("KAR46_SYNTHETIC_PATCH", None)
        try:
            z.ROOT = fixture
            sys.argv = ["verify_committed_chrome_zip.py", "--self-test"]
            rejected(z.main, "current archive missing")
            sys.argv = ["verify_committed_chrome_zip.py", "--synthetic-fixture"]
            rejected(z.main, "requires self-test only")
            sys.argv = ["verify_committed_chrome_zip.py", "--self-test", "--synthetic-fixture", "--report", str(fixture / "fake-proof.json")]
            rejected(z.main, "requires self-test only")
            require(not (fixture / "fake-proof.json").exists(), "fixture fabricated a parity report")
            sys.argv = ["verify_committed_chrome_zip.py", "--self-test", "--synthetic-fixture"]
            output = io.StringIO()
            with contextlib.redirect_stdout(output):
                z.main()
            require("synthetic fixture (not committed ZIP proof) + 10 fail-closed mutations" in output.getvalue(), "fixture output must not claim authentic archive proof")
            sys.argv = ["verify_committed_chrome_zip.py"]
            rejected(z.main, "missing from committed release/")
            version = z.checked_archive_version(json.loads((fixture / "manifest.json").read_text()))
            actual = fixture / "release" / f"kleinanzeigen-renewal-chrome-v{version}.zip"
            actual.parent.mkdir(exist_ok=True)
            actual.write_bytes(b"not a valid archive")
            sys.argv = ["verify_committed_chrome_zip.py", "--self-test", "--synthetic-fixture"]
            rejected(z.main, "cannot replace an existing archive")
            actual.unlink()
        finally:
            z.ROOT, sys.argv = old_root, old_argv
            if old_env is not None:
                os.environ["KAR46_SYNTHETIC_PATCH"] = old_env
        print("PASS KAR-210 explicit synthetic verifier fixture and strict actual archive separation")
        relative = "release/kleinanzeigen-renewal-chrome-v1.23.24.zip"
        archive = fixture / relative
        archive.parent.mkdir(parents=True, exist_ok=True)
        archive.write_bytes(b"isolated committed versioned archive")
        command(["git", "init", "-q"], fixture)
        command(["git", "add", relative], fixture)
        command(["git", "-c", "user.name=KAR48",
                 "-c", "user.email=kar48@example.test",
                 "commit", "-qm", "archive fixture"], fixture)
        sha = command(["git", "rev-parse", "HEAD"], fixture)
        original = archive.read_bytes()
        require(z.reject_base_collision(fixture, relative, original, sha) ==
                "unchanged-existing-path", "identical existing archive rejected")
        require(z.reject_base_collision(fixture, "release/new-version.zip", original, sha) ==
                "new-path", "a previously unused archive path rejected")
        rejected(lambda: z.reject_base_collision(fixture, relative,
                                                 original + b"tampered", sha),
                 "duplicate-version/path overwrite")
        rejected(lambda: z.reject_base_collision(fixture, relative, original, "0" * 40),
                 "expected base commit unavailable")
    print("PASS KAR-48 missing archive and collision negatives: 3/3")


if __name__ == "__main__":
    main()
