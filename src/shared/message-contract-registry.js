(() => {
  'use strict';
  const KRDeps = globalThis.KRDeps;
  if (!KRDeps) throw new Error('runtime-deps.js must load before message-contract-registry.js');
  if (KRDeps.has?.('KRMessageContractRegistry')) {
    const existing = KRDeps.require('KRMessageContractRegistry');
    if (typeof module !== 'undefined' && module?.exports) module.exports = existing;
    return;
  }

  const BACKGROUND_REQUESTS = Object.freeze([
  "ASSIGN_UNPROFILED_INVENTORIES",
  "BULK_BEGIN_RECONCILIATION",
  "BULK_CLOSE_WORKER",
  "BULK_EXTRACT_SAVE_WORKER",
  "BULK_FAIL_RUN",
  "BULK_FINISH_CONTROLLED_STOP",
  "BULK_FINISH_RECONCILIATION",
  "BULK_FINISH_RUN",
  "BULK_INIT_RUN",
  "BULK_OPEN_WORKER",
  "BULK_RECORD_EXISTING_SKIP",
  "BULK_RECORD_RECONCILIATION_PAGE",
  "BULK_RECORD_RESULT",
  "BULK_RECORD_ROSTER_PAGE",
  "BULK_RUN_UPDATE",
  "CAPTURE_SINGLE_INVENTORY",
  "CHECK_INVENTORY_ONLINE_STATUS",
  "CLEAR_INVENTORIES",
  "CLEAR_PLATFORM_ACCESS_RESTRICTION",
  "COMPLETE_TRASH_TEMPLATE_FLOW",
  "DELETE_INVENTORY",
  "DELETE_PROFILE",
  "DELETE_TRASH_ENTRY",
  "DISCARD_RENEWAL_DRAFT",
  "DISMISS_APP_NOTICE",
  "ENSURE_CONTENT_CONNECTION",
  "FINALIZE_PROFILE_BACKUP_IMPORT",
  "FINISH_RENEWAL_REPLACEMENT",
  "GET_APP_NOTICE",
  "GET_ARCHIVE_INSERTION_STATUS",
  "GET_BACKGROUND_EPOCH",
  "GET_BULK_RUN_FOR_SOURCE",
  "GET_BULK_RUN_STATUS",
  "GET_DIAGNOSTICS",
  "GET_DIAGNOSTIC_EXPORT",
  "GET_INSERTION_LOCK_STATE",
  "GET_MANAGED_WORKER_TAB_IDS",
  "GET_MASS_RENEWAL_BATCH_STATUS",
  "GET_NATIVE_UPDATE_STATUS",
  "GET_PLATFORM_ACCESS_RESTRICTION",
  "GET_PROFILE_STATE",
  "GET_RECOVERABLE_TRASH_TEMPLATE_FILL",
  "GET_RENEWAL_CONFIGURATION",
  "GET_TAB_REGISTRY_SNAPSHOT",
  "GET_TEMPLATE_FILL_SESSION",
  "GET_TEMPLATE_IMAGE_CHUNK",
  "GET_TRASH_TEMPLATE_FILL_STATUS",
  "LIST_INVENTORIES",
  "LIST_TRASH",
  "LOG_DIAGNOSTIC_EVENT",
  "MASS_RENEWAL_WATCHDOG_TICK",
  "OPEN_APP_WINDOW",
  "OPEN_EDIT_AD",
  "OPEN_READONLY_AD",
  "PLATFORM_ACCESS_RESTRICTED",
  "PREPARE_PROFILE_BACKUP_IMPORT",
  "PREPARE_TRASH_TEMPLATE_INVENTORY_CAPTURE",
  "PROBE_LIVE_KLEINANZEIGEN_ACCOUNT",
  "REACTIVATE_DISCARDED_TABS",
  "RECOGNIZE_PROFILE",
  "REFRESH_INVENTORY",
  "REMOVE_REPLACEMENT_READY_LOCAL",
  "RENEWAL_PUBLISH_CLICKED",
  "REQUEST_BULK_INVENTORY_STOP_AFTER_CURRENT",
  "REQUEST_MASS_RENEWAL_STOP_AFTER_CURRENT",
  "RESET_ACTIVE_WORKFLOWS",
  "RESET_DIAGNOSTICS",
  "RESET_TRASH_RETENTION",
  "RETRY_BULK_FAILURE",
  "RETRY_MASS_RENEWAL_ITEM",
  "RETRY_RENEWAL_VERIFICATION",
  "SAVE_INVENTORY",
  "SET_ACCOUNT_GATE_DIAGNOSTIC_STATE",
  "SET_RENEWAL_MODE",
  "SET_RENEWAL_PHASE_ATTEMPTS",
  "SET_SELECTED_PROFILE",
  "START_ARCHIVE_INSERTION",
  "START_BULK_INVENTORY_OPERATION",
  "START_MASS_RENEWAL_BATCH",
  "START_TEMPLATE_FILL",
  "START_TRASH_TEMPLATE_FILL",
  "STORE_GALLERY_DIAGNOSTIC",
  "UPDATE_TEMPLATE_FILL_SESSION"
]);
  const CONTENT_REQUESTS = Object.freeze([
  "DETECT_PUBLISHED_AD",
  "EXTRACT_CURRENT_AD",
  "EXTRACT_READONLY_METADATA",
  "FORM_DIAGNOSTICS",
  "IMAGE_DIAGNOSTICS",
  "INVENTORY_CANDIDATE_PREVIEW",
  "KR_CONTENT_READY",
  "KR_PLATFORM_SAFETY_STOP",
  "PAGE_STATUS",
  "RENEWAL_FEEDBACK"
]);
  const MY_ADS_REQUESTS = Object.freeze([
  "DELETE_OWN_AD_BY_ID",
  "FIND_OWN_AD_BY_ID",
  "MY_ADS_STATUS",
  "START_BULK_INVENTORY_FROM_FRESH_SOURCE",
  "START_BULK_RECONCILIATION_SCAN",
  "VERIFY_OWN_AD_ABSENT_BY_ID",
  "WAIT_FOR_MY_ADS_READY"
]);
  const APP_BROADCASTS = Object.freeze([
  "ARCHIVE_INSERTION_STATE_CHANGED",
  "PLATFORM_ACCESS_RESTRICTION_CHANGED",
  "INVENTORY_DATA_CHANGED"
]);

  const GROUPS = Object.freeze({
    background: BACKGROUND_REQUESTS,
    content: CONTENT_REQUESTS,
    'my-ads-content': MY_ADS_REQUESTS,
    app: APP_BROADCASTS
  });

  const entries = new Map();
  for (const [target, names] of Object.entries(GROUPS)) {
    for (const type of names) {
      const prior = entries.get(type) || { type, targets: [], kind: target === 'app' ? 'event' : 'request' };
      if (!prior.targets.includes(target)) prior.targets.push(target);
      entries.set(type, prior);
    }
  }

  function normalizeType(type) { return String(type || '').trim(); }

  function inspect(type, target = '') {
    const key = normalizeType(type);
    const entry = entries.get(key) || null;
    const requestedTarget = String(target || '').trim();
    return Object.freeze({
      type: key || null,
      requestedTarget: requestedTarget || null,
      registered: Boolean(entry),
      targetRegistered: Boolean(entry && (!requestedTarget || entry.targets.includes(requestedTarget))),
      kind: entry?.kind || null,
      targets: Object.freeze([...(entry?.targets || [])])
    });
  }

  function has(type, target = '') { return inspect(type, target).targetRegistered; }
  function contractsForTarget(target) { return Object.freeze([...(GROUPS[String(target || '').trim()] || [])]); }

  function route(type, target = '') {
    const state = inspect(type, target);
    if (!state.registered) {
      return Object.freeze({ ...state, action: 'reject', errorCode: 'KR_MESSAGE_CONTRACT_UNKNOWN' });
    }
    if (!state.targetRegistered) {
      return Object.freeze({ ...state, action: 'ignore', errorCode: 'KR_MESSAGE_CONTRACT_TARGET_MISMATCH' });
    }
    return Object.freeze({ ...state, action: 'accept', errorCode: null });
  }

  function errorFor(decision) {
    const state = decision && typeof decision === 'object' ? decision : route('', '');
    const type = state.type || '<missing>';
    const target = String(state.requestedTarget || state.target || '').trim();
    const code = state.errorCode || (state.registered ? 'KR_MESSAGE_CONTRACT_TARGET_MISMATCH' : 'KR_MESSAGE_CONTRACT_UNKNOWN');
    const message = code === 'KR_MESSAGE_CONTRACT_TARGET_MISMATCH'
      ? `Message-Contract ${type} ist für den Ziel-Router ${target || '<unknown>'} nicht registriert.`
      : `Unbekannter Message-Contract: ${type}.`;
    const error = new Error(message);
    error.code = code;
    error.details = Object.freeze({
      type: state.type || null,
      target: target || null,
      registered: Boolean(state.registered),
      targetRegistered: Boolean(state.targetRegistered),
      targets: Object.freeze([...(state.targets || [])])
    });
    return error;
  }

  function snapshot() {
    const byTarget = {};
    for (const [target, names] of Object.entries(GROUPS)) byTarget[target] = names.length;
    return Object.freeze({ schemaVersion: 1, mode: 'enforced', enforcement: true, totalTypes: entries.size, byTarget: Object.freeze(byTarget) });
  }

  const API = Object.freeze({ inspect, route, errorFor, has, snapshot, groups: GROUPS });
  KRDeps.register('KRMessageContractRegistry', API);
  if (typeof module !== 'undefined' && module?.exports) module.exports = API;
})();
