#!/usr/bin/env python3
"""KAR-58: isolated Fast marker policy, negative authorization tests and workflow contract."""
import importlib.util
from pathlib import Path

root = Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location("kar58fast", root / "scripts/kar-fast-patch.py")
fast = importlib.util.module_from_spec(spec)
spec.loader.exec_module(fast)
sha = "a" * 40
good = "ci(KAR-58): fast PATCH base=" + sha
assert fast.marker_contract(good, "", "open", 1, sha) == (58, sha)
negatives = [
    (good, "manifest.json", "open", 1, sha),
    (good, "", "closed", 1, sha),
    (good, "", "open", 0, sha),
    (good, "", "open", 2, sha),
    (good, "", "open", 1, "b" * 40),
    ("ci(KAR-57): fast PATCH base=" + sha, "", "open", 1, sha),
    ("ci(KAR-58): atomic PATCH base=" + sha, "", "open", 1, sha),
    ("ci(KAR-58): fast PATCH base=" + "b" * 40, "", "open", 1, sha),
    (good + " trailing", "", "open", 1, sha),
    ("build(KAR-58): fast PATCH base=" + sha, "", "open", 1, sha),
    ("ci(KAR-58): fast PATCH base=not-sha", "", "open", 1, sha),
]
# A foreign issue is syntactically valid but rejected by the exact issue/comment API gate.
for subject, files, state, count, parent in negatives:
    try:
        fast.marker_contract(subject, files, state, count, parent)
    except ValueError as exc:
        assert "KAR58_FAST_FAILED" in str(exc), (subject, exc)
    else:
        raise AssertionError("Fast marker falsely accepted: " + subject)

workflow = (root / ".github/workflows/kar-fast-patch.yml").read_text()
ci = (root / ".github/workflows/kar-ci.yml").read_text()
script = (root / "scripts/kar-fast-patch.py").read_text()
assert "branches: [main]" in workflow
assert "actions: write" in workflow and "contents: write" in workflow
assert "issues: read" in workflow
assert "github.event_name == 'push'" in workflow
assert "fast PATCH base=" in workflow
assert "python3 scripts/kar-fast-patch.py --mode build" in workflow
assert "scripts/kar-atomic-patch.py" in script and "shared.metadata_plan(meta)" in script
assert "verify_committed_chrome_zip.py" in script
assert 'run("bash", "scripts/coverage-gate.sh"' in script
assert '"HEAD:refs/heads/main"' in script and '"push", "origin"' in script
assert 'run("gh", "workflow", "run", "kar-ci.yml", "--ref", "main"' in script
assert "workflow_dispatch:" in ci and "persist-credentials: false" in ci
assert "unzip -t" in ci and "verify_committed_chrome_zip.py" in ci
assert "gh release create" not in script and "gh release create" not in workflow
assert "force" not in script
print("PASS KAR-58 Fast branchless atomic PATCH contract: " + str(len(negatives)) +
      " fail-closed marker negatives and exact main CI dispatch; no ZIP or git writes")
