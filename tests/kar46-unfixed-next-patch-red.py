#!/usr/bin/env python3
"""KAR-46: execute the old *real* test on isolated 1.23.24 then 1.23.25."""
from __future__ import annotations

import io
import json
import os
from pathlib import Path
import re
import subprocess
import tarfile
import tempfile

ROOT = Path(__file__).resolve().parents[1]
UNFIXED_MAIN = "e19e66536c3630a34ff669a999f1a564f051330d"
FILES = (
    "tests/v016-contract.cjs",
    "manifest.json",
    "package.json",
    "package-lock.json",
    "release/release-spec.json",
)


def require(ok, reason):
    if not ok:
        raise RuntimeError(reason)


def main():
    # Full Git history is fetched by the Work-PR validation checkout.
    commit_type = subprocess.check_output(
        ["git", "cat-file", "-t", UNFIXED_MAIN],
        cwd=ROOT, text=True, timeout=20,
    ).strip()
    require(commit_type == "commit", "Pinned unfixed basis not available as a commit")
    with tempfile.TemporaryDirectory(prefix="kar46-unfixed-patch-red-") as tmp:
        # Execute the *real* test-only bridge used by official npm test.
        # Neither the tracked source nor the Chrome package has a flat
        # background.js: the original bridge maps it to src/background/.
        staged = Path(tmp) / "unfixed-source"
        staged.mkdir()
        archive_bytes = subprocess.check_output(
            ["git", "archive", "--format=tar", UNFIXED_MAIN],
            cwd=ROOT, timeout=60,
        )
        with tarfile.open(fileobj=io.BytesIO(archive_bytes), mode="r:") as archive:
            archive.extractall(staged, filter="data")
        require((staged / "tests/v12222-vm-legacy-bridge.cjs").is_file(),
                "Pinned original legacy bridge missing; cannot run a real v016 test")
        require((staged / "scripts/source-layout.json").is_file(),
                "Pinned original legacy path map missing")
        require((staged / "src/background/background.js").is_file(),
                "Pinned original background source missing")
        test_env = os.environ.copy()
        test_env["NODE_OPTIONS"] = "--require ./tests/v12222-vm-legacy-bridge.cjs"

        source = (staged / "tests/v016-contract.cjs").read_text(encoding="utf-8")
        require(re.search(r"\]\.includes\(manifest\.version\)", source) is not None,
                "Unfixed v016 still expected to contain the strict historical allowlist")
        metadata = {}
        for name in FILES[1:]:
            metadata[name] = json.loads((staged / name).read_text(encoding="utf-8"))
        version = "1.23.24"
        require(all(metadata[name]["version"] == version for name in FILES[1:]),
                "Unfixed baseline four release metadata versions must match exactly")
        original = subprocess.run(
            ["node", "tests/v016-contract.cjs"],
            cwd=staged, env=test_env, capture_output=True, text=True, timeout=30,
        )
        require(original.returncode == 0 and "v0.1.6 contract tests passed" in original.stdout,
                "Pinned original v016 does not pass with its own 1.23.24 manifest: "
                + original.stdout[-700:] + original.stderr[-700:])

        next_version = "1.23.25"
        for item in metadata.values():
            item["version"] = next_version
        metadata["package.json"]["displayVersion"] = next_version
        metadata["package-lock.json"]["packages"][""]["version"] = next_version
        metadata["release/release-spec.json"]["packageVersion"] = next_version
        for name, item in metadata.items():
            (staged / name).write_text(
                json.dumps(item, ensure_ascii=False, indent=2) + "\n",
                encoding="utf-8",
            )
        require(all(
            json.loads((staged / name).read_text(encoding="utf-8"))["version"] == next_version
            for name in FILES[1:]
        ), "Synthetic next PATCH metadata must be internally consistent")
        unfixed = subprocess.run(
            ["node", "tests/v016-contract.cjs"],
            cwd=staged, env=test_env, capture_output=True, text=True, timeout=30,
        )
        require(unfixed.returncode != 0, "Unfixed baseline unexpectedly accepted 1.23.25")
        require("AssertionError" in unfixed.stderr
                and re.search(r"v016-contract\.cjs:6(?::\d+)?", unfixed.stderr),
                "Unfixed RED was caused by an unrelated runtime/fixture error, not the "
                "strict version allowlist at v016:6: " + unfixed.stderr[-1200:])
    print("PASS KAR-46 executed unfixed RED proof: exact main "
          + UNFIXED_MAIN + " original v016 GREEN on 1.23.24; isolated consistent "
          "1.23.25 RED at original strict version guard line 6")


if __name__ == "__main__":
    main()
