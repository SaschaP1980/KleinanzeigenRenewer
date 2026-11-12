# KAR-167 T1 — Test and coverage ownership, execution and retirement audit

**Starting point:** `work/KAR-167@5c4d256608f81b7b4deb7c802661d05a77b161ea` based on `main@e5b1ebceab4bd16116f1cd6532f08e56e1cdfde2` (product v1.23.59). T1 does **not** introduce new product/runtime logic or a version change.

## Complete baseline inventory, by evidence class

The [frozen, machine-readable 506-file inventory](TEST_COVERAGE_INVENTORY.json) records each original `tests/` path, Git blob SHA, byte count, classification, and every confirmed current top-level referencing entrypoint. It also records the two tracked `coverage/` contracts. It is a historical snapshot, not a replacement for reading current GitHub state.

| T1 class | Number | Classification and disposition |
| --- | ---: | --- |
| Directly referenced by `package.json`, `scripts/build.sh`, coverage gate or hosted CI | **483** | **KEEP.** These are literal references from live commands. Not every optional or conditional workflow step necessarily runs on every PR. |
| Indirect test-only helpers | **13** | **KEEP.** Versioned `*-source-surface.cjs` modules reconstruct historical source ownership/lexical evidence; `current-patch-policy.cjs` and `kar50-next-patch.cjs` export test utilities. Not standalone executables. |
| Indirect isolated fixtures | **2** | **KEEP.** KAR-46 synthetic next-PATCH fixture and KAR-52 bounded patch-builder policy proof, referenced by their historical parent tests. |
| Independently operable historical tests, not referenced by these six top-level commands | **6** | **KEEP.** A missing direct CI invocation is **not** proof that a test is obsolete. See below. |
| Permanent browser/MV3 Gold reference | **1** | **KEEP IMMUTABLE.** `tests/e2e/gold-v1.21.15.json` retains fixed extension identity and original runtime/ZIP SHA evidence. |
| Browser E2E operating manual | **1** | **KEEP.** `tests/e2e/README.md` documents isolated Chromium execution, strict infrastructure failures and manual invocation. |
| **Total original tracked `tests/` files** | **506** | **All retained, zero files deleted.** |

### Confirmed top-level consumers

- `package.json` references **461** distinct `tests/` paths; `scripts/build.sh` references **421**. These sets overlap and must not be summed.
- `scripts/coverage-gate.sh` runs `npm test`, the original KAR-167 D1/S1/I1 tests, public API coverage report, architecture and no-regression checks. T1 adds a further test guard **after** `npm test` without replacing existing suites.
- `.github/workflows/kar-work-pr.yml`, `kar-ci.yml` and `kar-release.yml` invoke additional tests, Windows PowerShell fixtures, historical negative proofs and real isolated Chromium test supervision. Windows paths have native backslashes; inventory normalizes only for reference matching.
- `tests/e2e/run_browser_e2e_supervisor.py` launches the real Playwright scenario child `run_browser_e2e.py` with isolated profiles and timeout/cleanup evidence. The current Work PR executes its **nine packaged Chromium scenarios**; the Gold v1.21.15 JSON is preserved as a historical compatibility reference, not silently replaced by v1.23.59 outputs.
- `coverage/safety-critical-public-apis.json` currently names **15** critical public methods and **17 distinct** negative/fail-closed test paths; they all remain present.

### Six standalone/historical checks without a confirmed current six-entrypoint invocation

These were explicitly read and independently classified, not declared unused:

| Path | Why retained |
| --- | --- |
| `tests/current-patch-policy-regression.cjs` | Future-PATCH policy transitions and negative cases |
| `tests/kar46-work-pr-e2e-contract.cjs` | Exact-head browser artifact and negative attestation contract |
| `tests/kar48-archive-negative.py` | Independent archive/missing/collision fail-closed cases |
| `tests/kar48-zip-only-contract.cjs` | Archive-only E2E integration and verifier self-test |
| `tests/kar50-next-patch-contract.cjs` | Historical dynamic next-PATCH consistency and metadata |
| `tests/kar52-work-path-contract.cjs` | Work path, Rolling Comment and bounded SHA-safe PATCH builder |

Historical tests often encode **negative evidence**, so removing them merely because they are not in `npm test` would weaken independent reproduction/recovery. No defensible file-level deletion was established in T1.

## Immutable tracked evidence versus generated coverage output

The only two **originally tracked** `coverage/` files are:

- `coverage/coverage-baseline-v1.23.19.json` — checked-in **Gold floor**: dynamic public-function coverage **100%**, plus area-by-area line/branch floors. Its original Git blob SHA (`2d1ccf036c9d3e52e4e3f31212c852886eeda2ea`) is checked byte-for-byte by T1. Current line/branch coverage may exceed, but never regress below, these floors.
- `coverage/safety-critical-public-apis.json` — living security evidence map. Additions/changes are allowed only with real negative/fail-closed tests and appropriate engineering review. T1 checks the referenced source modules and tests but deliberately does **not** freeze its entire hash against future safety improvements.

Generated `coverage/raw/`, `coverage/public-api-manifest.json`, `coverage/coverage-summary.json`, branch/line/module outputs and architecture report are **ignored** in `.gitignore` and regenerated for every hosted coverage-gate run. They must not be mistaken for committed obsolete files.

## Permanent T1 executable guard and scope

- New `tests/kar167-test-coverage-closure.cjs` runs inside the mandatory `scripts/coverage-gate.sh`. It verifies **all 506 original paths still exist**, **483** direct/hosted source references still resolve, non-direct file roles remain explicitly classified, and all six top-level invoking files have no missing test path.
- It pins the exact Git blob contents of the immutable **v1.23.19 coverage floor** and **v1.21.15 browser Gold**, checks 100% public/area floors and currently present critical API/negative-test coverage, validates generated coverage `.gitignore` boundaries, and retains the existing report/no-regression/E2E gate chain.
- The baseline inventory is **not an automatic ban on new tests**: future test executables may be added under current live entrypoints; new test-only helpers need an explicit inventory update with a justification. Historical tests cannot be deleted silently without revisiting this baseline.
- The inventory stores each historical Git blob hash for provenance but **does not hash-freeze every active test**, since legitimate bug fixes can update regression cases. The strict hash floor applies only to the two immutable Gold evidence files.
- There is no current evidence sufficient to safely remove a historical test/fixture. **T1 intentionally deletes zero tests**. This is an evidence-driven cleanup outcome, not an unfinished or unverified deletion campaign.

**Acceptance gate:** hosted KAR Work PR at the exact new SHA, full 4/4: Issue/Rolling contract, runtime/100% dynamic public API/no-regression, Windows native/updater safety, Chrome v1.23.59 committed ZIP clean-rebuild byte parity and Chromium packaged 9/9. No real Kleinanzeigen or Windows user-profile operation, no automatic merge or release.
