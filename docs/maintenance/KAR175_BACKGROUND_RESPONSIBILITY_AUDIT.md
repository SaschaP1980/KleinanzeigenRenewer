# KAR-175 Background Entrypoint Audit — Wave 1

## Verified sources

- Current extraction base `main@558cdd23670cf478d647c61f225b51aeb81f4745` (v1.23.89, following KAR-134 integration).
- Original Issue baseline `e276466c242eae096c7b6b4cb569021ae84668ab`: 3,586 lines, 212,282 JS characters.
- Updated pre-extraction baseline `558cdd23670cf478d647c61f225b51aeb81f4745`: 3,586 lines, 213,227 JS characters.
- External editor/tool maximum and its effective units remain **unverified**; do not treat the historical 3,586-line ceiling as a confirmed CI guard.

## Ownership map

| Baseline region (approximate) | Concern | Owner / next decision |
| --- | --- | --- |
| 1–138 | `importScripts`, `KRDeps`, constants, epoch wiring | Entry point |
| 139–460 | Renewal configuration, correlation, safety and lazy factories | Composite; audit downstream boundaries in future Waves |
| 461–835 | Tab registry, diagnostics, platform safety, profile and storage adapters | Existing controllers/services; no change this Wave |
| 835–1030 | CDN source selection, MIME/dimension/hash, single-flight atomic inventory capture | **InventoryCaptureService**, in-process module |
| 1031–1700 | Local inventory/trash, bulk lifecycle and read-only capture | Future owner-mapping / characterization |
| 1701–2900 | Renewal, archive, remote evidence and recovery | Protected remote mutation/safety; avoid casual extraction |
| 2901–end | Cross-worker admission, routing, Chrome lifecycle and restart | Entrypoint routing/setup; keep existing gates |

## Wave 1

- `src/background/services/inventory-capture-service.js` owns CDN URL validation, JPEG variant fallback, MIME signatures, pixel-dimension evidence, SHA-256 integrity and single-flight save orchestration. It accepts explicit schema/diagnostic/atomic-commit/broadcast dependencies via `create(options)` and exports only `saveInventory`.
- `InventoryRepository.commit` still owns the complete IndexedDB atomic transaction; no storage keys or data shape changed. All original image checks, diagnostic names, messages, and retry/failure decisions are retained.
- `background.js` keeps the original `saveInventory(extracted, options)` facade for manager/content/bulk callers and adds only lazy composition/registration. No new worker or IPC boundary.
- `scripts/package.py` includes the provider before the background entrypoint; `manifest.json` remains untouched.
- New isolated test runs image/schema/commit/error/concurrency contract. Full versioned CI/packaged Chromium E2E and 100% public function coverage remain **pending**, not claimed.

## Completion ledger (not yet accepted)

- Final before/after UTF-8 **bytes**, characters, physical lines, full function map, module count, and verified tooling ceiling: pending.
- Required **>=30%** reduction and preferred `<150,000` chars / `<2,500` lines: pending subsequent Waves.
- Independent maximum-size CI guard: pending verification of actual external size limit.

## Wave 2 — inventory public-status and edit-tab refresh coordination

- Extract `checkInventoryOnlineStatus(message)` and `refreshInventoryRecord(message)` together. They share the same local inventory record identity, selected live-account gate, public evidence interpretation, diagnostics and persisted record updates.
- New `src/background/services/inventory-refresh-service.js` exports exactly two observable operations via the existing `KRDeps` in-process factory. The entrypoint retains both original async facades and uses lazily composed explicit function and configuration dependencies.
- Preserved without changes in the moved implementation: strict numeric ad ID, public evidence verification/uncertainty, live selected profile gate, concurrent bulk/renewal locks, edit-worker bootstrap and bounded retry, owner-card read-only expiry enrichment, atomic save through existing inventory owner, renewal re-verification and worker-tab cleanup on both success/error.
- No new Chrome permissions/messages, storage format, account changes, updater authority or publication decisions. No new independent workflow owner or release.
- Wave 2 dedicated observable tests cover preflight rejection, online confirmed/pending, locked operation and worker success/failure cleanup. Full CI/packaged browser proof is pending, not inferred from static ownership.

## Wave 3 — fresh-tab public renewal evidence coordinator

- A single cohesive owner `KRRenewalPublicEvidenceCoordinator` now coordinates **read-only** public verification: fresh tab creation, exact-ID/target navigation readiness, guarded read-only metadata, canonical/direct fallback, identity-bound My Ads proof and uncertainty classification. These operations previously occupied 21,916 characters across ten closely related functions in the entrypoint.
- Internal helpers remain private; only three actual cross-owner operations are public: `probeFreshRenewalPublicUrl`, `renewalEvidenceFailureClass`, `resolveRenewalPublicEvidence`. Their previous `background.js` signatures and error behavior are thin compatibility facades.
- Dependencies are explicit five-port in-process factory bindings (tab/navigation lifecycle, diagnostics/correlation, account/safety policy, existing read-only evidence, timeouts/constants), no new messaging or thread.
- Important invariants moved unchanged: off-target failure classified fail-closed, platform restrictions propagate, fresh verification tab closed in `finally`, My Ads account-name and exact numeric ID checks, no public-not-found optimistic confirmation and no remote posting/deletion. The downstream inventory refresh's verified/uncertain logic remains unchanged.
- Existing v1.23.19/v1.23.20/v1.23.22 source/module/public coverage guards now enumerate this explicitly registered/packaged owner rather than altering frozen historical Gold.
- Full exact-head CI and packaged E2E **pending**, not presumed from this source extraction.

## Wave 4 — retry-safe renewal phase 1 admission

- Moved the three coherent retry rules (`phase1PublishBoundaryReached`, `canRetryRenewalPhase1`, `restartRenewalPhase1Attempt`) to `KRRenewalPhase1RetryService`; exported only the two previously consumed methods, kept original signatures in background as lazy in-process facades.
- All original phase-one publish-boundary hard stops, per-session attempt budgets, persisted fill/renewal records, fresh target-tab ownership registration, old-tab retirement, failed-retry diagnostics and `finally` in-flight cleanup remain unchanged.
- **Emergency-reset state authority preserved:** `renewalPhase1RetryInFlight` remains the same Set instance in background (also passed to `WorkflowEmergencyResetController`); injected into the service, never shadowed.
- No publish-click, remote delete, account binding, update authority or storage schema changed. Dedicated test exercises positive/negative budget, already-published hard-stop, same-session record updates, failed tab open and retry-in-flight cleanup.
- Source change does not infer native verification or final Chrome ZIP parity.

## Wave 5 — publication intent authorization and independent proof

- `KRPublishIntentAuthorizationService` now owns the same three strict, interdependent security actions: `authorizeAutomaticPublish` (admission receipt and account recheck before permit), `resolveManagedPublishIntent` (durable journal resolution) and `verifyAutoPublishRemoteOutcomeFresh` (independent exact-ID My Ads evidence). Original external signatures retained as lazy composition-root facades.
- This is an explicit safety/receipt ownership boundary, not a generic utility move. Existing code was relocated unchanged, with explicit session, live-account, tab, journal and URL/config ports.
- Maintains immutable admission receipt check, valid sender origin/page, same fill/workflow/profile/source binding, exact remote Ad ID, two independent account observations around journal begin and around full pagination scan, and fresh verification-tab `finally` close. No publish click was introduced and missing/ambiguous evidence still denies.
- Focused tests cover invalid admission/source/sender/session, mismatched proof/account, durable journal permit and read-only verification cleanup. CI still required, no live account action undertaken.

## Wave 6 — manual listing navigation and read-only diagnostic correlation

- `KRManualListingNavigationController` owns the existing open-edit and open-readonly browser workflows, retaining exact numeric Ad ID check, expected same-ad public URL preference, ID-only fallback, user-visible tab focus and pending-load diagnostics. Browser tab creation/diagnostic code was relocated unchanged; UI message names and return values stay behind background facades.
- `KRDiagnosticCorrelationService` owns the existing read-only session correlation enrichment for client diagnostics (fill, renewal, archive, mass batch, bulk). Operation-ID short circuit, backing storage key names, tab-ID matching and no-write policy preserved unchanged. Internal `correlationContextFromBindings` remains private.
- Both use explicit trusted ports and do not grant any new account/worker/updater authority or mutate remote data. Observable positive and failure tests added. This moves ~7,350 source characters from the oversized entrypoint.
