// KAR-99 P1.3-C: background-private, read-only owner-identity candidate boundary.
//
// A test fixture can exercise the complete decision contract. PRODUCTION MUST
// supply actual independently validated per-owner completion and live-account
// readers; an injected "confirmed: true" object is never a public API. In the
// absence of those real producers the only valid result is BLOCKED, NOT IDLE.
// This module does not communicate with NativeHost or perform updates.
(() => {
  'use strict';
  const ID = /^[A-Za-z0-9_-]{1,128}$/;
  const MAX_AGE_MS = 2000;
  const PHASE4 = 'karPhase4UncertainAttemptV1_';
  const PHASE4_OK = 'karPhase4VerifiedResolutionV1_';
  const PUBLISH = 'karAutoPublishIntentV1_';
  const PUBLISH_OK = 'karAutoPublishVerifiedResolutionV1_';
  const RECORD = v => v !== null && typeof v === 'object' && !Array.isArray(v);
  const denied = code => Object.assign(new Error(code), {code});
  const validId = value => typeof value === 'string' && ID.test(value);
  const validAd = value => typeof value === 'string' && /^\d+$/.test(value);
  const stable = value => {
    if (!RECORD(value)) return false;
    return Number.isSafeInteger(value.observedAtMs) && value.observedAtMs >= 0;
  };
  const keys = (v, names) => RECORD(v) && Object.keys(v).length === names.length &&
    names.every(name => Object.hasOwn(v, name));

  // Preserve KAR-117/KAR-99 immutable attempt/resolution ownership semantics.
  // A received "resolved" text is never proof; the matching independent
  // resolution receipt must have exact workflow, account and Ad-ID evidence.
  function checkJournals(rows, expectedProfileId) {
    const families = [
      {
        prefix: PHASE4, completed: PHASE4_OK,
        validIntent: (r, k) => RECORD(r) && r.schema === 1 &&
          r.state === 'outcome-unverified' && validId(r.renewalId) &&
          validId(r.attemptId) && validId(r.workerInstanceId) &&
          typeof r.profileId === 'string' && r.profileId.trim() &&
          r.profileId.length <= 256 && validAd(r.sourceAdId) &&
          validAd(r.newAdId) && r.sourceAdId !== r.newAdId &&
          Number.isSafeInteger(r.createdAtMs) && r.createdAtMs >= 0 &&
          k === PHASE4 + r.renewalId + '_' + r.attemptId,
        validResolution: (r, k, original) => RECORD(r) && r.schema === 1 &&
          r.state === 'resolved-confirmed' && validId(r.workerInstanceId) &&
          original && r.renewalId === original.renewalId &&
          r.attemptId === original.attemptId && r.profileId === original.profileId &&
          r.sourceAdId === original.sourceAdId && r.newAdId === original.newAdId &&
          r.sourceEvidence === 'not-in-my-ads-full-pagination-scan' &&
          r.targetEvidence === 'found-in-my-ads-full-pagination-scan' &&
          Number.isSafeInteger(r.sourcePagesScanned) && r.sourcePagesScanned >= 1 &&
          Number.isSafeInteger(r.targetPagesScanned) && r.targetPagesScanned >= 1 &&
          Number.isSafeInteger(r.targetFoundPage) && r.targetFoundPage >= 1 &&
          Number.isSafeInteger(r.verifiedAtMs) &&
          r.verifiedAtMs >= original.createdAtMs &&
          k === PHASE4_OK + r.renewalId + '_' + r.attemptId
      },
      {
        prefix: PUBLISH, completed: PUBLISH_OK,
        validIntent: (r, k) => RECORD(r) && r.schema === 1 &&
          r.state === 'outcome-unverified' && validId(r.fillId) &&
          validId(r.workflowId) && validId(r.attemptId) &&
          validId(r.workerInstanceId) && ['renewal', 'archive'].includes(r.kind) &&
          typeof r.profileId === 'string' && r.profileId.trim() &&
          r.profileId.length <= 256 && Number.isSafeInteger(r.targetTabId) &&
          r.targetTabId > 0 && (validAd(r.sourceAdId) ||
          (r.kind === 'archive' && r.sourceAdId === '')) &&
          Number.isSafeInteger(r.createdAtMs) && r.createdAtMs >= 0 &&
          k === PUBLISH + r.fillId + '_' + r.attemptId,
        validResolution: (r, k, original) => RECORD(r) && r.schema === 1 &&
          r.state === 'resolved-confirmed' && original &&
          r.fillId === original.fillId && r.attemptId === original.attemptId &&
          r.workflowId === original.workflowId && r.kind === original.kind &&
          r.profileId === original.profileId && r.sourceAdId === original.sourceAdId &&
          r.targetTabId === original.targetTabId && validAd(r.newAdId) &&
          r.newAdId !== original.sourceAdId && r.targetPresent === true &&
          r.targetEvidence === 'found-in-my-ads-full-pagination-scan' &&
          Number.isSafeInteger(r.targetPagesScanned) && r.targetPagesScanned >= 1 &&
          Number.isSafeInteger(r.targetFoundPage) && r.targetFoundPage >= 1 &&
          Number.isSafeInteger(r.verifiedAtMs) &&
          r.verifiedAtMs >= original.createdAtMs &&
          k === PUBLISH_OK + r.fillId + '_' + r.attemptId
      }
    ];
    for (const family of families) {
      const attempts = Object.entries(rows).filter(([key]) => key.startsWith(family.prefix));
      const resolutions = Object.entries(rows).filter(([key]) => key.startsWith(family.completed));
      const attemptKeys = new Set(attempts.map(([key]) => key.slice(family.prefix.length)));
      // F2E1: an internally consistent historical remote outcome for a
      // different profile is not evidence that the current signed-in account
      // has no unresolved remote work. Bind every original attempt to the
      // live matched inventory profile before evaluating terminal receipts.
      if (attempts.some(([, value]) => !RECORD(value) ||
            value.profileId !== expectedProfileId))
        throw denied('KR_OWNER_JOURNAL_PROFILE_MISMATCH');
      if (!attempts.every(([key, value]) => family.validIntent(value, key)) ||
          !resolutions.every(([key, value]) => {
            const suffix = key.slice(family.completed.length);
            return attemptKeys.has(suffix) && family.validResolution(
              value, key, rows[family.prefix + suffix]);
          }))
        throw denied('KR_OWNER_JOURNAL_CORRUPT');
      if (attempts.some(([key]) => !Object.hasOwn(rows,
            family.completed + key.slice(family.prefix.length))))
        throw denied('KR_OWNER_JOURNAL_UNRESOLVED');
    }
  }

  function requireDependencies(options) {
    const {storageLocal, storageSession, workerInstanceId, ownerPolicy,
      clock, newToken} = options;
    if (typeof storageLocal?.get !== 'function' ||
        typeof storageLocal?.set !== 'function' ||
        typeof storageSession?.get !== 'function' ||
        typeof ownerPolicy?.evaluate !== 'function' ||
        !Array.isArray(ownerPolicy?.requiredOwners) ||
        ownerPolicy.requiredOwners.length !== 15 ||
        !validId(workerInstanceId) ||
        typeof clock !== 'function' || typeof newToken !== 'function')
      throw denied('KR_OWNER_SOURCE_UNAVAILABLE');
  }

  function create(options = {}) {
    requireDependencies(options);
    const {storageLocal, storageSession, workerInstanceId, clock, newToken,
      ownerPolicy, readLiveAccountReadOnly, readBrowserTabsReadOnly,
      readOwnerSourceProofsReadOnly} = options;
    const Atomic = globalThis.KRDeps?.require
      ? globalThis.KRDeps.require('KRAtomicMV3Admission')
      : require('./cross-worker-atomic-admission.js');
    const Fence = globalThis.KRDeps?.require
      ? globalThis.KRDeps.require('KRUpdateWorkflowFence')
      : require('./update-workflow-fence.js');
    // One origin-level admission authority. The same coordinator is used for
    // read-only capture and the eventual existing durable fence reserve.
    const coordinator = Atomic.create({
      storageLocal, lockManager: options.lockManager, workerInstanceId, clock,
      newToken
    });
    const owners = Object.freeze([...ownerPolicy.requiredOwners]);
    const raw = async (source, key) => {
      try {
        const value = await source.get(null);
        if (!RECORD(value)) throw Error('invalid storage response');
        return value;
      } catch { throw denied('KR_OWNER_' + key + '_UNAVAILABLE'); }
    };
    function validateRequest(request) {
      if (!keys(request, ['expectedProfileId', 'transactionId']) ||
          !validId(request.expectedProfileId) || !validId(request.transactionId))
        throw denied('KR_OWNER_REQUEST_INVALID');
      return request;
    }
    function assertProfileState(rows, expected) {
      const current = rows.activeDetectedProfileV1;
      const selected = rows.selectedInventoryProfileV1;
      const profiles = rows.profilesV1;
      if (!RECORD(current) || !RECORD(selected) ||
          current.profileId !== expected || selected.profileId !== expected ||
          !Array.isArray(profiles) ||
          !profiles.some(p => RECORD(p) && p.profileId === expected))
        throw denied('KR_OWNER_PROFILE_UNVERIFIED');
      const required = [
        'renewalSessionsV1', 'templateFillSessions', 'archiveInsertionSessionsV1'
      ];
      if (!required.every(k => RECORD(rows[k])))
        throw denied('KR_OWNER_WORKFLOW_CORRUPT');
      if (Object.values(rows.renewalSessionsV1).some(s => !RECORD(s) ||
          !['complete','cancelled','replaced'].includes(s.status)) ||
          Object.values(rows.templateFillSessions).some(s => !RECORD(s) ||
          !['complete','cancelled','replaced'].includes(s.status)) ||
          Object.values(rows.archiveInsertionSessionsV1).some(s => !RECORD(s) ||
          !['complete','cancelled','replaced'].includes(s.status)))
        throw denied('KR_OWNER_WORKFLOW_ACTIVE');
      if (rows.bulkInventoryRun !== undefined &&
          (!RECORD(rows.bulkInventoryRun) ||
           !['complete','cancelled','stopped'].includes(rows.bulkInventoryRun.status)))
        throw denied('KR_OWNER_WORKFLOW_ACTIVE');
      if (rows.massRenewalBatchV1 !== undefined &&
          rows.massRenewalBatchV1 !== null &&
          (!RECORD(rows.massRenewalBatchV1) ||
           !['complete','cancelled','stopped'].includes(rows.massRenewalBatchV1.status) ||
           (Array.isArray(rows.massRenewalBatchV1.items) &&
             rows.massRenewalBatchV1.items.some(i => !RECORD(i) ||
                ['queued','running','retrying'].includes(i.status)))))
        throw denied('KR_OWNER_WORKFLOW_ACTIVE');
      // A cancelled, expired, malformed or reserved record can never be
      // silently treated as free. Even after restart it needs independent
      // authenticated native transaction outcome verification.
      const lease = rows.nativeUpdateWorkflowFenceV1;
      if (lease !== undefined && lease !== null) {
        if (!RECORD(lease) || lease.schema !== 1 ||
            lease.state !== 'released' || !validId(lease.token) ||
            !validId(lease.workerGeneration) || !validId(lease.profileId) ||
            !validId(lease.transactionId))
          throw denied('KR_OWNER_UPDATE_TRANSACTION_HELD');
      }
    }
    function account(row, profile, now) {
      // Kleinanzeigen authenticates its own session. The established
      // PAGE_STATUS/profile match is read twice by KRAdditionalOwnerObserver;
      // no second vendor userId or email-format validation is appropriate.
      // This is an account/profile match only, NEVER all-15 owner IDLE.
      const matched = row?.context?.profile;
      const worker = row?.context?.worker;
      if (!RECORD(row) || row.schema !== 1 ||
          row.eligibleForLease !== false || !RECORD(row.observations) ||
          !RECORD(matched) || matched.state !== 'matched' ||
          matched.reason !== 'LIVE_ACCOUNT_PROFILE_MATCH' ||
          matched.profileId !== profile ||
          !RECORD(worker) || worker.workerInstanceId !== workerInstanceId ||
          worker.state !== 'unverified' ||
          worker.reason !== 'NO_CROSS_WORKER_GENERATION_PROOF' ||
          !stable(row) || row.observedAtMs > now ||
          now - row.observedAtMs > MAX_AGE_MS)
        throw denied('KR_OWNER_LIVE_ACCOUNT_UNVERIFIED');
      return profile;
    }
    function sourceProof(record, name, profile, time) {
      // These fields are a source-producer contract, not permission to trust
      // synthetic data. The production owner adapter must produce each field
      // by independently reconciling its actual source and durable receipts.
      if (!RECORD(record) || record.owner !== name ||
          record.type !== 'source-completion' ||
          record.verified !== true ||
          record.workerGeneration !== workerInstanceId ||
          record.profileId !== profile ||
          !stable(record) || record.observedAtMs > time ||
          time - record.observedAtMs > MAX_AGE_MS ||
          record.unfinishedOperationCount !== 0 ||
          record.durableCompletionVerified !== true ||
          record.noUnresolvedRemoteMutation !== true ||
          record.noPriorGenerationTask !== true ||
          typeof record.sourceRevision !== 'string' ||
          !record.sourceRevision.trim())
        throw denied('KR_OWNER_SOURCE_UNVERIFIED');
    }
    function ensureTabs(tabs) {
      // A raw chrome.tabs.query() row has no ownership attestation. Missing,
      // ambiguous, or merely asserted unmanaged status is not proof that the
      // registry and actual browser state were independently reconciled.
      // Production adapters are still absent; these fields are a PRIVATE
      // source-proof contract, not permission to rely on caller-supplied data.
      if (!Array.isArray(tabs) ||
          tabs.some(tab => !RECORD(tab) || !Number.isSafeInteger(tab.id) ||
            tab.id <= 0 || tab.managed !== false ||
            tab.ownershipVerified !== true ||
            typeof tab.sourceRevision !== 'string' || !tab.sourceRevision.trim()) ||
          new Set(tabs.map(tab => tab.id)).size !== tabs.length)
        throw denied('KR_OWNER_TABS_UNVERIFIED');
    }
    async function captureLocked(req) {
      const tick = clock();
      if (!Number.isSafeInteger(tick) || tick < 0)
        throw denied('KR_OWNER_TIME_UNVERIFIED');
      if (typeof readLiveAccountReadOnly !== 'function' ||
          typeof readBrowserTabsReadOnly !== 'function' ||
          typeof readOwnerSourceProofsReadOnly !== 'function')
        throw denied('KR_OWNER_SOURCE_UNAVAILABLE');
      const firstLocal = await raw(storageLocal,'STORAGE_LOCAL');
      const firstSession = await raw(storageSession,'STORAGE_SESSION');
      assertProfileState(firstLocal, req.expectedProfileId);
      checkJournals(firstLocal, req.expectedProfileId);
      const liveOne = await readLiveAccountReadOnly();
      const identity = account(liveOne, req.expectedProfileId, tick);
      const tabs = await readBrowserTabsReadOnly();
      ensureTabs(tabs);
      const proofs = await readOwnerSourceProofsReadOnly();
      if (!RECORD(proofs) || Object.keys(proofs).length !== owners.length ||
          !owners.every(name => Object.hasOwn(proofs,name)))
        throw denied('KR_OWNER_SOURCE_UNAVAILABLE');
      for (const name of owners)
        sourceProof(proofs[name], name, req.expectedProfileId, tick);
      const liveTwo = await readLiveAccountReadOnly();
      if (account(liveTwo,req.expectedProfileId,tick) !== identity)
        throw denied('KR_OWNER_LIVE_ACCOUNT_CHANGED');
      // F2A: owner proofs may take time even within the origin admission
      // lock. Recheck the *actual* Chrome/session tab producer at the end:
      // a tab opened, closed or reclassified during that interval is UNKNOWN.
      // Compare the verified identity/provenance set, not just tab count.
      const finalTabs = await readBrowserTabsReadOnly();
      ensureTabs(finalTabs);
      const signature = list => JSON.stringify(list.map(tab =>
        [tab.id, tab.managed, tab.ownershipVerified, tab.sourceRevision])
        .sort((a,b) => a[0]-b[0]));
      if (signature(tabs) !== signature(finalTabs))
        throw denied('KR_OWNER_TABS_CHANGED');
      const secondLocal = await raw(storageLocal,'STORAGE_LOCAL');
      const secondSession = await raw(storageSession,'STORAGE_SESSION');
      if (JSON.stringify(firstLocal) !== JSON.stringify(secondLocal) ||
          JSON.stringify(firstSession) !== JSON.stringify(secondSession))
        throw denied('KR_OWNER_STATE_CHANGED');
      assertProfileState(secondLocal,req.expectedProfileId);
      checkJournals(secondLocal, req.expectedProfileId);
      const completedAt = clock();
      if (!Number.isSafeInteger(completedAt) ||
          completedAt < tick || completedAt - tick > MAX_AGE_MS)
        throw denied('KR_OWNER_OBSERVATION_STALE');
      const snapshot = Object.freeze({
        schema:1,workerGeneration:workerInstanceId,profileId:req.expectedProfileId,
        observedAtMs:completedAt,
        owners:Object.freeze(Object.fromEntries(owners.map(name=>[
          name,Object.freeze({confirmed:true,state:'idle',
            workerGeneration:workerInstanceId,profileId:req.expectedProfileId,
            observedAtMs:tick})
        ])))
      });
      if (ownerPolicy.evaluate(snapshot,{nowMs:completedAt}).status !== 'candidate-idle')
        throw denied('KR_OWNER_POLICY_DENIED');
      const nonce = newToken();
      if (!validId(nonce) || nonce.length < 12)
        throw denied('KR_OWNER_NONCE_INVALID');
      return Object.freeze({status:'candidate-idle',nonce,snapshot});
    }
    async function captureForReserve(request) {
      const valid = validateRequest(request);
      return coordinator.guardReserve(() => captureLocked(valid),workerInstanceId);
    }
    async function reserveThroughFence(request) {
      const valid = validateRequest(request);
      const fence = Fence.create({
        storageLocal, atomicCoordinator:coordinator, clock, newToken,
        policy:ownerPolicy,
        getOwnerSnapshot:async()=> (await captureLocked(valid)).snapshot
      });
      // No stale prior capture is consumed. The same origin Web Lock covers
      // snapshot creation, durable lease write and matching readback.
      return fence.reserve({
        profileId:valid.expectedProfileId,workerGeneration:workerInstanceId,
        transactionId:valid.transactionId
      });
    }
    // Do not expose apply, NativeHost, cancellation or recovery via this gate.
    // Release requires an independent host-recovery contract in a later
    // separately approved integration; a caller's "confirmed" is not proof.
    return Object.freeze({captureForReserve,reserveThroughFence});
  }
  const API = Object.freeze({create});
  globalThis.KRDeps?.register?.('KRTrustedOwnerAuthority',API);
  if (typeof module !== 'undefined' && module?.exports) module.exports = API;
})();
