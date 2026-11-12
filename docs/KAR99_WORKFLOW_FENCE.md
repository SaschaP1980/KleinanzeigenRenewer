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

## P1.3 independent offline Windows update-journal witness (negative-only)

`tools/windows/Inspect-KleinanzeigenRenewer-UpdateTransaction.ps1` is a separate Windows PowerShell 5.1 read-only helper. It checks the fixed local Windows-updater `State/pending.json` path **without** modifying files, creating State or lock files, writing logs, executing another process, consulting the approval channel, performing network I/O, acquiring an update lease or touching Chrome. A journal's presence, even malformed or stale, yields `status=blocked journal=present`; absence yields `status=unverified journal=absent`; an unreadable/unknown location yields `status=unverified journal=unknown`. Every response states `nativeOutcomeVerified=false eligibleForLease=false`; no user-supplied path is accepted except an isolated CI-only test root under the OS temporary directory.

The bundled v1.23.36 OneClick installer and its original `KleinanzeigenRenewer-Updater.ps1` **remain byte-identical**; the frozen package is not rewritten. This standalone inspector is **not exposed through the existing Chrome NativeHost protocol**, which still supports only `health` and `check`. A journal's absence cannot prove a completed origin-bound transaction or no concurrent native apply/rollback; the host and extension lack shared transaction IDs, tokens, generation-scoped independent receipts and worker-wide IDLE proof. No real update, recovery, installation, release or account operation is enabled.

The dedicated hosted PowerShell test `tests/kar99-p13-windows-journal-inspection.ps1` verifies the missing, present, malformed and disappearing journal states and that the observer leaves no lock/event log or modified journal bytes.


## P1.3 NativeHost journal/lock negative witness (not transaction authority)

The Windows Native Messaging host accepts an additional, fixed-shape, **read-only**
`inspect_transaction` request only from the original allowed extension origin
and only with the existing protocol/requestId/operation fields. Unlike `check`,
it never launches PowerShell or another process. It independently checks only
the fixed local `State/pending.json` and `State/updater.lock` metadata twice.
Any observed artifact blocks. Missing artifacts remain **unverified**, never
`idle`, `success`, or a positive native transaction outcome; errors, invalid
test roots and inaccessible metadata remain **unverified/unknown**. Its bounded
reply has no paths, credentials or transaction contents and permanently states
`nativeOutcomeVerified=false`, `rollbackVerified=false`, and
`eligibleForLease=false`. CI-only root overrides require both hosted CI mode
and the existing NativeHost test gate, and are constrained to an OS TEMP child.

NativeHost `health` declares the third native read-only capability accurately.
The extension-side native gateway remains limited to `health/check` (including
strict backward compatibility for already-installed legacy hosts with two
capabilities). The application UI does not invoke `inspect_transaction`; there
is no new Chrome permission, updater file mutation, update action, lease,
rollback operation, or native installation. Neither the presence nor absence of
a legacy Windows file establishes a transaction identity, origin-bound nonce,
completed apply/rollback, Chrome activation, previous MV3-generation IDLE or
all fifteen owner closure. This is strictly a negative native observation
checkpoint toward the still-unimplemented independent transaction oracle.

## P1.3 F2 — binding explicit remote intent tokens to actual P8 callback records

The private `KRTrustedOwnerAuthority` now rejects a remote Phase-4 delete or
publish intent that carries `admissionToken` unless the *same immutable*
`karAtomicAdmissionStartV1_<token>` and `karAtomicAdmissionFinishV1_<token>`
records exist and agree on token, original worker generation, permitted
operation type and chronological containment of the remote intent creation.
The same token cannot authorize two independent remote attempts, even across
journal families. Missing, swapped, malformed and temporally contradictory
records deny with `KR_OWNER_JOURNAL_ADMISSION_UNVERIFIED`; the P8 Web Locks
boundary preserves that precise fail-closed reason. Existing tokenless legacy
attempts retain the pre-existing historical remote-resolution check, but do
**not** acquire any token-bound provenance, intergenerational IDLE or native
transaction authority. Neither a P8 callback finish nor a remote-resolution
row certifies the current live Kleinanzeigen account; the production 15-owner
positive source producer is still missing. This change adds no updater or
native transaction route, consent, lease, release or live-account mutation.
