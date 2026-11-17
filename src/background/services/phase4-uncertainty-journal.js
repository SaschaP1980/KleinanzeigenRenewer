// KAR-117 — immutable persistent evidence of potentially interrupted Phase-4
// remote work. NOT a cross-worker mutex, CAS, clearance, or idle attestation.
(() => {
  'use strict';
  const PREFIX = 'karPhase4UncertainAttemptV1_';
  const RESOLUTION_PREFIX = 'karPhase4VerifiedResolutionV1_';
  const SCHEMA = 1;
  // Must match KRAtomicMV3Admission.LOCK_NAME. No storage-only CAS fallback.
  const SHARED_LOCK_NAME = 'kar-updater-global-admission-v1';
  const P8_START = 'karAtomicAdmissionStartV1_';
  const P8_FINISH = 'karAtomicAdmissionFinishV1_';
  // Only admitted renewal execution paths can own a Phase-4 delete boundary.
  const P8_ALLOWED = new Set([
    'AUTONOMOUS:renewal-auto-phase4','AUTONOMOUS:renewal-resume',
    'AUTONOMOUS:renewal-detached-retry','AUTONOMOUS:renewal-detached-verify',
    'AUTONOMOUS:mass-renewal-next-item','RETRY_RENEWAL_VERIFICATION',
    'RETRY_MASS_RENEWAL_ITEM','FINISH_RENEWAL_REPLACEMENT'
  ]);
  const isRecord = v => v !== null && typeof v === 'object' && !Array.isArray(v);
  const denied = code => Object.assign(new Error(code), {code});
  const safeId = value => typeof value === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(value);
  const adId = value => typeof value === 'string' && /^\d+$/.test(value);
  function create({storageLocal, clock, newToken, workerInstanceId,
    verifyRemoteOutcome = null, verifyCommitContext = null,
    prepareCommitContext = null, requireCommitContext = false,
    lockManager = null, lockName = null, onSample = null} = {}) {
    if (typeof storageLocal?.get !== 'function' || typeof storageLocal?.set !== 'function'
        || typeof clock !== 'function' || typeof newToken !== 'function')
      throw denied('KR_PHASE4_JOURNAL_STORAGE');
    if (!safeId(workerInstanceId)) throw denied('KR_PHASE4_JOURNAL_IDENTITY');
    function assertAtomicAvailable() {
      if (typeof lockManager?.request !== 'function' || lockName !== SHARED_LOCK_NAME)
        throw denied('KR_PHASE4_JOURNAL_ATOMIC_UNAVAILABLE');
    }
    // A short-lived P8/publish journal owner legitimately occupies the same
    // Web Lock. Retry only a failed acquisition, never a begun critical
    // section, durable write, remote verification, or destructive action.
    async function withAtomic(action,phase='begin') {
      assertAtomicAvailable();
      const beganAt=Date.now();
      let busyAttempts=0,holdMs=0,outcome='denied';
      try {
        const maxAttempts=16;
        for(let i=0;i<maxAttempts;i++) {
          let entered=false,completed=false,preLockBusy=false;
          try {
            const value=await lockManager.request(SHARED_LOCK_NAME,
              {mode:'exclusive',ifAvailable:true},async lock=>{
                if(entered)throw denied('KR_PHASE4_JOURNAL_ATOMIC_UNAVAILABLE');
                entered=true;
                if(!lock) {
                  preLockBusy=true;
                  throw denied('KR_PHASE4_JOURNAL_ATOMIC_BUSY');
                }
                if(lock.name!==SHARED_LOCK_NAME||lock.mode!=='exclusive')
                  throw denied('KR_PHASE4_JOURNAL_ATOMIC_UNAVAILABLE');
                const heldAt=Date.now();
                try {
                  const result=await action();
                  completed=true;
                  return result;
                }finally{holdMs=Math.min(60000,Math.max(0,Date.now()-heldAt));}
              });
            if(!entered||!completed)throw denied('KR_PHASE4_JOURNAL_ATOMIC_UNAVAILABLE');
            outcome='ok';
            return value;
          }catch(error){
            if(preLockBusy&&error?.code==='KR_PHASE4_JOURNAL_ATOMIC_BUSY'){
              busyAttempts++;
              if(i<maxAttempts-1){
                await new Promise(resolve=>setTimeout(resolve,Math.min(20+i*10,100)));
                continue;
              }
            }
            if(typeof error?.code==='string'&&error.code.startsWith('KR_PHASE4_JOURNAL_'))
              throw error;
            throw denied('KR_PHASE4_JOURNAL_ATOMIC_UNAVAILABLE');
          }
        }
        throw denied('KR_PHASE4_JOURNAL_ATOMIC_BUSY');
      }finally{
        // Send only fixed phase, bounded timings and attempts. No account,
        // ad, tab, token, source payload, or other private identifying value.
        if(busyAttempts>0&&typeof onSample==='function'){
          try{onSample(Object.freeze({
            phase,busyAttempts,
            waitMs:Math.min(60000,Math.max(0,Date.now()-beganAt-holdMs)),
            holdMs,outcome
          }));}catch{}
        }
      }
    }
    async function read(keys) {
      try {
        const value = await storageLocal.get(keys);
        if (!isRecord(value)) throw Error('malformed read');
        return value;
      } catch { throw denied('KR_PHASE4_JOURNAL_STORAGE'); }
    }
    function validate(row, key) {
      return isRecord(row) && row.schema === SCHEMA && row.state === 'outcome-unverified'
        && safeId(row.renewalId) && safeId(row.attemptId) && safeId(row.workerInstanceId)
        && typeof row.profileId === 'string' && row.profileId.trim().length > 0
        && row.profileId.length <= 256 && adId(row.sourceAdId) && adId(row.newAdId)
        && row.sourceAdId !== row.newAdId && Number.isSafeInteger(row.createdAtMs)
        && row.createdAtMs >= 0
        && (row.admissionToken === undefined ||
          (safeId(row.admissionToken) && row.admissionToken.length >= 12))
        && key === PREFIX + row.renewalId + '_' + row.attemptId;
    }
    function validateResolution(row, key, original) {
      return isRecord(row) && row.schema === SCHEMA && row.state === 'resolved-confirmed'
        && safeId(row.renewalId) && safeId(row.attemptId) && safeId(row.workerInstanceId)
        && typeof row.profileId === 'string' && row.profileId.trim().length > 0
        && row.profileId.length <= 256 && adId(row.sourceAdId) && adId(row.newAdId)
        && row.sourceAdId !== row.newAdId && Number.isSafeInteger(row.verifiedAtMs)
        && isRecord(original) && validate(original, PREFIX + row.renewalId + '_' + row.attemptId)
        && row.verifiedAtMs >= original.createdAtMs
        && Number.isSafeInteger(row.sourcePagesScanned)
        && row.sourcePagesScanned >= 1 && Number.isSafeInteger(row.targetPagesScanned)
        && row.targetPagesScanned >= 1 && Number.isSafeInteger(row.targetFoundPage)
        && row.targetFoundPage >= 1 && row.targetFoundPage <= row.targetPagesScanned
        && row.sourceEvidence === 'not-in-my-ads-full-pagination-scan'
        && row.targetEvidence === 'found-in-my-ads-full-pagination-scan'
        && key === RESOLUTION_PREFIX + row.renewalId + '_' + row.attemptId;
    }
    const exactlySame = (a, b) => Object.keys(a).length === Object.keys(b).length
      && Object.keys(a).every(key => a[key] === b[key]);

    async function observe(renewalId) {
      if (!safeId(renewalId)) throw denied('KR_PHASE4_JOURNAL_IDENTITY');
      // get(null) exposes independently keyed attempts, without a lossy
      // read-modify-write shared map. A storage read failure is not "empty".
      const all = await read(null);
      const attempts = [];
      const resolutions = [];
      for (const [key, row] of Object.entries(all)) {
        if (key.startsWith(PREFIX)) {
          if (!validate(row, key)) throw denied('KR_PHASE4_JOURNAL_CORRUPT');
          if (row.renewalId === renewalId) attempts.push(Object.freeze({...row}));
        }
        if (key.startsWith(RESOLUTION_PREFIX)) {
          const original = all[PREFIX + row.renewalId + '_' + row.attemptId];
          if (!validateResolution(row, key, original)) throw denied('KR_PHASE4_JOURNAL_CORRUPT');
          if (!validate(original, PREFIX + row.renewalId + '_' + row.attemptId)
              || row.profileId !== original.profileId || row.sourceAdId !== original.sourceAdId
              || row.newAdId !== original.newAdId)
            throw denied('KR_PHASE4_JOURNAL_CORRUPT');
          if (row.renewalId === renewalId) resolutions.push(Object.freeze({...row}));
        }
      }
      return Object.freeze({state: resolutions.length && resolutions.length === attempts.length
        ? 'resolved' : 'unverified',
        attempts: Object.freeze(attempts), resolutions: Object.freeze(resolutions)});
    }
    async function verifiedAdmissionToken(reference, createdAtMs) {
      if (!isRecord(reference) || !Object.isFrozen(reference)
        || reference.schema !== 1 || reference.state !== 'admitted'
        || !safeId(reference.token) || reference.token.length < 12
        || reference.workerInstanceId !== workerInstanceId
        || !P8_ALLOWED.has(reference.operationType)
        || !Number.isSafeInteger(reference.startedAtMs)
        || reference.startedAtMs < 0 || reference.startedAtMs > createdAtMs)
        throw denied('KR_PHASE4_JOURNAL_ADMISSION_UNVERIFIED');
      // Read the original P8 source under the SAME shared exclusive Web Lock.
      // A captured token, fabricated object or finished older callback alone
      // may not authorize a new irreversible remote-intent entry.
      const rows = await read([P8_START + reference.token, P8_FINISH + reference.token]);
      const original = rows[P8_START + reference.token];
      if (!isRecord(original) || !exactlySame(original, reference)
        || rows[P8_FINISH + reference.token] !== undefined)
        throw denied('KR_PHASE4_JOURNAL_ADMISSION_UNVERIFIED');
      return reference.token;
    }
    async function begin({renewalId, profileId, sourceAdId, newAdId,
      admissionReceipt = null} = {}) {
      if (!safeId(renewalId) || typeof profileId !== 'string' || !profileId.trim()
          || profileId.length > 256 || !adId(String(sourceAdId || ''))
          || !adId(String(newAdId || '')) || String(sourceAdId) === String(newAdId))
        throw denied('KR_PHASE4_JOURNAL_IDENTITY');
      return withAtomic(async () => {
        if ((await observe(renewalId)).attempts.length)
          throw denied('KR_PHASE4_JOURNAL_UNRESOLVED');
      let attemptId;
      try { attemptId = newToken(); }
      catch { throw denied('KR_PHASE4_JOURNAL_IDENTITY'); }
      if (!safeId(attemptId)) throw denied('KR_PHASE4_JOURNAL_IDENTITY');
      const key = PREFIX + renewalId + '_' + attemptId;
      const time = clock();
      if (!Number.isSafeInteger(time) || time < 0) throw denied('KR_PHASE4_JOURNAL_IDENTITY');
      const admissionToken = admissionReceipt === null ? null
        : await verifiedAdmissionToken(admissionReceipt, time);
      const entry = Object.freeze({
        schema: SCHEMA, state: 'outcome-unverified', renewalId, attemptId,
        profileId, sourceAdId: String(sourceAdId), newAdId: String(newAdId),
        workerInstanceId, createdAtMs: time,
        ...(admissionToken ? {admissionToken} : {})
      });
      try { await storageLocal.set({[key]: entry}); }
      catch { throw denied('KR_PHASE4_JOURNAL_STORAGE'); }
      const acknowledged = (await read([key]))[key];
      if (!validate(acknowledged, key) || Object.keys(entry).some(k => acknowledged[k] !== entry[k]))
        throw denied('KR_PHASE4_JOURNAL_STORAGE');
      // Detect ordinary overlap, but do not claim this eliminates a two-worker
      // read/check/write race. That requires separate atomic arbitration.
      if ((await observe(renewalId)).attempts.length !== 1)
        throw denied('KR_PHASE4_JOURNAL_UNRESOLVED');
      return entry;
      }, 'begin');
    }
    // R1: if the original intent carried a real P8 token, independently
    // revalidate its durable origin (not a caller-supplied claimed generation)
    // under the same origin lock before AND after remote navigation. A missing
    // or changed original worker receipt must never produce a positive result.
    // Historical tokenless receipts remain legible, but do not gain updater
    // authority from this read-only verifier.
    async function originalP8Signature(original) {
      if (!Object.hasOwn(original,'admissionToken')) return null;
      const token=original.admissionToken;
      const rows=await read([P8_START+token,P8_FINISH+token]);
      const start=rows[P8_START+token],finish=rows[P8_FINISH+token];
      if (!isRecord(start) || Object.keys(start).length!==6
          || start.schema!==1 || start.state!=='admitted'
          || start.token!==token || !P8_ALLOWED.has(start.operationType)
          || start.workerInstanceId!==original.workerInstanceId
          || !Number.isSafeInteger(start.startedAtMs)
          || start.startedAtMs<0 || start.startedAtMs>original.createdAtMs)
        throw denied('KR_PHASE4_JOURNAL_UNVERIFIED');
      if (finish!==undefined &&
          (!isRecord(finish) || Object.keys(finish).length!==5
            || finish.schema!==1 || finish.state!=='completed'
            || finish.token!==token || finish.workerInstanceId!==start.workerInstanceId
            || !Number.isSafeInteger(finish.completedAtMs)
            || finish.completedAtMs<original.createdAtMs))
        throw denied('KR_PHASE4_JOURNAL_UNVERIFIED');
      return JSON.stringify([start,finish??null]);
    }
    // Caller cannot supply its own proof. The worker-owned verifier performs
    // fresh My Ads source+target checks and returns a grounded result.
    // This remains distinct from cross-worker arbitration (P8).
    async function resolveVerified({renewalId, attemptId} = {}) {
      if (!safeId(renewalId) || !safeId(attemptId))
        throw denied('KR_PHASE4_JOURNAL_IDENTITY');
      if (requireCommitContext && (typeof verifyCommitContext !== 'function' ||
          typeof prepareCommitContext !== 'function'))
        throw denied('KR_PHASE4_JOURNAL_UNVERIFIED');
      // Initial validation and final durable commit share the origin-wide
      // mutex with admission/reserve, but NEVER hold it over remote navigation.
      let originSignature;
      const original = await withAtomic(async () => {
        const before = await observe(renewalId);
        if (before.attempts.length !== 1 || before.attempts[0].attemptId !== attemptId)
          throw denied('KR_PHASE4_JOURNAL_UNRESOLVED');
        originSignature=await originalP8Signature(before.attempts[0]);
        return before.attempts[0];
      }, 'resolve-read');
      if (typeof verifyRemoteOutcome !== 'function')
        throw denied('KR_PHASE4_JOURNAL_UNVERIFIED');
      let proof;
      try { proof = await verifyRemoteOutcome(Object.freeze({...original})); }
      catch { throw denied('KR_PHASE4_JOURNAL_UNVERIFIED'); }
      if (!isRecord(proof) || proof.profileId !== original.profileId
          || proof.sourceAdId !== original.sourceAdId || proof.newAdId !== original.newAdId
          || proof.sourceAbsent !== true || proof.targetPresent !== true
          || proof.sourceEvidence !== 'not-in-my-ads-full-pagination-scan'
          || proof.targetEvidence !== 'found-in-my-ads-full-pagination-scan'
          || !Number.isSafeInteger(proof.sourcePagesScanned) || proof.sourcePagesScanned < 1
          || !Number.isSafeInteger(proof.targetPagesScanned) || proof.targetPagesScanned < 1
          || !Number.isSafeInteger(proof.targetFoundPage) || proof.targetFoundPage < 1
          || proof.targetFoundPage > proof.targetPagesScanned)
        throw denied('KR_PHASE4_JOURNAL_UNVERIFIED');
      // A real independent source/target scan must carry the immutable
      // original P8 attempt, Worker and token into the positive result.
      if (Object.hasOwn(original,'admissionToken') &&
          (proof.attemptId !== original.attemptId ||
           proof.workerInstanceId !== original.workerInstanceId ||
           proof.admissionToken !== original.admissionToken))
        throw denied('KR_PHASE4_JOURNAL_UNVERIFIED');
      // Prepare an owned read-only My Ads tab OUTSIDE the origin lock.
      // No remote navigation is permitted in the locked commit section.
      let witness=null;
      if(requireCommitContext){
        try{witness=await prepareCommitContext(Object.freeze({...original}));}
        catch{throw denied('KR_PHASE4_JOURNAL_UNVERIFIED');}
        if(!witness||!Number.isSafeInteger(witness.tabId)||witness.tabId<=0||
            typeof witness.close!=='function')
          throw denied('KR_PHASE4_JOURNAL_UNVERIFIED');
      }
      // Always inspect the receipt again after the remote verification; neither
      // a changed account nor lost storage can become a positive outcome.
      try{return await withAtomic(async () => {
      const after = await observe(renewalId);
      if (after.attempts.length !== 1 || !exactlySame(after.attempts[0], original))
        throw denied('KR_PHASE4_JOURNAL_UNRESOLVED');
      if (await originalP8Signature(original) !== originSignature)
        throw denied('KR_PHASE4_JOURNAL_UNVERIFIED');
      // The last independent read-only authenticated account/session
      // observation happens UNDER the shared origin lock, not during the
      // remote scan. Missing, stale or contradictory evidence is UNKNOWN.
      if (requireCommitContext) {
        let accepted = false;
        try { accepted = await verifyCommitContext(Object.freeze({...original}),witness); }
        catch { /* fail closed */ }
        if (accepted !== true) throw denied('KR_PHASE4_JOURNAL_UNVERIFIED');
      }
      if (after.resolutions.length) {
        const prior = after.resolutions[0];
        if (!validateResolution(prior, RESOLUTION_PREFIX + renewalId + '_' + attemptId, original))
          throw denied('KR_PHASE4_JOURNAL_CORRUPT');
        return prior; // Immutable, verified historical resolution.
      }
      const time = clock();
      if (!Number.isSafeInteger(time) || time < original.createdAtMs)
        throw denied('KR_PHASE4_JOURNAL_IDENTITY');
      const resolved = Object.freeze({
        schema: SCHEMA, state: 'resolved-confirmed', renewalId, attemptId,
        workerInstanceId, profileId: original.profileId,
        sourceAdId: original.sourceAdId, newAdId: original.newAdId,
        sourceEvidence: proof.sourceEvidence, targetEvidence: proof.targetEvidence,
        sourcePagesScanned: proof.sourcePagesScanned,
        targetPagesScanned: proof.targetPagesScanned,
        targetFoundPage: proof.targetFoundPage, verifiedAtMs: time
      });
      const key = RESOLUTION_PREFIX + renewalId + '_' + attemptId;
      const previously = (await read([key]))[key];
      if (previously !== undefined)
        throw denied('KR_PHASE4_JOURNAL_UNRESOLVED');
      try { await storageLocal.set({[key]: resolved}); }
      catch { throw denied('KR_PHASE4_JOURNAL_STORAGE'); }
      const acknowledged = (await read([key]))[key];
      if (!validateResolution(acknowledged, key, original) || !exactlySame(acknowledged, resolved))
        throw denied('KR_PHASE4_JOURNAL_STORAGE');
      const final = await observe(renewalId);
      if (final.resolutions.length !== 1 || !exactlySame(final.resolutions[0], resolved))
        throw denied('KR_PHASE4_JOURNAL_STORAGE');
      return resolved;
      }, 'resolve-write');}finally{
        if(witness)await Promise.resolve().then(()=>witness.close()).catch(()=>{});
      }
    }
    return Object.freeze({begin, observe, resolveVerified});
  }
  const API = Object.freeze({create, KEY_PREFIX: PREFIX, RESOLUTION_KEY_PREFIX: RESOLUTION_PREFIX});
  globalThis.KRDeps?.register?.('KRPhase4UncertaintyJournal', API);
  if (typeof module !== 'undefined' && module?.exports) module.exports = API;
})();
