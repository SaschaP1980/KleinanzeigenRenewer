#!/usr/bin/env python3
"""KAR-46: execute the old *real* test on isolated 1.23.24 then 1.23.25."""
from __future__ import annotations

import json
from pathlib import Path
import re
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[1]
UNFIXED_MAIN = "e19e66536c3630a34ff669a999f1a564f051330d"
FILES = (
    "tests/v016-contract.cjs",
    "background.js",
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
        staged = Path(tmp)
        for relative_path in FILES:
            blob = subprocess.check_output(
                ["git", "show", f"{UNFIXED_MAIN}:{relative_path}"],
                cwd=ROOT, timeout=30,
            )
            target = staged / relative_path
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(blob)
        source = (staged / "tests/v016-contract.cjs").read_text(encoding="utf-8")
        require(re.search(r"\]\.includes\(manifest\.version\)", source) is not None,
                "Unfixed v016 still expected to contain the strict historical allowlist")
        metadata = {}
        for name in FILES[2:]:
            metadata[name] = json.loads((staged / name).read_text(encoding="utf-8"))
        version = "1.23.24"
        require(all(metadata[name]["version"] == version for name in FILES[2:]),
                "Unfixed baseline four release metadata versions must match exactly")
        original = subprocess.run(
            ["node", "tests/v016-contract.cjs"],
            cwd=staged, capture_output=True, text=True, timeout=30,
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
            for name in FILES[2:]
        ), "Synthetic next PATCH metadata must be internally consistent")
        unfixed = subprocess.run(
            ["node", "tests/v016-contract.cjs"],
            cwd=staged, capture_output=True, text=True, timeout=30,
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
