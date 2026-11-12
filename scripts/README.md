# Build, test, packaging and release scripts

All script filenames in this directory are **public developer/CI command paths**. They are intentionally kept flat when invoked by workflows, package scripts, tests or release orchestration; moving files solely for visual tidiness would break those contracts.

- **Safety/coverage and architecture:** `coverage-gate.sh`, `coverage-no-regression.cjs`, `runtime-api-inventory.cjs`, `js-ast-loader.cjs`, `v12319-coverage-report.cjs`, `v12319-architecture-audit.cjs`, `public-api-probe-child.cjs`. These remain active regardless of historical version prefixes.
- **Exact Chrome ZIP:** `package.py`, `verify_committed_chrome_zip.py`, `build.sh`.
- **GitHub Work/Fast path:** `kar-atomic-patch.py`, `kar-fast-patch.py`, `kar-issue-title.cjs`, `kar-work-pr-contract.cjs`, `kar-work-pr-preflight.cjs`.
- **Release and recovery:** `release_finalize.py`, `release-finalize-gate.sh`, `release-pipeline.sh`, `release-supervisor.sh`, `release-status-heartbeat.py`, `release-notes.sh`, `archive-release-zip.sh`.
- **Windows packaging:** `package-oneclick-setup.py`.
- **Required historical layout contract:** `source-layout.json` is consumed by the release finalizer and historic tests, so it must remain at its exact path.

For **every file's consumer and KEEP/RETIRE decision**, see [KAR-167 S1 audit](../docs/maintenance/SCRIPTS_WORKFLOWS_AUDIT.md) and its [machine-checkable manifest](../docs/maintenance/SCRIPT_WORKFLOW_INVENTORY.json).

The older `coverage-analyze.cjs` stdout-only diagnostic was retired under #167 after the authoritative `v12319-coverage-report.cjs` plus `coverage-no-regression.cjs` replaced its role. Historical Git blobs remain available; no release or application runtime code was changed.
