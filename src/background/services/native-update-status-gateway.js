// KAR-68: read-only Native Messaging gateway policy. No Chrome transport is wired in this Wave.
(() => {
  'use strict';
  const HOST = 'de.kleinanzeigenrenewer.updater';
  const PROTOCOL = 1;
  const HEX = /^[a-f0-9]{16,64}$/;
  const VERSION = /^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)$/;
  const SHA = /^[a-f0-9]{64}$/;
  const COMMIT = /^[a-f0-9]{40}$/;
  const REMOTE_ERRORS = new Set([
    'FRAME_REJECTED', 'FRAME_TRUNCATED', 'INVALID_REQUEST', 'OPERATION_DENIED',
    'UPDATER_NOT_INSTALLED', 'POWERSHELL_UNAVAILABLE', 'CHECK_START_FAILED',
    'CHECK_TIMEOUT', 'CHECK_FAILED', 'CHECK_RESPONSE_INVALID', 'HOST_FAILURE'
  ]);
  const sameKeys = (o, names) => Boolean(o && typeof o === 'object' && !Array.isArray(o)
    && Object.keys(o).length === names.length && names.every(k => Object.prototype.hasOwnProperty.call(o, k)));
  const failure = error => ({ ok: false, error });
  const allowed = new Set(['health', 'check']);

  function verify(message, requestId, operation) {
    if (!message || typeof message !== 'object' || Array.isArray(message)) return failure('INVALID_RESPONSE');
    let json;
    try { json = JSON.stringify(message); } catch { return failure('INVALID_RESPONSE'); }
    if (typeof json !== 'string' || json.length > 8192 || message.protocol !== PROTOCOL
      || message.requestId !== requestId || typeof message.ok !== 'boolean') return failure('INVALID_RESPONSE');
    if (message.ok === false) {
      if (!sameKeys(message, ['protocol', 'requestId', 'ok', 'error'])
        || typeof message.error !== 'string' || !REMOTE_ERRORS.has(message.error)) return failure('INVALID_RESPONSE');
      return failure(message.error);
    }
    if (operation === 'health') {
      if (!sameKeys(message, ['protocol', 'requestId', 'ok', 'operation', 'hostVersion', 'capabilities'])
        || message.operation !== 'health' || message.hostVersion !== '1'
        || !Array.isArray(message.capabilities)
        || ![2, 3].includes(message.capabilities.length)
        || !message.capabilities.includes('health') || !message.capabilities.includes('check')
        || (message.capabilities.length === 3 && !message.capabilities.includes('inspect_transaction'))
        || new Set(message.capabilities).size !== message.capabilities.length) return failure('INVALID_RESPONSE');
      // Legacy hosts still advertise health/check. The new third native-only
      // negative witness is observable via health but NOT an extension-gateway
      // request: only health/check stay allowlisted until native completion is proven.
      return Object.freeze({ ok: true, operation: 'health', hostVersion: '1',
        capabilities: Object.freeze([...message.capabilities]) });
    }
    if (operation === 'inspect_transaction') {
      // Native-only, negative-authorization Windows inspection. Untrusted
      // page/app messages never reach this path: request() remains health/check.
      // A file fingerprint or missing journal cannot prove the P8 token.
      const fields=['protocol','requestId','ok','operation','status','journal','lock',
        'transactionPhase','journalFormat','journalFingerprint','receipt',
        'receiptFormat','receiptFingerprint','receiptVersion','identityBound',
        'nativeOutcomeVerified','rollbackVerified','eligibleForLease'];
      const state=new Set(['present','absent','unknown']);
      const fingerprint=x=>x===null||(typeof x==='string'&&SHA.test(x));
      if (!sameKeys(message,fields) || message.operation!=='inspect_transaction'
        || !['blocked','unverified'].includes(message.status)
        || !state.has(message.journal)||!state.has(message.lock)
        || !state.has(message.receipt)
        || message.status!==(message.journal==='present'||message.lock==='present'
          ?'blocked':'unverified')
        || message.transactionPhase!==(message.journal==='present'
          ?'pending-install-or-rollback':message.lock==='present'
            ?'lock-unverified':'unknown')
        || !['legacy-pending','malformed','unknown'].includes(message.journalFormat)
        || !['legacy-installed','malformed','unknown'].includes(message.receiptFormat)
        || !fingerprint(message.journalFingerprint)
        || !fingerprint(message.receiptFingerprint)
        || (message.journalFormat==='unknown'&&message.journalFingerprint!==null)
        || (message.receiptFormat==='unknown'&&message.receiptFingerprint!==null)
        || (message.journal!=='present' &&
          (message.journalFormat!=='unknown'||message.journalFingerprint!==null))
        || (message.receipt!=='present' &&
          (message.receiptFormat!=='unknown'||message.receiptFingerprint!==null))
        || (message.journalFormat!=='unknown'&&message.journalFingerprint===null)
        || (message.receiptFormat!=='unknown'&&message.receiptFingerprint===null)
        || (message.journalFormat==='legacy-pending'&&message.journal!=='present')
        || (message.receiptFormat==='legacy-installed'
          ?typeof message.receiptVersion!=='string'||!VERSION.test(message.receiptVersion)
          :message.receiptVersion!==null)
        || message.identityBound!==false||message.nativeOutcomeVerified!==false
        || message.rollbackVerified!==false||message.eligibleForLease!==false)
        return failure('INVALID_RESPONSE');
      return Object.freeze({
        ok:true,operation:'inspect_transaction',
        status:message.status,journal:message.journal,lock:message.lock,
        transactionPhase:message.transactionPhase,
        journalFormat:message.journalFormat,journalFingerprint:message.journalFingerprint,
        receipt:message.receipt,receiptFormat:message.receiptFormat,
        receiptFingerprint:message.receiptFingerprint,receiptVersion:message.receiptVersion,
        identityBound:false,nativeOutcomeVerified:false,
        rollbackVerified:false,eligibleForLease:false
      });
    }
    if (!sameKeys(message, ['protocol', 'requestId', 'ok', 'operation', 'installed', 'approved', 'sha256', 'sourceCommit'])
      || message.operation !== 'check' || typeof message.installed !== 'string'
      || (message.installed !== 'not installed' && !VERSION.test(message.installed))
      || typeof message.approved !== 'string' || !VERSION.test(message.approved)
      || typeof message.sha256 !== 'string' || !SHA.test(message.sha256)
      || typeof message.sourceCommit !== 'string' || !COMMIT.test(message.sourceCommit)) return failure('INVALID_RESPONSE');
    return Object.freeze({
      ok: true, operation: 'check', installed: message.installed,
      approved: message.approved, sha256: message.sha256, sourceCommit: message.sourceCommit
    });
  }

  function create(options) {
    if (!options || typeof options.transport !== 'function'
      || typeof options.getPlatform !== 'function'
      || typeof options.newNonce !== 'function') throw new Error('Native gateway dependencies required');
    const schedule = options.schedule || setTimeout;
    const cancel = options.cancel || clearTimeout;
    const timeoutMs = Number.isSafeInteger(options.timeoutMs) && options.timeoutMs >= 1
      && options.timeoutMs <= 30000 ? options.timeoutMs : 5000;
    let busy = false;
    const issued = new Set();
    const order = [];
    async function requestInternal(operation, privatelyAuthorized = false) {
      if (!allowed.has(operation) &&
          !(privatelyAuthorized && operation === 'inspect_transaction'))
        return failure('OPERATION_DENIED');
      if (busy) return failure('BUSY');
      busy = true;
      let timeoutId;
      try {
        if (await Promise.resolve(options.getPlatform()) !== 'win') return failure('UNSUPPORTED_PLATFORM');
        const requestId = options.newNonce();
        if (typeof requestId !== 'string' || !HEX.test(requestId)) return failure('NONCE_INVALID');
        if (issued.has(requestId)) return failure('NONCE_REUSED');
        issued.add(requestId);
        order.push(requestId);
        if (order.length > 64) issued.delete(order.shift());
        let response;
        try {
          response = await Promise.race([
            Promise.resolve().then(() => options.transport(HOST, Object.freeze({
              protocol: PROTOCOL, requestId, operation
            }))),
            new Promise((_, reject) => { timeoutId = schedule(() => reject(new Error('NATIVE_TIMEOUT')), timeoutMs); })
          ]);
        } catch (e) {
          return failure(e?.message === 'NATIVE_TIMEOUT' ? 'TIMEOUT' : 'HOST_UNAVAILABLE');
        }
        return verify(response, requestId, operation);
      } catch {
        return failure('HOST_UNAVAILABLE');
      } finally {
        if (timeoutId !== undefined) { try { cancel(timeoutId); } catch {} }
        busy = false;
      }
    }
    // App status remains health/check-only; no untrusted IPC added.
    const request=operation=>requestInternal(operation,false);
    const inspectReadOnly=()=>requestInternal('inspect_transaction',true);
    return Object.freeze({ request, inspectReadOnly });
  }

  const api = Object.freeze({ create, verify });
  if (globalThis.KRDeps?.register) globalThis.KRDeps.register('KRNativeUpdateStatusGateway', api);
  if (typeof module !== 'undefined' && module?.exports) module.exports = api;
})();
