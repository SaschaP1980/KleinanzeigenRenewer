// KAR-171 R1 — Chrome EXTENSION SERVICE-WORKER DevTools console only.
// Run manually in the existing installed extension (not a web page).
// ONE read from chrome.storage.local. No writes, Web Locks, tabs, network,
// publishing, deletion, updater actions, or private identifiers in output.
// Presence of a candidate is NOT R1 acceptance or proof of remote outcome.
(async () => {
  'use strict';
  const TAG = 'KAR171_R1_P8_PREFLIGHT_V1';
  const EXTENSION_ID = 'hafahjhhgiipdegfkgacchmnacgblnah';
  const START = 'karAtomicAdmissionStartV1_';
  const FINISH = 'karAtomicAdmissionFinishV1_';
  const PHASE = 'karPhase4UncertainAttemptV1_';
  const PUBLISH = 'karAutoPublishIntentV1_';
  const PHASE_OPS = new Set([
    'AUTONOMOUS:renewal-auto-phase4', 'AUTONOMOUS:renewal-resume',
    'AUTONOMOUS:renewal-detached-retry', 'AUTONOMOUS:renewal-detached-verify',
    'AUTONOMOUS:mass-renewal-next-item', 'RETRY_RENEWAL_VERIFICATION',
    'RETRY_MASS_RENEWAL_ITEM', 'FINISH_RENEWAL_REPLACEMENT'
  ]);
  const PUBLISH_OPS = new Set([
    'AUTONOMOUS:renewal-publish-detection', 'AUTONOMOUS:trash-publish-detection',
    'AUTONOMOUS:archive-postpublish-detached', 'AUTHORIZE_AUTOMATIC_PUBLISH'
  ]);
  const record = x => !!x && typeof x === 'object' && !Array.isArray(x);
  const id = x => typeof x === 'string' && /^[a-zA-Z0-9_-]{1,128}$/.test(x);
  const ad = x => typeof x === 'string' && /^\d+$/.test(x);
  const time = x => Number.isSafeInteger(x) && x >= 0;
  const print = result => console.info(TAG, JSON.stringify(result));
  if (typeof chrome === 'undefined' || chrome?.runtime?.id !== EXTENSION_ID
    || typeof location === 'undefined' || location.protocol !== 'chrome-extension:'
    || location.hostname !== EXTENSION_ID
    || typeof chrome?.storage?.local?.get !== 'function') {
    print({status:'WRONG_EXTENSION_CONTEXT',r1Accepted:false});
    return;
  }

  let data;
  try {
    data = await chrome.storage.local.get(null);
    if (!record(data)) throw new Error('invalid storage response');
  } catch {
    print({status:'READ_FAILED',r1Accepted:false});
    return;
  }

  const validStart = (row, token, worker, createdAtMs, ops) => {
    const start = data[START + token];
    const finish = data[FINISH + token];
    if (!record(start) || Object.keys(start).length !== 6
      || start.schema !== 1 || start.state !== 'admitted'
      || start.token !== token || start.workerInstanceId !== worker
      || !id(start.token) || !id(start.workerInstanceId)
      || !ops.has(start.operationType) || !time(start.startedAtMs)
      || start.startedAtMs > createdAtMs) return {valid:false};
    if (finish === undefined) return {valid:true,unfinished:true};
    if (!record(finish) || Object.keys(finish).length !== 5
      || finish.schema !== 1 || finish.state !== 'completed'
      || finish.token !== token || finish.workerInstanceId !== worker
      || !time(finish.completedAtMs) || finish.completedAtMs < createdAtMs)
      return {valid:false};
    return {valid:true,unfinished:false};
  };

  const validIntent = (key, row, kind) => {
    if (!record(row) || row.schema !== 1 || row.state !== 'outcome-unverified'
      || !id(row.attemptId) || !id(row.workerInstanceId)
      || typeof row.profileId !== 'string' || !row.profileId.trim()
      || row.profileId.length > 256 || !time(row.createdAtMs)) return false;
    if (kind === 'phase4')
      return id(row.renewalId) && ad(row.sourceAdId) && ad(row.newAdId)
        && row.sourceAdId !== row.newAdId
        && key === PHASE + row.renewalId + '_' + row.attemptId;
    return id(row.fillId) && id(row.workflowId)
      && (row.kind === 'archive' || row.kind === 'renewal')
      && Number.isSafeInteger(row.targetTabId) && row.targetTabId > 0
      && (ad(row.sourceAdId) || (row.kind === 'archive' && row.sourceAdId === ''))
      && key === PUBLISH + row.fillId + '_' + row.attemptId;
  };

  const summary = {
    status:'NO_ORIGINAL_P8_CANDIDATE',
    version:String(chrome.runtime.getManifest?.()?.version || 'unknown'),
    scope:'single-local-storage-read; no remote verification',
    phase4OriginalP8Candidates:0,
    publishOriginalP8Candidates:0,
    legacyTokenlessIntents:0,
    invalidOrMissingP8:0,
    incompleteP8Finish:0,
    r1Accepted:false
  };

  for (const [key, row] of Object.entries(data)) {
    const kind = key.startsWith(PHASE) ? 'phase4'
      : key.startsWith(PUBLISH) ? 'publish' : null;
    if (!kind) continue;
    if (!record(row) || !validIntent(key,row,kind)) {
      summary.invalidOrMissingP8++;
      continue;
    }
    if (!Object.hasOwn(row,'admissionToken')) {
      summary.legacyTokenlessIntents++;
      continue;
    }
    const token = row.admissionToken;
    if (!id(token) || token.length < 12) {
      summary.invalidOrMissingP8++;
      continue;
    }
    const proof = validStart(row,token,row.workerInstanceId,row.createdAtMs,
      kind === 'phase4' ? PHASE_OPS : PUBLISH_OPS);
    if (!proof.valid) {
      summary.invalidOrMissingP8++;
      continue;
    }
    if (kind === 'phase4') summary.phase4OriginalP8Candidates++;
    else summary.publishOriginalP8Candidates++;
    if (proof.unfinished) summary.incompleteP8Finish++;
  }
  if (summary.phase4OriginalP8Candidates + summary.publishOriginalP8Candidates > 0)
    summary.status = 'ORIGINAL_P8_CANDIDATE_PRESENT';

  // Only counts and public extension version are displayed. No Ad IDs,
  // profile names, email, worker/attempt IDs, P8 tokens, or raw exception.
  print(summary);
})().catch(() => {
  console.info('KAR171_R1_P8_PREFLIGHT_V1',
    JSON.stringify({status:'READ_FAILED',r1Accepted:false}));
});
