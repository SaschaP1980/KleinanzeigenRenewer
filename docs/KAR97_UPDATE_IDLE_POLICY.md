# KAR-97 — Fail-closed update-idle candidate policy (Wave 03A)

**Status: tested candidate classifier only. Not a permission to install or reload an extension.**

The pure `src/background/services/update-idle-policy.js` module accepts a versioned, strictly shaped observation and an explicit monotonic clock reading in milliseconds. Its only decisions are `{status:"blocked",reason:"..."}` and `{status:"candidate-idle",reason:"ALL_OWNERS_IDLE"}`. The latter means *all mandatory observations appear coherent and idle at one instant*; it is **not** an authorization for a NativeHost or file update.

## Snapshot contract

```json
{
  "schema": 1,
  "workerGeneration": "worker-epoch-1",
  "profileId": "profile-fixture",
  "observedAtMs": 100000,
  "owners": {
    "bulkInventory": {
      "confirmed": true,
      "state": "idle",
      "workerGeneration": "worker-epoch-1",
      "profileId": "profile-fixture",
      "observedAtMs": 100000
    }
  }
}
```

The abbreviated example omits the other required owners and therefore **correctly returns `blocked: OWNER_MISSING`**. Real provider integration must supply every owner reported by `requiredOwners`: bulkInventory, bulkReconciliation, singleInventory, renewal, massRenewal, templateFill, archiveInsertion, trashMutation, insertionLock, managedTabs, profileTransition, accountTransition, emergencyRecovery, diagnosticExport, nativeUpdateTransaction.

The classifier requires exact keys, a confirmed idle status for *every* owner, identical worker-generation and profile identity, and all observations within 2,000 ms of the supplied time. Missing, malformed, stale, future, conflicting, active, pending, unknown and restart/race evidence fails closed. An incomplete or thrown read must be represented as `confirmed:false` / unknown; **never** silently converted into an empty owner. The existing insertion lock historically treats some storage failures as empty and is **not** authoritative for this purpose.

## Explicit future integration dependency

This Wave **does not** import the module in the running background service worker or include it in the Chrome runtime package, because there is not yet an authoritative producer/consumer to enforce its result. Only unit tests exercise the pure module. Future #67 sub-Waves must:

1. Implement an authoritative, recovery-safe, versioned background state owner and a persisted **fenced transition** preventing every new workflow start, including MV3 worker restarts and tabs. Treat any unowned workflow class as blocked.
2. Obtain fresh observations from real repositories/controllers with trustworthy `confirmed` flags and profile/generation stamps. Evaluate under the fence; before host handoff verify the same active fence/nonce again.
3. Separately prove NativeHost authentication, user consent, exact loaded file target, staging/atomic swap/rollback, reloading and new-version activation. `candidate-idle` alone must **never** unlock NativeHost mutation.
4. Preserve the existing `RequireIdle` rejection of running Chrome and read-only `health`/`check` native allowlist until **separate** Chrome-open safety validation passes.

Owner Windows 11 Home manually installed v1.23.22 remains untouched. The repeatedly changing Downloads versioned folder is not an identity-migration prerequisite because KAR retains its fixed manifest key. A future NativeHost must still prove it updates the folder Chrome actually loads or a separately verified activation target.

## Verification

Run `node tests/kar97-update-idle-policy.cjs` and the standard mandatory coverage/architecture/packaged/browser/Windows CI gates for the exact Work SHA. Real Windows NativeHost `health`/`check` belongs to #66 and is still unverified on this owner PC.
