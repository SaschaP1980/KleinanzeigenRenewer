#!/usr/bin/env python3
"""KAR-52 reusable, SHA-guarded, explicit Work-only PATCH ZIP primitive."""
import argparse
import copy
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
import tempfile

ROOT = Path(__file__).resolve().parent.parent
META = ("manifest.json", "package.json", "package-lock.json", "release/release-spec.json")
VERSION = re.compile(r"^1\.23\.(0|[1-9][0-9]*)$")
HEX = re.compile(r"^[a-f0-9]{40}$")
ISSUE = re.compile(r"^[1-9][0-9]*$")


def require(ok, why):
    if not ok:
        raise ValueError("KAR52_PATCH_FAILED: " + why)


def digest(data):
    return hashlib.sha256(data).hexdigest()


def successor(version):
    require(isinstance(version, str) and VERSION.fullmatch(version),
            "regular 1.23.x PATCH required, no correction or minor jump")
    patch = int(version.split(".")[2])
    require(22 <= patch < 2147483647, "PATCH outside safe range")
    return "1.23." + str(patch + 1)


def metadata_plan(meta):
    require(set(meta) == set(META) and all(isinstance(meta[p], dict) for p in META),
            "four JSON metadata objects required")
    current = meta["manifest.json"].get("version")
    next_version = successor(current)
    require(all(meta[p].get("version") == current for p in META),
            "four-file version mismatch")
    require(meta["package.json"].get("displayVersion") == current, "displayVersion mismatch")
    require(meta["package-lock.json"].get("packages", {}).get("", {}).get("version") == current,
            "package-lock root version mismatch")
    require(meta["release/release-spec.json"].get("packageVersion") == current,
            "release-spec packageVersion mismatch")
    spec = meta["release/release-spec.json"]
    require(spec.get("directBasis") == "1.23.20_c1" and
            spec.get("nextPlannedBuild") == "1.24.0", "basis/next-minor policy drift")
    future = copy.deepcopy(meta)
    for p in META:
        future[p]["version"] = next_version
    future["package.json"]["displayVersion"] = next_version
    future["package-lock.json"]["packages"][""]["version"] = next_version
    future["release/release-spec.json"]["packageVersion"] = next_version
    return current, next_version, future


def run(*args, binary=False, timeout=30):
    result = subprocess.run(args, cwd=ROOT, capture_output=True, check=True,
                            timeout=timeout, text=not binary)
    return result.stdout if binary else result.stdout.strip()


def git(*args):
    return run("git", *args)


def remote(branch):
    line = run("git", "ls-remote", "origin", "refs/heads/" + branch)
    require(bool(line), "missing remote " + branch)
    return line.split()[0]


def assert_lease(issue, branch, head, base, clean=True):
    require(ISSUE.fullmatch(str(issue)) and int(issue) <= 999999999,
            "invalid issue number")
    require(branch == "work/KAR-" + str(issue), "foreign Work branch")
    require(HEX.fullmatch(head) and HEX.fullmatch(base), "invalid exact SHA")
    require(git("rev-parse", "HEAD") == head, "checkout SHA mismatch")
    require(remote(branch) == head, "stale Work SHA")
    require(remote("main") == base, "stale main SHA")
    require(git("merge-base", base, "HEAD") == base, "pinned main not ancestor")
    if clean:
        require(not git("status", "--porcelain"), "nonclean Work source")


def collect(issue, branch, head, base):
    assert_lease(issue, branch, head, base)
    meta = {p: json.loads((ROOT / p).read_text(encoding="utf-8")) for p in META}
    current, future, next_meta = metadata_plan(meta)
    old = ROOT / "release" / ("kleinanzeigen-renewal-chrome-v" + current + ".zip")
    nxt = ROOT / "release" / ("kleinanzeigen-renewal-chrome-v" + future + ".zip")
    require(old.is_file(), "current release ZIP missing")
    require(not nxt.exists(), "next version archive already exists")
    prev = run("git", "show", base + ":release/" + old.name, binary=True)
    require(prev == old.read_bytes(), "current archived ZIP differs from main")
    clash = subprocess.run(["git", "cat-file", "-e", base + ":release/" + nxt.name],
                           cwd=ROOT, capture_output=True, timeout=15)
    require(clash.returncode != 0, "next version collides in main")
    return {
        "issue": int(issue), "branch": branch, "sourceSha": head, "mainSha": base,
        "currentVersion": current, "nextVersion": future,
        "oldZip": old.relative_to(ROOT).as_posix(), "newZip": nxt.relative_to(ROOT).as_posix(),
        "oldZipSha256": digest(prev), "fivePaths": sorted([*META, nxt.relative_to(ROOT).as_posix()])
    }, next_meta


def authorized_push(subject, changed_files, issue, base):
    """Require an explicit one-shot, empty Work commit pinned to exact main."""
    require(subject == "ci(KAR-%s): atomic PATCH base=%s" % (issue, base),
            "wrong push marker / issue or pinned main SHA")
    require(not changed_files, "push trigger commit must be empty")


def assert_build_entry(plan):
    event = os.environ.get("GITHUB_EVENT_NAME")
    require(event in ("workflow_dispatch", "push"),
            "write requires explicit workflow_dispatch or guarded marker push")
    require(os.environ.get("GITHUB_REPOSITORY") == "SaschaP1980/KleinanzeigenRenewer",
            "unexpected builder repository")
    require(os.environ.get("GITHUB_REF_NAME") == plan["branch"] and
            os.environ.get("GITHUB_SHA") == plan["sourceSha"],
            "dispatch/push Work ref and exact event SHA must match")
    if event == "push":
        authorized_push(git("log", "-1", "--pretty=%s"),
                        git("diff-tree", "--no-commit-id", "--name-only", "-r", "HEAD"),
                        plan["issue"], plan["mainSha"])


def build(plan, future):
    assert_build_entry(plan)
    # Event, branch and immutable triggering SHA were checked above.
    old = ROOT / plan["oldZip"]
    new = ROOT / plan["newZip"]
    for p in META:
        (ROOT / p).write_text(json.dumps(future[p], ensure_ascii=False, indent=2) + "\n",
                              encoding="utf-8")
    with tempfile.TemporaryDirectory(prefix="kar-atomic-") as temp:
        run(sys.executable, "scripts/package.py", temp, timeout=120)
        candidate = Path(temp) / new.name
        require(candidate.is_file(), "canonical package missing")
        shutil.copyfile(candidate, new)
    require(digest(old.read_bytes()) == plan["oldZipSha256"], "old ZIP mutated")
    run(sys.executable, "scripts/verify_committed_chrome_zip.py", "--base-sha",
        plan["mainSha"], timeout=120)
    run("bash", "scripts/coverage-gate.sh", timeout=480)
    assert_lease(plan["issue"], plan["branch"], plan["sourceSha"], plan["mainSha"],
                 clean=False)
    changed = {x for x in git("diff", "--name-only").splitlines() if x}
    require(changed == set(META), "unapproved changed tracked paths " + repr(changed))
    untracked = {x for x in git("ls-files", "--others", "--exclude-standard").splitlines() if x}
    require(not untracked, "unapproved untracked files " + repr(untracked))
    require(subprocess.run(["git", "check-ignore", "-q", plan["newZip"]],
                           cwd=ROOT, timeout=15).returncode == 0, "ZIP ignore policy drift")
    run("git", "add", "--force", "--", *META, plan["newZip"])
    staged = {x for x in git("diff", "--cached", "--name-only").splitlines() if x}
    require(staged == set(plan["fivePaths"]), "staged paths not exact five-file scope")
    run("git", "config", "user.name", "github-actions[bot]")
    run("git", "config", "user.email", "41898282+github-actions[bot]@users.noreply.github.com")
    run("git", "commit", "-m", "build(KAR-%s): atomic PATCH %s plus ZIP" %
        (plan["issue"], plan["nextVersion"]))
    result_sha = git("rev-parse", "HEAD")
    require(git("rev-parse", "HEAD^") == plan["sourceSha"], "atomic parent mismatch")
    require(set(git("diff-tree", "--no-commit-id", "--name-only", "-r", result_sha)
                .splitlines()) == staged, "committed five-file closure mismatch")
    require(remote(plan["branch"]) == plan["sourceSha"] and
            remote("main") == plan["mainSha"], "remote ref drift before push")
    run("git", "push", "origin", "HEAD:refs/heads/" + plan["branch"], timeout=90)
    require(remote(plan["branch"]) == result_sha, "new Work head not readable")
    # Keep the one canonical Issue comment in sync BEFORE opening a real PR.
    # Bot PR creation is intentionally not used: GITHUB_TOKEN may not trigger CI.
    run("node", "scripts/kar-work-pr-preflight.cjs", "--issue", str(plan["issue"]),
        "--head-sha", result_sha, "--prior-sha", plan["sourceSha"], "--sync-head",
        timeout=45)
    plan.update(result="KAR_ATOMIC_PATCH_GREEN", newWorkSha=result_sha,
                newZipSha256=digest(new.read_bytes()), newZipBytes=new.stat().st_size)
    return plan


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--mode", choices=["plan", "build"], required=True)
    parser.add_argument("--issue", required=True)
    parser.add_argument("--branch", required=True)
    parser.add_argument("--work-sha", required=True)
    parser.add_argument("--main-sha", required=True)
    a = parser.parse_args()
    plan, future = collect(a.issue, a.branch, a.work_sha, a.main_sha)
    if a.mode == "build":
        plan = build(plan, future)
    print("PASS KAR-52 reusable Work PATCH " + a.mode + ": " +
          json.dumps(plan, sort_keys=True))


if __name__ == "__main__":
    try:
        main()
    except (ValueError, KeyError, OSError, subprocess.CalledProcessError,
            subprocess.TimeoutExpired) as exc:
        print("KAR52_PATCH_FAILED: " + str(exc), file=sys.stderr)
        sys.exit(1)
