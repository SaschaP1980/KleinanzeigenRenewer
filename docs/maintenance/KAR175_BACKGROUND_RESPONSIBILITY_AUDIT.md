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
