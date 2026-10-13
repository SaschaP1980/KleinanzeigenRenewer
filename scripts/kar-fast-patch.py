#!/usr/bin/env python3
"""KAR-58: guarded branchless one-shot PATCH + ZIP, never GitHub Release/tag."""
from __future__ import annotations

from contextlib import contextmanager
import importlib.util
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
import tempfile
import time

ROOT = Path(__file__).resolve().parent.parent
HEX = re.compile(r"[a-f0-9]{40}")
ISSUE = re.compile(r"[1-9][0-9]*")
MARKER = re.compile(r"ci\(KAR-([1-9][0-9]*)\): fast PATCH base=([a-f0-9]{40})")
TIMINGS = {}

spec = importlib.util.spec_from_file_location("kar52_shared", ROOT / "scripts/kar-atomic-patch.py")
shared = importlib.util.module_from_spec(spec)
spec.loader.exec_module(shared)
META = shared.META


def require(value, reason):
    if not value:
        raise ValueError("KAR58_FAST_FAILED: " + reason)


def run(*args, timeout=60, binary=False):
    done = subprocess.run(args, cwd=ROOT, capture_output=True, check=True,
                          text=not binary, timeout=timeout)
    return done.stdout if binary else done.stdout.strip()


def git(*args):
    return run("git", *args)


def remote(branch="main"):
    value = run("git", "ls-remote", "origin", "refs/heads/" + branch)
    require(bool(value), "remote branch missing")
    return value.split()[0]


@contextmanager
def timed(name):
    started = time.monotonic()
    try:
        yield
    finally:
        elapsed = round(time.monotonic() - started, 3)
        TIMINGS[name] = elapsed
        print("KAR58_FAST_TIMING " + json.dumps({"stage": name, "seconds": elapsed}), flush=True)


def marker_contract(subject, changed, issue_state, canonical_count, expected_parent=None):
    match = MARKER.fullmatch(subject)
    require(match is not None, "wrong explicit fast marker subject")
    issue, base = int(match.group(1)), match.group(2)
    require(issue_state == "open" and canonical_count == 1, "issue/comment authorization missing")
    require(not changed, "marker must be a content-empty commit")
    if expected_parent is not None:
        require(base == expected_parent, "marker base/parent mismatch")
    return issue, base


def authorized_gha():
    require(os.environ.get("GITHUB_EVENT_NAME") == "push", "Fast write requires push event")
    require(os.environ.get("GITHUB_REF_NAME") == "main", "Fast event must be main")
    require(os.environ.get("GITHUB_REPOSITORY") == "SaschaP1980/KleinanzeigenRenewer",
            "unexpected repository")
    sha = os.environ.get("GITHUB_SHA")
    require(isinstance(sha, str) and HEX.fullmatch(sha), "missing exact event SHA")
    require(git("rev-parse", "HEAD") == sha and remote() == sha,
            "exact source HEAD/main race")
    require(not git("status", "--porcelain"), "dirty checkout")
    return sha


def read_authorization(subject, marker):
    parsed = MARKER.fullmatch(subject)
    require(parsed is not None, "invalid marker")
    issue = int(parsed.group(1))
    require(issue <= 999999999, "oversized issue number")
    data = json.loads(run("gh", "api", f"repos/SaschaP1980/KleinanzeigenRenewer/issues/{issue}"))
    comments = json.loads(run("gh", "api",
                              f"repos/SaschaP1980/KleinanzeigenRenewer/issues/{issue}/comments?per_page=100"))
    canonical = [c for c in comments if "<!-- KAR-ROLLING-COMMENT -->" in (c.get("body") or "")]
    issue_num, base = marker_contract(subject, "", data.get("state"), len(canonical),
                                      git("rev-parse", "HEAD^"))
    require(data.get("title", "").startswith(f"[KAR-{issue_num}]"),
            "unmatched issue identity")
    require(not data.get("pull_request"), "issue must not be a pull request")
    content = canonical[0]["body"]
    require(f"**Issue:** [KAR-{issue_num}]" in content and
            f"**Base main:** `{base}`" in content and
            "**Agent-State:** ACTIVE" in content and
            "**Canonical comment ID:** " + str(canonical[0]["id"]) in content,
            "canonical owner authorization missing")
    require("**Current phase:** FAST TRIGGER" in content,
            "canonical Fast trigger phase missing")
    require(git("rev-parse", "HEAD") == marker, "marker checkout changed")
    return issue_num, base


def plan():
    with timed("authorization_preflight"):
        marker = authorized_gha()
        subject = git("log", "-1", "--pretty=%s")
        require(not git("diff-tree", "--no-commit-id", "--name-only", "-r", "HEAD"),
                "fast marker must have an empty file diff")
        require(git("rev-parse", "HEAD^{tree}") == git("rev-parse", "HEAD^^{tree}"),
                "fast marker must preserve exact parent tree")
        issue, base = read_authorization(subject, marker)
    with timed("version_planning"):
        meta = {p: json.loads((ROOT / p).read_text(encoding="utf-8")) for p in META}
        current, next_version, future = shared.metadata_plan(meta)
        old_path = ROOT / "release" / f"kleinanzeigen-renewal-chrome-v{current}.zip"
        new_path = ROOT / "release" / f"kleinanzeigen-renewal-chrome-v{next_version}.zip"
        require(old_path.is_file() and not new_path.exists(), "old ZIP missing / target ZIP collision")
        prev = run("git", "show", base + ":release/" + old_path.name, binary=True)
        require(prev == old_path.read_bytes(), "previous archive differs from pinned base")
        collision = subprocess.run(["git", "cat-file", "-e",
                                    f"{base}:release/{new_path.name}"],
                                   cwd=ROOT, capture_output=True, timeout=15)
        require(collision.returncode != 0, "next ZIP already exists in base")
    return {"issue": issue, "baseSha": base, "markerSha": marker,
            "currentVersion": current, "nextVersion": next_version,
            "oldPath": old_path, "newPath": new_path,
            "oldDigest": shared.digest(prev)}, future


def build(data, future):
    with timed("zip_packaging"):
        for p in META:
            (ROOT / p).write_text(json.dumps(future[p], ensure_ascii=False, indent=2) + "\n",
                                  encoding="utf-8")
        with tempfile.TemporaryDirectory(prefix="kar58-fast-") as temp:
            run(sys.executable, "scripts/package.py", temp, timeout=120)
            candidate = Path(temp) / data["newPath"].name
            require(candidate.is_file(), "versioned Chrome ZIP not produced")
            shutil.copyfile(candidate, data["newPath"])
    with timed("zip_identity_parity"):
        require(shared.digest(data["oldPath"].read_bytes()) == data["oldDigest"],
                "previous released ZIP mutated")
        run(sys.executable, "scripts/verify_committed_chrome_zip.py",
            "--base-sha", data["baseSha"], timeout=120)
    with timed("full_safety_coverage_gate"):
        run("bash", "scripts/coverage-gate.sh", timeout=480)
    with timed("atomic_main_commit_and_push"):
        require(remote() == data["markerSha"] and
                git("rev-parse", "HEAD") == data["markerSha"],
                "stale main ref prior to push")
        changes = set(git("diff", "--name-only").splitlines())
        require(changes == set(META), "modified tracked files outside four metadata paths")
        extras = set(git("ls-files", "--others", "--exclude-standard").splitlines())
        require(not extras, "untracked files outside approved ZIP")
        path = "release/" + data["newPath"].name
        require(subprocess.run(["git", "check-ignore", "-q", path],
                               cwd=ROOT, timeout=15).returncode == 0,
                "ZIP ignore policy changed")
        run("git", "add", "-f", "--", *META, path)
        expected = set(META) | {path}
        require(set(git("diff", "--cached", "--name-only").splitlines()) == expected,
                "non-atomic staged file scope")
        require(remote() == data["markerSha"], "main ref changed before fast push")
        run("git", "config", "user.name", "github-actions[bot]")
        run("git", "config", "user.email", "41898282+github-actions[bot]@users.noreply.github.com")
        run("git", "commit", "-m",
            f"build(KAR-{data['issue']}): fast PATCH {data['nextVersion']} plus ZIP")
        head = git("rev-parse", "HEAD")
        require(git("rev-parse", "HEAD^") == data["markerSha"] and
                set(git("diff-tree", "--no-commit-id", "--name-only", "-r", head)
                    .splitlines()) == expected,
                "committed five-path scope/parent mismatch")
        require(remote() == data["markerSha"], "main ref drift before final push")
        run("git", "push", "origin", "HEAD:refs/heads/main", timeout=90)
        require(remote() == head, "final fast main SHA not observed")
    with timed("explicit_final_sha_ci_dispatch"):
        require(remote() == head, "stale main before final CI dispatch")
        # GITHUB_TOKEN-triggered normal push events are suppressed. workflow_dispatch is
        # specifically exempt; actions:write is scoped to this authenticated job.
        run("gh", "workflow", "run", "kar-ci.yml", "--ref", "main", timeout=45)
        print("KAR58_FAST_FINAL_CI_DISPATCHED " +
              json.dumps({"expectedHead": head, "workflow": "kar-ci.yml"}), flush=True)
    print("KAR58_FAST_BUILDER_GREEN " + json.dumps({
        "mainSha": head, "baseSha": data["baseSha"], "markerSha": data["markerSha"],
        "version": data["nextVersion"], "zipSha256": shared.digest(data["newPath"].read_bytes()),
        "zipBytes": data["newPath"].stat().st_size, "timings": TIMINGS}, sort_keys=True),
        flush=True)


def main():
    import argparse
    p = argparse.ArgumentParser()
    p.add_argument("--mode", choices=["plan", "build"], required=True)
    options = p.parse_args()
    data, future = plan()
    if options.mode == "build":
        build(data, future)
    else:
        print("KAR58_FAST_PLAN_GREEN " + json.dumps({
            "baseSha": data["baseSha"], "markerSha": data["markerSha"],
            "currentVersion": data["currentVersion"], "nextVersion": data["nextVersion"],
            "issue": data["issue"], "timings": TIMINGS}, sort_keys=True), flush=True)


if __name__ == "__main__":
    try:
        main()
    except (ValueError, KeyError, OSError, subprocess.CalledProcessError,
            subprocess.TimeoutExpired) as exc:
        print("KAR58_FAST_FAILED: " + str(exc), file=sys.stderr, flush=True)
        sys.exit(1)
