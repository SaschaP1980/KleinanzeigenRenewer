#!/usr/bin/env python3
"""One-time exact conflict resolver: main v1.25.12 -> work/KAR-171.

This is a source-reviewed integration aid, NOT a runtime script, updater,
release tool or replacement for CI. It deliberately fails for unexpected
conflicts, preserving upstream bounded phase-4 and Web-Lock telemetry while
retaining KAR-171's original-P8 final authority checks.
"""
import json
import re
import subprocess
from pathlib import Path

CONFLICT_PATTERN = re.compile(
    r"(?ms)^<<<<<<< HEAD\n(.*?)^=======\n(.*?)^>>>>>>> [^\n]+\n"
)
EXPECTED = {
    "package.json": 1,
    "src/background/background.js": 2,
    "src/background/services/auto-publish-intent-journal.js": 2,
    "src/background/services/phase4-uncertainty-journal.js": 2,
    "src/background/services/remote-delete-replacement-service.js": 1,
    "tests/v12319-version-architecture.cjs": 1,
    "tests/v12320-final-closure.cjs": 1,
}


def git(*args):
    return subprocess.check_output(["git", *args], text=True)


def require(value, message):
    if not value:
        raise RuntimeError("KAR171_MAIN_SYNC_DENIED: " + message)


def merged_fragment(filename, index, ours, main):
    if filename == "src/background/background.js":
        if index == 0:
            require("requireCommitContext: true" in ours, "missing R1 commit-context gate")
            require("onSample:" in main, "missing main publication telemetry")
            require("verifyRemoteOutcome:" in main, "missing main publication verification")
            # Keep the main metrics hook and the stronger private final
            # origin-locked R1 account-context witness, all non-mutating.
            return (
                "      onSample: sample => requireDiagnosticsService().recordPublishIntentSample(sample),\n"
                "      verifyRemoteOutcome: (intent, newAdId) => verifyAutoPublishRemoteOutcomeFresh(intent, newAdId),\n"
                "      requireCommitContext: true,\n"
                "      prepareCommitContext: r => requireAdditionalOwnerObserver().prepareRemoteCommitContextReadOnly(r,'publish'),\n"
                "      verifyCommitContext: (r,w) => requireAdditionalOwnerObserver().verifyRemoteCommitContextReadOnly(r,'publish',w)\n"
            )
        return main

    if filename == "src/background/services/auto-publish-intent-journal.js":
        if index == 0:
            require("requireCommitContext" in ours, "missing R1 publication final witness")
            require("onSample" in main, "missing main publication atomic metrics")
            return (
                "    verifyRemoteOutcome=null,onSample=null,verifyCommitContext=null,\n"
                "    prepareCommitContext=null,requireCommitContext=false}={}){\n"
            )
        require("witness.close" in ours, "missing R1 publish owned-tab cleanup")
        require("'resolve-write'" in main, "missing main publish atomic labeled boundary")
        return (
            "      },'resolve-write');}finally{\n"
            "        if(witness)await Promise.resolve().then(()=>witness.close()).catch(()=>{});\n"
            "      }\n"
        )

    if filename == "src/background/services/phase4-uncertainty-journal.js":
        if index == 0:
            require("requireCommitContext" in ours, "missing R1 phase4 final witness")
            require("onSample" in main, "missing main P8 journal lock metrics")
            return (
                "  function create({storageLocal, clock, newToken, workerInstanceId,\n"
                "    verifyRemoteOutcome = null, verifyCommitContext = null,\n"
                "    prepareCommitContext = null, requireCommitContext = false,\n"
                "    lockManager = null, lockName = null, onSample = null} = {}) {\n"
            )
        require("witness.close" in ours, "missing R1 phase4 owned-tab cleanup")
        require("'resolve-write'" in main, "missing main phase4 atomic labeled boundary")
        return (
            "      }, 'resolve-write');}finally{\n"
            "        if(witness)await Promise.resolve().then(()=>witness.close()).catch(()=>{});\n"
            "      }\n"
        )

    if filename == "src/background/services/remote-delete-replacement-service.js":
        require("expectedProfileName:expected" in ours, "missing source account binding")
        require("requireCompleteRoster:" in ours, "missing R1 target whole-roster proof")
        require("boundedPhase4TabRequest" in main, "missing #199 bounded requests")
        # Exactly the main bounded status/scan requests, plus the R1 in-page
        # account source and full-roster requirement, and a FINAL status check
        # after the entire multi-page navigation (before returning success).
        return (
            "      const assertSameAccount = async () => {\n"
            "        const status = await boundedPhase4TabRequest(tabId,\n"
            "          {type:'MY_ADS_STATUS'}, 'journal-fresh-' + kind,\n"
            "          PHASE4_STATUS_TIMEOUT_MS, 'KR_PHASE4_JOURNAL_REMOTE_UNVERIFIED');\n"
            "        if (status?.isMyAdsPage !== true || status?.isProjectsTab !== true\n"
            "            || !status.profileName || normalized(status.profileName) !== normalized(expected))\n"
            "          throw new Error('KR_PHASE4_JOURNAL_UNVERIFIED');\n"
            "      };\n"
            "      await assertSameAccount();\n"
            "      const result = await boundedPhase4TabRequest(tabId,{\n"
            "        type:command,adId:id,expectedProfileName:expected,\n"
            "        requireCompleteRoster: kind === 'target',\n"
            "        correlation:{renewalId:receipt.renewalId}\n"
            "      }, 'journal-scan-' + kind, PHASE4_READONLY_TIMEOUT_MS,\n"
            "      'KR_PHASE4_JOURNAL_REMOTE_UNVERIFIED');\n"
            "      await assertSameAccount();\n"
            "      return result;\n"
        )

    if filename in (
        "tests/v12319-version-architecture.cjs",
        "tests/v12320-final-closure.cjs",
    ):
        # Upstream immutable gold count incorporates KAR-164, 186, 188,
        # 195, 197 and 201. R1 delta remains in other nonconflicting files.
        require("pass(" in main or "const " in main, "missing main gold baseline")
        return main

    raise RuntimeError("Unsupported merge conflict: " + filename)


def resolve():
    conflicted = set(git("diff", "--name-only", "--diff-filter=U").splitlines())
    require(conflicted == set(EXPECTED),
            "unexpected conflict list: " + repr(sorted(conflicted)))
    for name, expected_count in EXPECTED.items():
        if name == "package.json":
            ours = json.loads(git("show", ":2:package.json"))
            upstream = json.loads(git("show", ":3:package.json"))
            require(upstream["version"] == "1.25.12", "main version advanced")
            require(ours["version"] == "1.24.1", "work version unexpected")
            test_command = upstream["scripts"]["test"]
            four = [
                "tests/kar171-r1-page-account-continuity.cjs",
                "tests/kar171-r1-p8-readonly-preflight.cjs",
                "tests/kar171-r1-publish-lineage-preflight.cjs",
                "tests/kar171-r1-phase4-lineage-preflight.cjs",
            ]
            for test in four:
                require(test in ours["scripts"]["test"], "missing Work test " + test)
                if test not in test_command:
                    test_command += " && node " + test
            upstream["scripts"]["test"] = test_command
            Path(name).write_text(
                json.dumps(upstream, ensure_ascii=False, indent=2) + "\n",
                encoding="utf-8",
            )
        else:
            path = Path(name)
            body = path.read_text(encoding="utf-8")
            fragments = list(CONFLICT_PATTERN.finditer(body))
            require(len(fragments) == expected_count,
                    "unexpected hunk count for " + name)
            counter = [0]

            def substitute(match):
                index = counter[0]
                counter[0] += 1
                return merged_fragment(name, index, match.group(1), match.group(2))

            merged = CONFLICT_PATTERN.sub(substitute, body)
            require("<<<<<<<" not in merged and ">>>>>>>" not in merged,
                    "unresolved marker in " + name)
            path.write_text(merged, encoding="utf-8")
        subprocess.run(["git", "add", "--", name], check=True)
        print("RESOLVED", name)
    require(not git("diff", "--name-only", "--diff-filter=U").strip(),
            "unresolved files remain")
    # Explicit integration claims, not an R1 acceptance statement.
    bg = Path("src/background/background.js").read_text()
    phase = Path("src/background/services/phase4-uncertainty-journal.js").read_text()
    pub = Path("src/background/services/auto-publish-intent-journal.js").read_text()
    remote = Path("src/background/services/remote-delete-replacement-service.js").read_text()
    require("requireCommitContext: true" in bg and "recordPublishIntentSample" in bg,
            "lost publication telemetry or R1 private final witness")
    require("requireCommitContext = false" in phase and "onSample = null" in phase,
            "lost phase4 final witness or main telemetry")
    require("requireCommitContext=false" in pub and "onSample=null" in pub,
            "lost publish final witness or main telemetry")
    require("PHASE4_READONLY_TIMEOUT_MS" in remote and
            "requireCompleteRoster: kind === 'target'" in remote,
            "lost bounded #199 Phase4 status or R1 target scan")
    print("PASS EXACT SEVEN-CONFLICT SOURCE RESOLUTION; no branch ref pushed")


if __name__ == "__main__":
    resolve()
