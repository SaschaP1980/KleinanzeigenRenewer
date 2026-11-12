# KAR-141 M2 — source reconciliation (staged only)

**Baseline:** `main@f3825c35633f94ba186f18d893871945241033f1`, production v1.23.44; approved runtime, manifest, lock, release spec and existing versioned ZIPs unchanged.

**Both original lineages retained:** original `work/KAR-99@6deb1f94acbc03894b8954ac6fda44357f4c8990` and final descendant `work/KAR-130@fef0eb414a33c8c65312c2fe64be374d6ef3f504` are **parents** of the reviewed integration commit, not deleted or force-replaced. Subsequent recovery must recheck exact SHAs and actual Work PR CI.

## Four-way tree evidence

Relative to the original shared v1.23.37 base `19d48a291c5779bfab94339334125de947b55918`:
- 35 staged-only paths from KAR-99/101→130 were ported byte-for-byte, **including the original staged `scripts/package.py`**: all three new safety modules are already included exactly once.
- 31 main-only paths from v1.23.39–44, including modern category, inventory reconciliation and KAR-141 normative process corrections, were retained byte-for-byte.
- Eight paths diverged: `manifest.json`, `package-lock.json`, `package.json`, `release/kleinanzeigen-renewal-chrome-v1.23.38.zip`, `release/release-spec.json`, and `tests/v12319-version-architecture.cjs`, `tests/v12320-final-closure.cjs`, `tests/v12322-version-release.cjs`.
- Current `main` is authoritative for all product-version metadata and binary artifacts; `package.json` remains 1.23.44 with all four latest main KAR-132/136/138 tests plus the thirteen earlier stage-only KAR99–130 regression tests. The three conflict tests combine existing modern-category/inventory contracts with old staged module/public-coverage/reachability checks.
- There is no evidence supporting a live updater lease or an independently verified all-owner IDLE snapshot: eight owner producers, durable remote outcome verification and atomic cross-worker arbitration remain outstanding.

## Validation boundary

This is a **source-preservation/integration PR only**, not an approved new product release. The 1.23.44 packaged ZIP deliberately remains unchanged. It cannot claim source-to-ZIP parity for the staged modules, and a failed full packaged E2E gate is a **real blocker** until P1–P8 security acceptance and P9 coherent new archive. Do not bypass ZIP parity or merge this PR into `main` before all mandatory gates are genuinely GREEN and the owner authorizes the required integration.

Recovery provenance: [KAR-141](https://github.com/SaschaP1980/KleinanzeigenRenewer/issues/141) and [single operative KAR-99](https://github.com/SaschaP1980/KleinanzeigenRenewer/issues/99). Retain all 19 predecessor Issues and 12 redundant Draft PRs until independently reconciled.

## Test-first duplicate packaging correction

- Initial integrated source `b0fa80f244e93dcbf4ae39f9020c55e4b014152d`: real Work CI [#42608566311](https://github.com/SaschaP1980/KleinanzeigenRenewer/actions/runs/42608566311) **3/4**, package verifier failed specifically with `KAR48_ZIP_PARITY_FAILED: empty/duplicate ZIP entries`. Cause: the first M2 integration added two already-present runtime module entries a second time.
- Regression-test-only commit `0ed81ac03587cea6ef6f362ddc3d084d6d65bc5c` registers `tests/kar141-m2-package-runtime.cjs` as a mandatory early `npm test` guard for unique runtime paths and retention of all 17 referenced security/current-main test suites. A real hosted RED is required before merging the fix.
- GREEN correction restores `scripts/package.py` **byte-for-byte from the existing, formerly staged `work/KAR-130` blob**. No changed product version, published ZIP, source module implementation or remote safety authority is implied. A later source/ZIP mismatch must stay a genuinely failing P9 gate until the complete updater-safety acceptance is achieved.
