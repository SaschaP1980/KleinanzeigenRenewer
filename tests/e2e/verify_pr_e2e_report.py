#!/usr/bin/env python3
"""KAR-46: fail-closed attestation for the real, packaged Work-PR browser E2E."""
from __future__ import annotations

import argparse
import copy
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import zipfile

SCENARIOS = (
    "boot-mv3",
    "service-worker-restart",
    "bulk-runtime-lease-recovery",
    "accordion-rapid-toggle",
    "app-close-reopen-persistence",
    "profile-switch-action-lock",
    "worker-tab-unexpected-close",
    "bottom-clamp-four-views",
    "remote-safety-negative",
)


def require(condition, message):
    if not condition:
        raise ValueError(message)


def verify_report(report, expected_version):
    require(isinstance(report, dict), "E2E report must be a JSON object")
    require(report.get("schema") == 2, "Unexpected E2E report schema")
    require(report.get("runner") == "supervisor-child-process", "Must run real isolated supervisor")
    require(report.get("extensionVersion") == expected_version, "E2E extension version mismatch")
    require(report.get("scenarioCount") == len(SCENARIOS), "Nine real scenarios required")
    require(report.get("passed") == len(SCENARIOS), "Nine passing scenarios required")
    require(report.get("failed") == 0, "Scenario failures are forbidden")
    require(report.get("cleanupFailed") == 0, "Scenario/profile cleanup failures are forbidden")
    results = report.get("results")
    require(isinstance(results, list) and len(results) == len(SCENARIOS), "Result count mismatch")
    names = [item.get("name") if isinstance(item, dict) else None for item in results]
    require(names == list(SCENARIOS), "Scenario identities/order mismatch or duplicates")
    for item in results:
        name = item["name"]
        require(item.get("scenarioStatus") == "PASS", f"Non-PASS scenario: {name}")
        require(item.get("cleanupStatus") == "PASS", f"Non-PASS process cleanup: {name}")
        require(item.get("profileCleanupStatus") == "PASS", f"Non-PASS profile cleanup: {name}")
        require(not item.get("error"), f"Unexpected scenario error: {name}")
    return {
        "scenarioCount": len(SCENARIOS),
        "passed": len(SCENARIOS),
        "failed": 0,
        "cleanupFailed": 0,
        "scenarios": names,
    }


def self_test():
    sample = {
        "schema": 2, "runner": "supervisor-child-process",
        "extensionVersion": "1.23.24", "scenarioCount": len(SCENARIOS),
        "passed": len(SCENARIOS), "failed": 0, "cleanupFailed": 0,
        "results": [
            {"name": name, "scenarioStatus": "PASS",
             "cleanupStatus": "PASS", "profileCleanupStatus": "PASS", "error": None}
            for name in SCENARIOS
        ],
    }
    require(verify_report(sample, "1.23.24")["passed"] == 9, "Valid report rejected")
    cases = [
        ("schema", lambda r: r.update(schema=1)),
        ("runner", lambda r: r.update(runner="mock")),
        ("version", lambda r: r.update(extensionVersion="1.23.25")),
        ("count", lambda r: r.update(scenarioCount=8)),
        ("passed", lambda r: r.update(passed=8)),
        ("failed", lambda r: r.update(failed=1)),
        ("cleanupFailed", lambda r: r.update(cleanupFailed=1)),
        ("missing result", lambda r: r["results"].pop()),
        ("duplicate scenario", lambda r: r["results"][1].update(name=SCENARIOS[0])),
        ("scenario skipped", lambda r: r["results"][0].update(scenarioStatus="SKIP")),
        ("scenario INFRA", lambda r: r["results"][0].update(scenarioStatus="INFRA")),
        ("process cleanup TIMEOUT", lambda r: r["results"][0].update(cleanupStatus="TIMEOUT")),
        ("profile cleanup FAILED", lambda r: r["results"][0].update(profileCleanupStatus="FAILED")),
        ("hidden scenario error", lambda r: r["results"][0].update(error="ignored failure")),
    ]
    for name, mutate in cases:
        bad = copy.deepcopy(sample)
        mutate(bad)
        try:
            verify_report(bad, "1.23.24")
        except ValueError:
            continue
        raise AssertionError("Invalid report incorrectly passed: " + name)
    print(f"PASS KAR-46 browser evidence verifier: valid report and {len(cases)} negative cases")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--self-test", action="store_true")
    parser.add_argument("--report", type=Path)
    parser.add_argument("--zip", dest="zip_path", type=Path)
    parser.add_argument("--expected-head")
    parser.add_argument("--out", type=Path)
    args = parser.parse_args()
    if args.self_test:
        self_test()
        return
    require(args.report and args.zip_path and args.expected_head and args.out, "Missing required evidence inputs")
    require(bool(re.fullmatch(r"[0-9a-f]{40}", args.expected_head)), "Invalid Work HEAD SHA")
    require(args.report.is_file(), "Real supervisor report missing")
    require(args.zip_path.is_file(), "Packaged Chrome ZIP missing")
    report = json.loads(args.report.read_text(encoding="utf-8"))
    with zipfile.ZipFile(args.zip_path) as package:
        require(package.testzip() is None, "Chrome ZIP corrupt")
        manifest = json.loads(package.read("manifest.json"))
    source_manifest = json.loads(Path("manifest.json").read_text(encoding="utf-8"))
    require(manifest == source_manifest, "E2E package manifest differs from Work source")
    result = verify_report(report, manifest["version"])
    browser = os.environ.get("KR_CHROME_BINARY")
    require(browser and Path(browser).is_file(), "Real Chromium executable not recorded")
    browser_version = subprocess.check_output([browser, "--version"], text=True, timeout=15).strip()
    require("chromium" in browser_version.lower() or "chrome" in browser_version.lower(),
            "Unexpected browser executable version")
    sha = hashlib.sha256(args.zip_path.read_bytes()).hexdigest()
    record = {
        "schema": 1,
        "proof": "packaged-chromium-real-fixture-e2e",
        "repository": os.environ.get("GITHUB_REPOSITORY"),
        "workHeadSha": args.expected_head,
        "githubRunId": os.environ.get("GITHUB_RUN_ID"),
        "githubRunAttempt": os.environ.get("GITHUB_RUN_ATTEMPT"),
        "extensionVersion": manifest["version"],
        "extensionId": "hafahjhhgiipdegfkgacchmnacgblnah",
        "zipSha256": sha,
        "browserVersion": browser_version,
        **result,
    }
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(record, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("PASS KAR-46 real packaged Work-PR browser E2E attestation: "
          f"{len(SCENARIOS)}/9, 0 failed/cleanup; SHA {args.expected_head}; ZIP {sha}")


if __name__ == "__main__":
    try:
        main()
    except (OSError, ValueError, KeyError, subprocess.CalledProcessError, zipfile.BadZipFile) as exc:
        print("KAR46_WORK_PR_BROWSER_E2E_EVIDENCE_FAILED:", str(exc), file=sys.stderr)
        sys.exit(1)
