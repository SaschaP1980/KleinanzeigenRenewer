#!/usr/bin/env python3
"""Test-first KAR-48: execute unfixed (original main) archive-boundary RED."""
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[1]
BASE = "c63e9a4502df23d6a934f59555d99cce9bbf4ad2"


def old(path):
    return subprocess.check_output(["git", "show", f"{BASE}:{path}"],
                                   cwd=ROOT, text=True, timeout=30)


def require(ok, message):
    if not ok:
        raise AssertionError("KAR48_UNFIXED_ARCHIVE_RED_FAILED: " + message)


def main():
    previous_pr = old(".github/workflows/kar-work-pr.yml")
    previous_main = old(".github/workflows/kar-ci.yml")
    current_pr = (ROOT / ".github/workflows/kar-work-pr.yml").read_text()
    current_main = (ROOT / ".github/workflows/kar-ci.yml").read_text()
    # Original code used independently repackaged, potentially different bytes;
    # the historical archived distributable was not the subject of E2E.
    require('python3 scripts/package.py "$RUNNER_TEMP/kar-work-pr-e2e-build"' in previous_pr,
            "Original Work E2E expected to use a fresh temporary build")
    require('ZIP="$RUNNER_TEMP/kar-work-pr-e2e-build/' in previous_pr,
            "Original Work E2E ZIP path not the independently built output")
    require('ZIP="$RUNNER_TEMP/kar-ci-build/' in previous_main,
            "Original main E2E ZIP path not the independently built output")
    require("verify_committed_chrome_zip.py" not in previous_pr
            and "verify_committed_chrome_zip.py" not in previous_main,
            "Original archive proof is not actually unfixed")
    require('E2E_CHROME_ZIP="$PWD/release/' in current_pr
            and 'python3 scripts/verify_committed_chrome_zip.py --base-sha' in current_pr,
            "Fixed Work E2E does not verify committed archive")
    require('ZIP="$PWD/release/' in current_main
            and "python3 scripts/verify_committed_chrome_zip.py --report" in current_main,
            "Fixed main E2E does not verify committed archive")
    print("PASS KAR-48 pinned unfixed archive boundary RED: original "
          + BASE + " Work/main ran on independently built ZIP; fixed workflows "
          "validate and browser-test exact committed release archive")


if __name__ == "__main__":
    main()
