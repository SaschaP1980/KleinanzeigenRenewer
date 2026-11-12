# Tests and fixtures: execution ownership

Tests are source-level regression evidence; many preserve the historical version in their filenames. An old version identifier is **not** evidence that a test is safe to delete.

- **Automated entrypoints:** `npm test` in [package.json](../package.json); [build.sh](../scripts/build.sh); mandatory [coverage-gate.sh](../scripts/coverage-gate.sh); hosted [Work PR](../.github/workflows/kar-work-pr.yml), [main CI](../.github/workflows/kar-ci.yml) and [Release](../.github/workflows/kar-release.yml).
- **Browser/MV3 E2E:** [e2e/README.md](e2e/README.md), the isolated supervisor/child and the permanent [v1.21.15 Gold reference](e2e/gold-v1.21.15.json).
- **Windows fixtures:** `windows-updater-phase1.ps1`, `windows-native-host-wave1.ps1`, `windows-oneclick-shortcut.ps1`; current GitHub Windows Work job executes these in disposable test mode.
- **Indirect source-surface/test-only helpers:** `*-source-surface.cjs`, `current-patch-policy.cjs`, `kar50-next-patch.cjs` and synthetic RED/negative test fixtures. These are dependencies, not ordinary standalone runnable suites.
- **Safety-critical negative evidence:** see the [living critical API map](../coverage/safety-critical-public-apis.json) and permanent [coverage floor](../coverage/coverage-baseline-v1.23.19.json).

For **every original test's Git blob SHA, byte size, top-level invocation or documented manual/indirect KEEP reason**, read the [T1 inventory](../docs/maintenance/TEST_COVERAGE_INVENTORY.json) and [audit](../docs/maintenance/TEST_COVERAGE_AUDIT.md).

The new T1 gate preserves the original **506** tracked test/fixture paths and permits new, intentionally wired tests. No historical tests are removed merely because a filename looks old or the test is not part of a particular hosted command.
