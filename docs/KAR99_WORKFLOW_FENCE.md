# KAR-99 Wave 03B — MV3 Workflow Admission / Lease checkpoint

## Bounded implementation (not a usable updater)

The background worker now instantiates `KRUpdateWorkflowFence` and routes conservatively classified mutating message actions through its centralized admission check. The admission check serializes read of `chrome.storage.local.nativeUpdateWorkflowFenceV1` and the admission decision. It does **not** hold its mutex while asynchronous workflow handlers run, so nested content-script/background messages do not deadlock. It counts those in-flight operations so a concurrent candidate acquisition is rejected.

A versioned reserved lease is storage-backed; a held, expired, cancelled, malformed, unknown or unreadable lease blocks new mutating route admission, including after MV3 worker restart. Cancellation persists a tombstone; it is not equivalent to automatically unlocking. A later verified recovery action is required. The reservation API also checks the KAR-97 15-owner candidate snapshot, worker generation and profile coherence when a trusted provider is supplied.

**Production caveat:** The running worker has **no trusted all-owner snapshot producer yet**, so it does not provide the provider or policy to this service and **cannot acquire an update lease**. No message route exposes reserve, cancel, recover or privileged Windows apply. This is intentional until all autonomous recovery/start paths and owner sources are mapped and fenced. A preexisting lease marker is denied by the router, but some autonomous starts (service-worker startup recovery, tab observer, watchdog, direct controller callbacks) do **not** traverse the message router. The present change must **not** be described as complete cross-workflow fencing or permission to update with Chrome open.

## Current route admission classification

Read-only or essential browser safety routes bypassed: `GET_NATIVE_UPDATE_STATUS`, `GET_BACKGROUND_EPOCH`, `GET_PLATFORM_ACCESS_RESTRICTION`, `PLATFORM_ACCESS_RESTRICTED`, `GET_PROFILE_STATE`, `LIST_INVENTORIES`, `LIST_TRASH`, `OPEN_APP_WINDOW`, `GET_APP_NOTICE`, `GET_DIAGNOSTICS`.

Every other registered message route is admitted through `withWorkflowAdmission`. This is a conservative over-block policy while a held lease exists; it can prevent some safe maintenance until a future reviewed classification exists. Without a held lease, normal handlers remain unchanged after a successful, fail-closed storage read.

## Required additional mapping before production acquisition

- **MV3 startup/autonomous flows:** `ensureBulkRuntimeRecovery`, `resumePendingRenewals`, `resumeMassRenewalBatch`, `resumePendingArchiveInsertions`, `bulkRunWatchdogTick`, tab lifecycle observer and publish detection callbacks.
- **Controller or content-initiated async transitions:** mass renewal `startNextMassRenewalItem`, tab automation and bulk worker continuations, platform safety emergency reset and profile/account transitions.
- **Snapshot owners:** all 15 owners in `lib/update-idle-policy.js`. A missing authoritative source, pending state, failed storage read or unknown worker/profile generation must block reserve.
- **Future native handoff:** independent user consent, origin-bound nonce/transaction, correct actually-loaded unpacked folder, safe atomic file replacement, journal/rollback and positive Chrome reload/activation proof. Existing `RequireIdle` and NativeHost read-only `health/check` remain unchanged.

## Validation

`tests/kar99-workflow-fence.cjs` is registered in npm test. It covers missing provider, storage read/write failures, active/missing KAR97 owner, duplicate/competing reservations, delayed in-flight workflow start, reserved/expired/cancelled state after recreation, ownership mismatch, explicit recovery and router integration. Exact Work PR CI gates, packaged Chromium and Windows updater tests must be GREEN before any merge.

This file is an honest **partial architecture checkpoint** toward KAR-99; leave unproven full-coverage Issue criteria OPEN. No new Chrome-update/install UI or changes to Windows NativeHost, updater channel, permissions or extension identity.
