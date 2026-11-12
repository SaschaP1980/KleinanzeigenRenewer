# KAR-167 R1 — Final cross-tree release/runtime/Windows disposition audit

**Pinned baseline:** `main@a1f7878c87deee96d8da1f0ee6c6d1215e9fcfa3`, **current source basis for R1:** `work/KAR-167@e8818d6c8f99b1b6ebc6a81fdd2be77550e44b0e` with original `main@e5b1ebceab4bd16116f1cd6532f08e56e1cdfde2` incorporated (product v1.23.59). A separate later exact-head CI acceptance is required before this stage is GREEN.

## The complete file-by-file answer

The companion [REPOSITORY_FINAL_INVENTORY.json](REPOSITORY_FINAL_INVENTORY.json) contains **all 798 files** tracked at the pinned pre-R1 Work HEAD, each with its **exact path, byte count, Git blob SHA, disposition and reason**. It also maps the **30 physically relocated** historical paths to their unchanged binary Git blobs and separately documents three genuinely retired old source paths. There is no unsupported claim that an old filename alone makes a file obsolete.

| Directory / group | Files (pre-R1) | Verified decision |
| --- | ---: | --- |
| Root | **12** | Preserve manifest/version/key, APP_ID, HTML/CSS, npm, release docs and `.gitignore` at stable canonical paths |
| `.github/` | **8** | Five current Work/main/release/fast workflows and three governance/support entries; no trigger/permission edits |
| `src/` | **103** | Every source JavaScript module is explicitly included in `scripts/package.py`'s Chrome runtime list; current architecture/reachability gate must still pass |
| `release/` | **41** | Retain 37 Chrome ZIPs v1.23.23…v1.23.59, one standalone Windows OneClick setup ZIP v1.23.36, its SHA-256 receipt, release-spec JSON and approved-channel JSON |
| `tools/windows/` | **7** | Retain PowerShell, C# NativeHost and CMD launcher sources required by Windows installer/OneClick tests and docs |
| `lib/` | **1** | Retain `update-idle-policy.js`, independently required by KAR-97 fail-closed update policy tests; not a Chrome runtime member |
| `coverage/` | **2** | Gold v1.23.19 100%-public/line/branch floor and living safety-critical API map, protected by T1 |
| `tests/` | **508** | 506 original T1 test/fixtures plus T1 index and guard; preserve all proven historical and current contracts |
| `scripts/` | **25** | S1's 24 active/independent tools plus README, no additional deletion justified |
| `icons/` | **21** | 13 packaged icons, seven compatibility variants and index, unchanged binary paths |
| `assets/` | **3** | Two full original raster masters, byte-for-byte Git-identical to historical `icons/` paths, and provenance index |
| `docs/` | **67** | Normative files, historical QA/architecture, Windows manuals, indexes and per-stage evidence; D1 original Markdown pointers preserved |
| **Total** | **798** | Every pinned pre-R1 source path has a classified disposition; new R1 audit/inventory/guard are additions, not unexplained replacements |

## Release/ZIP and Windows-channel acceptance boundary

- Historical Chrome ZIP filenames are **contiguous** from **v1.23.23 to v1.23.59**, **37 files**. Together with the OneClick setup kit, there are **38 ZIPs**; `release/` has **41 tracked files / 28,351,803 bytes**. No archive is re-created, rewritten, relocated or deleted during R1. Historical ZIPs are **source-of-truth committed release evidence**, not temporary build output.
- The approved v1.23.36 Windows OneClick setup kit is a **separate reproducible package** containing exactly four Windows tool files (`OneClick-Einrichtung.cmd`, `Manage-KleinanzeigenRenewer-OneClick.ps1`, `OneClick-Update-KleinanzeigenRenewer.cmd`, `KleinanzeigenRenewer-Updater.ps1`). `scripts/package-oneclick-setup.py --check`/KAR-94 verify its original bytes and matching `.sha256` receipt. The new R1 guard independently checks SHA-256 and byte size.
- **The approved Windows updater channel is intentionally v1.23.37**, while source and committed current extension ZIP are **v1.23.59**. A source version advance **does not** authorize a native updater-channel approval change. `release/windows-updater-channel.json` retains `channel=approved`, its explicit previous archive digest and extension ID; the new guard validates its archive/hash as a relationship, without permanently forbidding a future *separately authorized* channel change.
- `release/release-spec.json` is a **current, live** version, architecture and safety contract and is checked against `manifest.json`/`package.json`. It is not a stale generated file safe to retire just because its name includes “release”.
- The Chrome ZIP's true packaging subject is **the exact committed file**, not a fresh ad-hoc build. [KAR Work PR](https://github.com/SaschaP1980/KleinanzeigenRenewer/actions/workflows/kar-work-pr.yml) clean-rebuild byte-parity and packaged Chromium E2E must remain **independent** of this audit test.

## All 103 `src/` runtime modules accounted for

- `scripts/package.py` contains **103 distinct literal `src/**/*.js` runtime members**, exactly equal to the **103 tracked source JavaScript files** in `src/app`, `src/background` (controllers/services/repositories/lib), `src/content`, `src/popup` and `src/shared`. No unbundled source module can be established from the current canonical package inventory.
- The manifest names its service worker and content scripts; `app.html`/`popup.html` name UI scripts. The packager validates declared script and `importScripts` closure. The separate `v12319-architecture-audit.cjs` and Dynamic Public Function Coverage execution tests validate reachability/no cycles/observed API contracts. **Being listed in the ZIP alone is not proof that a function is reached at runtime**; these separate gates provide the corresponding evidence.
- Removing or moving any source file without updating those contracts would change the installed extension and lies outside #167 file hygiene. No runtime refactor, package source module deletion or version bump was justified.

## Seven Windows tools and one test-only library

| Retained file | Verified source owner/consumer |
| --- | --- |
| `tools/windows/Install-KleinanzeigenRenewer-NativeHost.ps1` | `tests/windows-native-host-wave1.ps1`, standalone native host install/verify/uninstall |
| `tools/windows/KleinanzeigenRenewer.NativeHost.cs` | Native Host installer compiles/installs this specific C# implementation |
| `tools/windows/KleinanzeigenRenewer-Updater.ps1` | Windows KAR-59 fixture, NativeHost installer and v1.23.36 OneClick reproducible kit |
| `tools/windows/Manage-KleinanzeigenRenewer-OneClick.ps1` | v1.23.36 kit, Windows OneClick install/ownership fixture |
| `tools/windows/OneClick-Einrichtung.cmd` | Standalone setup kit and KAR-94 SHA/identity tests |
| `tools/windows/OneClick-Update-KleinanzeigenRenewer.cmd` | Exact OneClick kit, launcher lifecycle and Windows fixture |
| `tools/windows/Update-KleinanzeigenRenewer.cmd` | Historical Phase-1 Windows manual and separate manual updater entrypoint |
| `lib/update-idle-policy.js` | `tests/kar97-update-idle-policy.cjs`; **test-only** fail-closed update-idle rule, not packaged runtime |

None is proven unused. The hosted Windows tests use disposable fixtures; they **do not constitute real corporate Windows or Chrome profile acceptance**.

## Exact repository path/byte deltas — no misleading “space savings”

| Metric | Historic v1.23.57 main | Current pre-R1 Work | Difference |
| --- | ---: | ---: | ---: |
| Tracked files | **768** | **798** | **+30** |
| Tracked file bytes (sum of Git tree blob sizes, excluding Git history/pack compression) | **34,404,292** | **36,523,637** | **+2,119,345** |
| Root-level files | **40** | **12** | **−28** |
| Physical old paths absent | 0 | **33** | **30 relocated**, **3 retired** |
| Physically retired working-tree source bytes | 0 | **11,889** | Does **not** reclaim Git history |

The old main baseline precedes two later committed v1.23.58/v1.23.59 ZIPs, Windows/update work and the new hygiene evidence. The modern pre-R1 `main@e5b1ebce...` already contains **771 files / 35,971,839 tracked bytes**. These historic-to-current total differences are **not** bytes “saved by hygiene”. Moved architecture JSONs and high-resolution art retain the **same Git blobs**, so neither relocation saves blob storage. Newly added manifests/docs increase tracked file bytes. The three removed obsolete scripts/workflow together account for **11,889 bytes removed from checked-out active paths**; the original Git history still retains their objects.

All 30 original moves (28 architecture JSONs and two untouched raster PNG masters), 3 retired paths, their source Git blob SHAs, complete current path inventory and reason codes are in the JSON. Previously moved full-text QA/Windows docs have their separate [D1 compatibility map](DOCS_RELOCATION_MATRIX.md).

## Permanent R1 safety and final acceptance

`tests/kar167-final-repository-closure.cjs` runs inside the existing mandatory `scripts/coverage-gate.sh`. It proves every original **798** pinned pre-R1 file path persists; all 30 relocated immutable content blobs match their original Git SHA; all three proven retired paths are absent; all 37 original Chrome ZIPs and one Windows kit ZIP retain exact original Git blobs/length/signatures; kit receipt SHA256 matches the actual package; updater-channel approval/hash/extension ID point to a committed archive; the seven Windows tools have concrete script/test/guide owners; the test-only KAR-97 library is retained; every original Chrome `src/` module remains and **every actual current source JS file is packaged**. Future newly packaged modules are supported without freezing their editable source hashes.

The existing D1/S1/I1/T1 checks remain mandatory. The exact Work HEAD must pass all **four** GitHub jobs, including Dynamic Public Function Coverage **100%**, line/branch area floors, deterministic committed ZIP clean-rebuild and **9/9** real packaged Chromium E2E before R1 can be checked off.

## Deliberate KEEP/UNKNOWN and final owner boundaries

- **No further runtime, release ZIP, Windows tool or test file is proven disposable.** No R1 file deletions were performed. Seven nonpackaged icon variants retain `KEEP_UNVERIFIED_COMPAT` because external/manual links have not been disproven. Other historic documents and tests retain their source value.
- **D1 exhaustive historic GitHub Issue/PR/deep-link reference census is still open.** Existing nine Markdown compatibility entrypoints work, but this audit does not invent a complete external-link census. Binary old paths under `icons/` cannot be redirected by Markdown; pinned old commits and blob SHA map are the recovery mechanism.
- `main` merge, Issue closure, new GitHub Release/tag, Chrome-profile operation, native user-PC installation and live Kleinanzeigen account operations remain **separate explicit-owner gates**.

### Hosted synthetic future-PATCH regression exception (bounded)

The first R1 exact-HEAD [KAR Work PR run #43286295103](https://github.com/SaschaP1980/KleinanzeigenRenewer/actions/runs/43286295103) failed closed while the KAR-46 test executed its isolated **prospective next-PATCH** fixture, not because a real historical ZIP was missing: the fixture intentionally updates manifest/package/spec without fabricating the next-version committed archive. The R1 guard now omits **only the next-version ZIP-presence assertion** if `KAR46_SYNTHETIC_PATCH=1`; all 38 original ZIP Git hashes, approved Windows-channel SHA256, exact setup receipt and immutable reference files remain mandatory in that fixture. On a normal Work/main checkout the current version must still have its exact committed ZIP, additionally verified by the independent clean-build + packaged Chromium job. No runtime, original artifact or approval metadata is altered.
