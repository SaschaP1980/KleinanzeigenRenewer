#!/usr/bin/env python3
"""KAR-50: validate and atomically commit four PATCH metadata files and new ZIP.

This is a one-shot, issue-bound Work branch builder. No main merge, tag,
release, product JS change or remote Kleinanzeigen activity.
"""
import hashlib, json, os, re, shutil, subprocess, sys, tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BASE = "723f64e7e8713a003d17c9a69f0610a6b6624509"
OLD = "1.23.24"
NEW = "1.23.25"
OLD_SHA = "1ab407e2106b5e9ec07f417f7adaff446e8a62ae2cbfe12a0a3002c62e69503c"
BRANCH = "work/KAR-50"
FILES = ("manifest.json", "package.json", "package-lock.json", "release/release-spec.json")


def require(ok, why):
    if not ok:
        raise RuntimeError("KAR50_ATOMIC_PATCH_FAILED: " + why)


def git(*args):
    return subprocess.check_output(("git", *args), cwd=ROOT,
                                   text=True, timeout=30).strip()


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def remote(ref):
    line = subprocess.check_output(("git", "ls-remote", "origin", "refs/heads/" + ref),
                                   cwd=ROOT, text=True, timeout=30).strip()
    require(bool(line), "remote ref unavailable: " + ref)
    return line.split()[0]


def main():
    expected = os.environ.get("GITHUB_SHA", "")
    require(os.environ.get("GITHUB_REF_NAME") == BRANCH, "ref not authorized Work branch")
    require(re.fullmatch(r"[0-9a-f]{40}", expected) is not None, "invalid trigger SHA")
    require(git("rev-parse", "HEAD") == expected and remote(BRANCH) == expected,
            "checked out SHA not authoritative Work HEAD")
    require(remote("main") == BASE and git("merge-base", BASE, "HEAD") == BASE,
            "main moved or incorrect Work basis")
    require(git("status", "--porcelain") == "", "working tree dirty before version bump")
    meta = {p: json.loads((ROOT / p).read_text(encoding="utf-8")) for p in FILES}
    require(all(x["version"] == OLD for x in meta.values()), "four old versions inconsistent")
    require(meta["package.json"]["displayVersion"] == OLD
            and meta["package-lock.json"]["packages"][""]["version"] == OLD
            and meta["release/release-spec.json"]["packageVersion"] == OLD,
            "display/lock/release version inconsistent")
    require(meta["release/release-spec.json"]["directBasis"] == "1.23.20_c1"
            and meta["release/release-spec.json"]["nextPlannedBuild"] == "1.24.0",
            "historical correction-series policy drift")
    old = ROOT / "release" / ("kleinanzeigen-renewal-chrome-v" + OLD + ".zip")
    target = ROOT / "release" / ("kleinanzeigen-renewal-chrome-v" + NEW + ".zip")
    require(old.is_file() and sha(old) == OLD_SHA, "previous published archive modified")
    require(not target.exists(), "new version archive path already occupied")
    absent = subprocess.run(["git", "cat-file", "-e", BASE + ":release/" + target.name],
                            cwd=ROOT, capture_output=True, timeout=15)
    require(absent.returncode != 0, "new path collision in pinned main")
    # Fail if release-scope changes or nonapproved fields are found.
    before = {p: json.loads(json.dumps(x)) for p, x in meta.items()}
    for x in meta.values():
        x["version"] = NEW
    meta["package.json"]["displayVersion"] = NEW
    meta["package-lock.json"]["packages"][""]["version"] = NEW
    meta["release/release-spec.json"]["packageVersion"] = NEW
    permitted = {"manifest.json": {"version"},
                 "package.json": {"version", "displayVersion"},
                 "package-lock.json": {"version", "packages"},
                 "release/release-spec.json": {"version", "packageVersion"}}
    for p in FILES:
        altered = {k for k in meta[p] if meta[p][k] != before[p].get(k)}
        require(altered == permitted[p], "unexpected metadata keys modified: " + p)
        (ROOT / p).write_text(json.dumps(meta[p], ensure_ascii=False, indent=2) + "\n",
                              encoding="utf-8")
    with tempfile.TemporaryDirectory(prefix="kar50-zip-build-") as tmp:
        subprocess.run([sys.executable, "scripts/package.py", tmp],
                       cwd=ROOT, timeout=120, check=True)
        build = Path(tmp) / target.name
        require(build.is_file(), "canonical packager failed to produce next ZIP")
        shutil.copyfile(build, target)
    require(sha(old) == OLD_SHA and sha(target) != OLD_SHA, "archive identity collision")
    subprocess.run([sys.executable, "scripts/verify_committed_chrome_zip.py",
                    "--base-sha", BASE], cwd=ROOT, timeout=120, check=True)
    # Full safety, architecture, current-version dynamic prospective 1.23.26,
    # 100% dynamic public coverage, unchanged historical tests.
    subprocess.run(["bash", "scripts/coverage-gate.sh"], cwd=ROOT,
                   timeout=360, check=True)
    require(git("rev-parse", "HEAD") == expected
            and remote(BRANCH) == expected and remote("main") == BASE,
            "Git refs drifted after validation")
    changed = set(filter(None, git("diff", "--name-only").splitlines()))
    require(changed == set(FILES), "unapproved modified tracked files: " + repr(changed))
    archive = target.relative_to(ROOT).as_posix()
    # release/*.zip is intentionally ignored by Git; the next archive must
    # be explicitly force-added, never mistaken for absent or silently skipped.
    require(target.is_file(), "new archive disappeared after full coverage")
    untracked = set(filter(None, git("ls-files", "--others", "--exclude-standard").splitlines()))
    require(not untracked, "unapproved non-ignored new files: " + repr(untracked))
    ignored = subprocess.run(["git", "check-ignore", "-q", archive],
                             cwd=ROOT, timeout=15)
    require(ignored.returncode == 0, "release ZIP ignore policy unexpectedly changed")
    subprocess.run(["git", "add", "--force", "--", *FILES, archive], cwd=ROOT, check=True)
    staged = set(filter(None, git("diff", "--cached", "--name-only").splitlines()))
    require(staged == set(FILES) | {archive}, "five-path atomic commit scope invalid")
    subprocess.run(["git", "config", "user.name", "github-actions[bot]"], cwd=ROOT, check=True)
    subprocess.run(["git", "config", "user.email",
                    "41898282+github-actions[bot]@users.noreply.github.com"],
                   cwd=ROOT, check=True)
    subprocess.run(["git", "commit", "-m",
                    "build(KAR-50): atomically add v1.23.25 metadata and verified Chrome ZIP"],
                   cwd=ROOT, check=True)
    new_head = git("rev-parse", "HEAD")
    require(new_head != expected and git("rev-parse", "HEAD^") == expected,
            "new commit does not descend from authorized Work")
    recorded = set(filter(None, git("diff-tree", "--no-commit-id", "--name-only",
                                   "-r", new_head).splitlines()))
    require(recorded == staged, "committed five-path scope changed")
    require(remote(BRANCH) == expected and remote("main") == BASE,
            "ref changed before guarded push")
    subprocess.run(["git", "push", "origin", "HEAD:refs/heads/" + BRANCH],
                   cwd=ROOT, timeout=60, check=True)
    print(json.dumps({"result": "KAR50_ATOMIC_PATCH_GREEN",
                      "previous": expected, "newHead": new_head, "version": NEW,
                      "archive": archive, "zipBytes": target.stat().st_size,
                      "zipSha256": sha(target), "oldZipSha256": sha(old),
                      "changedFiles": sorted(staged)}, sort_keys=True))


if __name__ == "__main__":
    main()
