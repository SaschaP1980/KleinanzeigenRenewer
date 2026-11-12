# KAR-167 S1 — Scripts and workflow inventory

**Base Work commit:** `1497174cebd241568486ec395d2440af17ace3c3`, after D1 (main v1.23.59). This file is a **record of S1 repository audit**, not authorization to change GitHub Actions permissions or publish packages.

## Scope and classification

- All **25** scripts present at the S1 starting Work tree were inspected at least for purpose, script imports, current GitHub workflow/package references and relationship to test/release gates. Exactly **one** superseded script is the retirement candidate; the other **24 remain**.
- All **five** current GitHub workflows are retained. The sixth historical KAR-50-specific workflow and matching script were already removed in the earlier #167 checkpoint.
- Classifications are in [SCRIPT_WORKFLOW_INVENTORY.json](SCRIPT_WORKFLOW_INVENTORY.json) and checked against the actual Git tree by the S1 regression guard.
- **Actively used** and **standalone-supported** are distinct. Scripts not invoked on every CI run are still retained when documented as a local release/Windows support or a historically required safety contract.

## Individual script decisions

| Script | Role/status | Evidence and decision |
| --- | --- | --- |
| `scripts/archive-release-zip.sh` | **KEEP — release-active** | kar-release.yml directly invokes it after publication; byte-for-byte committed archive parity |
| `scripts/build.sh` | **KEEP — release-active** | release-pipeline.sh invokes regression/build/reproducibility stages; historical contracts inspect it |
| `scripts/coverage-gate.sh` | **KEEP — ci-active** | kar-ci.yml, kar-work-pr.yml, kar-release.yml and release-pipeline.sh run this mandatory gate |
| `scripts/coverage-no-regression.cjs` | **KEEP — ci-active** | coverage-gate.sh runs it to prevent line, branch and public API regressions |
| `scripts/js-ast-loader.cjs` | **KEEP — ci-active** | runtime-api-inventory.cjs and v12319-coverage-report.cjs require the shared Acorn loader |
| `scripts/kar-atomic-patch.py` | **KEEP — ci-active** | kar-atomic-patch.yml exact-SHA guarded Work builder; kar-fast-patch.py imports shared implementation |
| `scripts/kar-fast-patch.py` | **KEEP — ci-active** | kar-fast-patch.yml exact-main guarded Fast PATCH process |
| `scripts/kar-issue-title.cjs` | **KEEP — ci-active** | kar-work-pr-contract.cjs requires this Issue identity validator |
| `scripts/kar-work-pr-contract.cjs` | **KEEP — ci-active** | kar-work-pr.yml uses exact-head Rolling Comment contract; preflight also imports it |
| `scripts/kar-work-pr-preflight.cjs` | **KEEP — ci-active** | kar-atomic-patch.yml uses SHA/issue/comment preflight |
| `scripts/package-oneclick-setup.py` | **KEEP — support-standalone** | tests/kar94-setup-package.cjs invokes --check; Windows end-user setup needs reproducible kit |
| `scripts/package.py` | **KEEP — ci-active** | kar-ci.yml, kar-work-pr.yml and release paths package the exact Chrome MV3 runtime |
| `scripts/public-api-probe-child.cjs` | **KEEP — runtime-test-support** | tests/v12319-public-api-execution-closure.cjs spawns this isolated public API probe |
| `scripts/release-finalize-gate.sh` | **KEEP — release-active** | release-pipeline.sh invokes this mandatory release-finalization safety gate |
| `scripts/release-notes.sh` | **KEEP — release-active** | kar-release.yml renders publication notes using this script |
| `scripts/release-pipeline.sh` | **KEEP — support-standalone** | release-supervisor.sh launches this sequence; historical release/architecture tests inspect it |
| `scripts/release-status-heartbeat.py` | **KEEP — support-standalone** | release-supervisor.sh invokes heartbeat snapshots for detached release operations |
| `scripts/release-supervisor.sh` | **KEEP — support-standalone** | historical and native release-supervisor operation supported by tests/v12310-release-supervisor-hardening.cjs |
| `scripts/release_finalize.py` | **KEEP — release-active** | release-finalize-gate.sh invokes it; requires scripts/source-layout.json exact path |
| `scripts/runtime-api-inventory.cjs` | **KEEP — ci-active** | coverage-gate.sh generates public API manifest; v12319-coverage-report.cjs uses its Acorn machinery |
| `scripts/source-layout.json` | **KEEP — legacy-but-required** | release_finalize.py reads exact scripts/source-layout.json for historical source closure; tests/v1237-version-architecture.cjs also loads it |
| `scripts/v12319-architecture-audit.cjs` | **KEEP — ci-active** | coverage-gate.sh runs this for architecture/cycle/no-regression evidence |
| `scripts/v12319-coverage-report.cjs` | **KEEP — ci-active** | coverage-gate.sh runs current authoritative public/line/branch report; supersedes older stdout-only analyzer |
| `scripts/verify_committed_chrome_zip.py` | **KEEP — ci-active** | kar-ci.yml, kar-work-pr.yml and release tests enforce byte-identical committed Chrome ZIP |
| `scripts/coverage-analyze.cjs` | **RETIRE — legacy superseded diagnostic** | Older stdout-only V8 coverage analyzer, not a current executable CLI/CI/release/docs contract. Canonical current gate is `scripts/v12319-coverage-report.cjs` and `coverage-no-regression.cjs`. The original Git blob `2844df747a127bbb227c496993e5ec7d902decfb` stays recoverable. The S1 test scans executable code for lingering references before acceptance. |

## Individual workflow decisions

| Workflow | Role/status | Evidence and decision |
| --- | --- | --- |
| `.github/workflows/kar-atomic-patch.yml` | **KEEP — ci-active** | workflow_dispatch and guarded work/KAR-* builder; invokes kar-work-pr-preflight and kar-atomic-patch.py |
| `.github/workflows/kar-ci.yml` | **KEEP — ci-active** | main push CI coverage, exact source-package parity and Chromium E2E |
| `.github/workflows/kar-fast-patch.yml` | **KEEP — ci-active** | main push with explicit guarded Fast PATCH marker; auto skip otherwise |
| `.github/workflows/kar-release.yml` | **KEEP — release-active** | explicit manual publication; approved gates and archive-release-zip.sh |
| `.github/workflows/kar-work-pr.yml` | **KEEP — ci-active** | PR exact-head Rolling Comment, runtime/safety, Windows and Chromium four-job gate |
| `.github/workflows/kar50-atomic-next-patch.yml` | **ALREADY RETIRED** | Dedicated KAR-50 one-shot push workflow; generic SHA-guarded Work PATCH remains. |

## Non-obvious retention decisions

1. `scripts/source-layout.json` is **not safe to move or delete** just because its mappings are historical. `release_finalize.py` still reads the literal path and `tests/v1237-version-architecture.cjs` asserts historical ownership. Any relocation would alter release-finalizer behavior and require a distinct safety acceptance.
2. The `v12319-*` filenames identify the historical design baseline but are **currently executed** by `scripts/coverage-gate.sh`. They are not obsolete.
3. `release-supervisor.sh`, `release-pipeline.sh`, `release-status-heartbeat.py` and `release_finalize.py` form a still-testable standalone recovery/finalization chain. The GitHub-hosted release workflow is not the sole possible consumer; therefore retaining them is conservative and necessary.
4. `scripts/package-oneclick-setup.py` is verified by KAR-94 tests; it must not be retired on the basis of age or previous Windows kit version.
5. Current main/Work/Release workflows have separate triggers and trust boundaries. They were left byte-identical; no permission, branch-filter, publishing or fail-open change.

## Proof and remaining limitations

- S1 introduces a fail-closed, automatic repository script/workflow inventory closure test in the existing `scripts/coverage-gate.sh`: all retained files must be present, the old analyzer and KAR-50 one-shots absent, no current executable source can refer to retired analyzer, the hard-coded release-finalizer layout dependency must remain intact, and original mandatory CI/workflow connections must be preserved.
- The full hosted `KAR Work PR` exact-head four-job run, 100% public function coverage, line/branch non-regression, real Windows fixtures, deterministic ZIP parity and packaged Chromium 9/9 are mandatory; **a successful prior D1 run does not satisfy S1**.
- Historic GitHub Issue/PR search and external-user manual invocations cannot be proved absent solely by in-repo grep, so this is a **bounded code-level retirement**, not a statement that no person ever ran the old diagnostic. Original Git history remains available for recovery. Do not delete additional scripts without stronger positive evidence.
