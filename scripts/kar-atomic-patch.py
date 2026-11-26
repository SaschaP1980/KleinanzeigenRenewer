#!/usr/bin/env python3
"""KAR-52/210 reusable, SHA-guarded Work PATCH or explicit HOTFIX ZIP primitive."""
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

sys.path.insert(0, str(Path(__file__).resolve().parent))
import product_version

ROOT = Path(__file__).resolve().parent.parent
META = ("manifest.json", "package.json", "package-lock.json", "release/release-spec.json")
VERSION = re.compile(r"^1\.(23|24|25)\.(0|[1-9][0-9]*)$")
HEX = re.compile(r"^[a-f0-9]{40}$")
ISSUE = re.compile(r"^[1-9][0-9]*$")


def require(ok, why):
    if not ok:
        raise ValueError("KAR52_PATCH_FAILED: " + why)


def digest(data):
    return hashlib.sha256(data).hexdigest()


def successor(version):
    # The existing atomic builder remains PATCH-only. HOTFIX must have its
    # own explicit authorization and metadata/commit scope.
    try:
        parts = product_version.parse(product_version.active_version(version))
    except ValueError as exc:
        require(False, str(exc))
    if parts[0] == 2:
        require(parts[2] < 65535, "PATCH outside safe range")
        return product_version.advance(version, "patch")
    require(VERSION.fullmatch(version),
            "regular 1.23.x, 1.24.x, 1.25.x or 2.x.y.z PATCH required")
    minor, patch = parts[1:3]
    require((minor == 23 and patch >= 22 or minor in (24, 25)) and patch < 65535,
            "PATCH outside safe range")
    return "1." + str(minor) + "." + str(patch + 1)


def metadata_paths(change_class):
    require(change_class in ("patch", "hotfix"), "unsupported change class")
    return tuple(p for p in META if change_class == "patch" or p != "package-lock.json")


def metadata_plan(meta, change_class="patch"):
    expected = metadata_paths(change_class)
    try:
        current = product_version.validate_metadata(meta)
    except ValueError as exc:
        require(False, str(exc))
    if change_class == "hotfix":
        require(current.startswith("2."), "HOTFIX requires generation-two product version")
        try:
            next_version = product_version.advance(current, "hotfix")
        except ValueError as exc:
            require(False, str(exc))
    else:
        next_version = successor(current)
    spec = meta["release/release-spec.json"]
    expected_next_minor = "1.24.0" if current.startswith("1.23.") else "TBD"
    expected_basis = "2.0.2.0" if current == "2.0.3.0" else "2.0.1.0" if current == "2.0.2.0" else "2.0.0.1" if current == "2.0.1.0" else ("1.23.48" if current.startswith("2.") else "1.23.20_c1")
    require(spec.get("directBasis") == expected_basis and
            spec.get("nextPlannedBuild") == expected_next_minor,
            "basis/next-minor policy drift")
    if current.startswith("2."):
        future = product_version.bump_metadata(meta, change_class)
    else:
        future = copy.deepcopy(meta)
        for p in META:
            future[p]["version"] = next_version
        future["package.json"]["displayVersion"] = next_version
        future["package-lock.json"]["packages"][""]["version"] = next_version
        future["release/release-spec.json"]["packageVersion"] = next_version
        if "version_name" in future["manifest.json"]:
            future["manifest.json"]["version_name"] = next_version
    require(product_version.validate_metadata(future) == next_version,
            "next metadata version mismatch")
    require({p for p in META if meta[p] != future[p]} == set(expected),
            "metadata change scope mismatch")
    return current, next_version, future


def run(*args, binary=False, timeout=30):
    try:
        result = subprocess.run(args, cwd=ROOT, capture_output=True, check=True,
                                timeout=timeout, text=not binary)
    except subprocess.CalledProcessError as error:
        # Preserve the failing safety gate and bounded evidence instead of a silent RC1.
        for label, stream in (("stdout", error.stdout), ("stderr", error.stderr)):
            if stream:
                raw = stream.decode("utf-8", "replace") if isinstance(stream, bytes) else stream
                if label == "stderr":
                    # Node assertions on large source files hide their actual test
                    # stack under megabytes of printed input. Preserve bounded
                    # source location hints instead of silently losing root cause.
                    locations = list(dict.fromkeys(re.findall(
                        r"(?:tests|scripts)/[A-Za-z0-9_./-]+\.(?:cjs|mjs|js|py):\d+(?::\d+)?",
                        raw)))
                    print("KAR69_BUILD_GATE_SOURCE_LOCATIONS: " + repr(locations[-20:]),
                          file=sys.stderr)
                    evidence = raw[:1800] + "\n...[bounded red-gate evidence]...\n" + raw[-4400:]
                else:
                    evidence = raw[-6000:]
                print("KAR69_BUILD_GATE_" + label.upper() + ":\n" + evidence,
                      file=sys.stderr)
        raise
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


def sealed_prior_archive(issue, base, head, relative, current):
    """Return immutable ZIP bytes sealed by main or a prior exact-scope Work build."""
    require(HEX.fullmatch(base) and HEX.fullmatch(head), "invalid provenance SHA")
    require(relative == "release/kleinanzeigen-renewal-chrome-v" + current + ".zip",
            "previous archive path/version mismatch")
    has_main = subprocess.run(["git", "cat-file", "-e", base + ":" + relative],
                              cwd=ROOT, capture_output=True, timeout=15)
    if has_main.returncode == 0:
        return run("git", "show", base + ":" + relative, binary=True), "main"

    # Require a prior Work ZIP to originate from the matching exact-scope
    # atomic PATCH or explicitly dispatched HOTFIX build in our history.
    seal = git("log", "-1", "--format=%H", head, "--", relative)
    require(HEX.fullmatch(seal), "previous Work ZIP has no traceable commit")
    subject = git("show", "-s", "--format=%s", seal)
    if subject == "build(KAR-%s): atomic PATCH %s plus ZIP" % (issue, current):
        seal_class = "patch"
    else:
        require(subject == "build(KAR-%s): atomic HOTFIX %s plus ZIP" % (issue, current)
                and current.startswith("2.") and product_version.parse(current)[3] > 0,
                "previous ZIP was not sealed by the matching atomic Work builder")
        seal_class = "hotfix"
    changed = set(git("diff-tree", "--no-commit-id", "--name-only", "-r", seal).splitlines())
    require(changed == set([*metadata_paths(seal_class), relative]),
            "previous Work ZIP commit did not change exactly the authorized atomic paths")
    # The previous Work ZIP may have been sealed before a later main merge.
    # Require both immutable ancestry facts on the *current exact Work head*:
    # the approved main basis is now integrated AND the original Work seal is
    # still present, while collect() checks the old ZIP bytes match that seal.
    # Do not require the later main SHA to precede the earlier Work ZIP seal.
    git("merge-base", "--is-ancestor", base, head)
    git("merge-base", "--is-ancestor", seal, head)
    if current.startswith("2."):
        sealed_meta = {item: json.loads(run("git", "show", seal + ":" + item))
                       for item in META}
        try:
            require(product_version.validate_metadata(sealed_meta) == current,
                    "previous Work ZIP metadata version mismatch")
        except ValueError as exc:
            require(False, str(exc))
    else:
        # Historical seals retain their original three-component contract.
        for item in META:
            old_meta = json.loads(run("git", "show", seal + ":" + item))
            require(old_meta.get("version") == current,
                    "previous Work ZIP metadata version mismatch at " + item)
    return run("git", "show", seal + ":" + relative, binary=True), "work"


def collect(issue, branch, head, base, change_class="patch"):
    assert_lease(issue, branch, head, base)
    meta = {p: json.loads((ROOT / p).read_text(encoding="utf-8")) for p in META}
    current, future, next_meta = metadata_plan(meta, change_class)
    old = ROOT / "release" / ("kleinanzeigen-renewal-chrome-v" + current + ".zip")
    nxt = ROOT / "release" / ("kleinanzeigen-renewal-chrome-v" + future + ".zip")
    require(old.is_file(), "current release ZIP missing")
    require(not nxt.exists(), "next version archive already exists")
    prev, old_origin = sealed_prior_archive(issue, base, head,
                                            old.relative_to(ROOT).as_posix(), current)
    require(prev == old.read_bytes(),
            "current archived ZIP differs from its sealed " + old_origin + " basis")
    clash = subprocess.run(["git", "cat-file", "-e", base + ":release/" + nxt.name],
                           cwd=ROOT, capture_output=True, timeout=15)
    require(clash.returncode != 0, "next version collides in main")
    paths = sorted([*metadata_paths(change_class), nxt.relative_to(ROOT).as_posix()])
    return {
        "issue": int(issue), "branch": branch, "sourceSha": head, "mainSha": base,
        "changeClass": change_class, "metadataPaths": list(metadata_paths(change_class)),
        "changedPaths": paths,
        "currentVersion": current, "nextVersion": future,
        "oldZip": old.relative_to(ROOT).as_posix(), "newZip": nxt.relative_to(ROOT).as_posix(),
        "oldZipSha256": digest(prev), "oldZipOrigin": old_origin,
        **({"fivePaths": paths} if change_class == "patch" else {})
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
    change_class = plan.get("changeClass", "patch")
    metadata_paths(change_class)
    require(os.environ.get("KAR_CHANGE_CLASS", "patch") == change_class,
            "dispatch change class must match build plan")
    if event == "push":
        require(change_class == "patch", "HOTFIX requires explicit workflow_dispatch")
        authorized_push(git("log", "-1", "--pretty=%s"),
                        git("diff-tree", "--no-commit-id", "--name-only", "-r", "HEAD"),
                        plan["issue"], plan["mainSha"])


def build(plan, future):
    assert_build_entry(plan)
    # Event, branch and immutable triggering SHA were checked above.
    old = ROOT / plan["oldZip"]
    new = ROOT / plan["newZip"]
    change_class = plan["changeClass"]
    paths = metadata_paths(change_class)
    expected_paths = set(paths) | {plan["newZip"]}
    require(plan["metadataPaths"] == list(paths) and
            set(plan["changedPaths"]) == expected_paths, "invalid build plan scope")
    for p in paths:
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
    require(changed == set(paths), "unapproved changed tracked paths " + repr(changed))
    untracked = {x for x in git("ls-files", "--others", "--exclude-standard").splitlines() if x}
    require(not untracked, "unapproved untracked files " + repr(untracked))
    require(subprocess.run(["git", "check-ignore", "-q", plan["newZip"]],
                           cwd=ROOT, timeout=15).returncode == 0, "ZIP ignore policy drift")
    run("git", "add", "--force", "--", *paths, plan["newZip"])
    staged = {x for x in git("diff", "--cached", "--name-only").splitlines() if x}
    require(staged == expected_paths, "staged paths not exact authorized scope")
    run("git", "config", "user.name", "github-actions[bot]")
    run("git", "config", "user.email", "41898282+github-actions[bot]@users.noreply.github.com")
    run("git", "commit", "-m", "build(KAR-%s): atomic %s %s plus ZIP" %
        (plan["issue"], change_class.upper(), plan["nextVersion"]))
    result_sha = git("rev-parse", "HEAD")
    require(git("rev-parse", "HEAD^") == plan["sourceSha"], "atomic parent mismatch")
    require(set(git("diff-tree", "--no-commit-id", "--name-only", "-r", result_sha)
                .splitlines()) == staged, "committed atomic scope mismatch")
    require(remote(plan["branch"]) == plan["sourceSha"] and
            remote("main") == plan["mainSha"], "remote ref drift before push")
    run("git", "push", "origin", "HEAD:refs/heads/" + plan["branch"], timeout=90)
    require(remote(plan["branch"]) == result_sha, "new Work head not readable")
    # Keep the one canonical Issue comment in sync BEFORE opening a real PR.
    # Bot PR creation is intentionally not used: GITHUB_TOKEN may not trigger CI.
    run("node", "scripts/kar-work-pr-preflight.cjs", "--issue", str(plan["issue"]),
        "--head-sha", result_sha, "--prior-sha", plan["sourceSha"], "--sync-head",
        timeout=45)
    plan.update(result="KAR_ATOMIC_" + change_class.upper() + "_GREEN", newWorkSha=result_sha,
                newZipSha256=digest(new.read_bytes()), newZipBytes=new.stat().st_size)
    return plan


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--mode", choices=["plan", "build"], required=True)
    parser.add_argument("--issue", required=True)
    parser.add_argument("--branch", required=True)
    parser.add_argument("--work-sha", required=True)
    parser.add_argument("--main-sha", required=True)
    parser.add_argument("--change-class", choices=["patch", "hotfix"], default="patch")
    a = parser.parse_args()
    plan, future = collect(a.issue, a.branch, a.work_sha, a.main_sha, a.change_class)
    if a.mode == "build":
        plan = build(plan, future)
    print("PASS KAR-52 reusable Work " + a.change_class.upper() + " " + a.mode + ": " +
          json.dumps(plan, sort_keys=True))


if __name__ == "__main__":
    try:
        main()
    except (ValueError, KeyError, OSError, subprocess.CalledProcessError,
            subprocess.TimeoutExpired) as exc:
        print("KAR52_PATCH_FAILED: " + str(exc), file=sys.stderr)
        sys.exit(1)
