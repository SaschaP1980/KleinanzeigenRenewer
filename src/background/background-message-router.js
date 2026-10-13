(() => {
  'use strict';

  const ROUTES = Object.freeze({
    "PLATFORM_ACCESS_RESTRICTED": Object.freeze({ handler: "PLATFORM_ACCESS_RESTRICTED", preSafety: true }),
    "GET_PLATFORM_ACCESS_RESTRICTION": Object.freeze({ handler: "GET_PLATFORM_ACCESS_RESTRICTION", preSafety: true }),
    "CLEAR_PLATFORM_ACCESS_RESTRICTION": Object.freeze({ handler: "CLEAR_PLATFORM_ACCESS_RESTRICTION", preSafety: true }),
    "OPEN_APP_WINDOW": Object.freeze({ handler: "OPEN_APP_WINDOW", preSafety: false }),
    "GET_BACKGROUND_EPOCH": Object.freeze({ handler: "GET_BACKGROUND_EPOCH", preSafety: false }),
    "GET_NATIVE_UPDATE_STATUS": Object.freeze({ handler: "GET_NATIVE_UPDATE_STATUS", preSafety: true }),
    "LOG_DIAGNOSTIC_EVENT": Object.freeze({ handler: "LOG_DIAGNOSTIC_EVENT", preSafety: false }),
    "SET_ACCOUNT_GATE_DIAGNOSTIC_STATE": Object.freeze({ handler: "SET_ACCOUNT_GATE_DIAGNOSTIC_STATE", preSafety: false }),
    "STORE_GALLERY_DIAGNOSTIC": Object.freeze({ handler: "STORE_GALLERY_DIAGNOSTIC", preSafety: false }),
    "GET_DIAGNOSTIC_EXPORT": Object.freeze({ handler: "GET_DIAGNOSTIC_EXPORT", preSafety: false }),
    "RESET_DIAGNOSTICS": Object.freeze({ handler: "RESET_DIAGNOSTICS", preSafety: false }),
    "RESET_ACTIVE_WORKFLOWS": Object.freeze({ handler: "RESET_ACTIVE_WORKFLOWS", preSafety: false }),
    "ENSURE_CONTENT_CONNECTION": Object.freeze({ handler: "ENSURE_CONTENT_CONNECTION", preSafety: false }),
    "GET_MANAGED_WORKER_TAB_IDS": Object.freeze({ handler: "GET_MANAGED_WORKER_TAB_IDS", preSafety: false }),
    "GET_TAB_REGISTRY_SNAPSHOT": Object.freeze({ handler: "GET_TAB_REGISTRY_SNAPSHOT", preSafety: false }),
    "REACTIVATE_DISCARDED_TABS": Object.freeze({ handler: "REACTIVATE_DISCARDED_TABS", preSafety: false }),
    "GET_RENEWAL_CONFIGURATION": Object.freeze({ handler: "GET_RENEWAL_CONFIGURATION", preSafety: false }),
    "SET_RENEWAL_MODE": Object.freeze({ handler: "SET_RENEWAL_MODE", preSafety: false }),
    "SET_RENEWAL_PHASE_ATTEMPTS": Object.freeze({ handler: "SET_RENEWAL_PHASE_ATTEMPTS", preSafety: false }),
    "OPEN_EDIT_AD": Object.freeze({ handler: "OPEN_EDIT_AD", preSafety: false }),
    "OPEN_READONLY_AD": Object.freeze({ handler: "OPEN_READONLY_AD", preSafety: false }),
    "RECOGNIZE_PROFILE": Object.freeze({ handler: "RECOGNIZE_PROFILE", preSafety: false }),
    "GET_PROFILE_STATE": Object.freeze({ handler: "GET_PROFILE_STATE", preSafety: false }),
    "PROBE_LIVE_KLEINANZEIGEN_ACCOUNT": Object.freeze({ handler: "PROBE_LIVE_KLEINANZEIGEN_ACCOUNT", preSafety: false }),
    "SET_SELECTED_PROFILE": Object.freeze({ handler: "SET_SELECTED_PROFILE", preSafety: false }),
    "PREPARE_PROFILE_BACKUP_IMPORT": Object.freeze({ handler: "PREPARE_PROFILE_BACKUP_IMPORT", preSafety: false }),
    "FINALIZE_PROFILE_BACKUP_IMPORT": Object.freeze({ handler: "FINALIZE_PROFILE_BACKUP_IMPORT", preSafety: false }),
    "DELETE_PROFILE": Object.freeze({ handler: "DELETE_PROFILE", preSafety: false }),
    "ASSIGN_UNPROFILED_INVENTORIES": Object.freeze({ handler: "ASSIGN_UNPROFILED_INVENTORIES", preSafety: false }),
    "REFRESH_INVENTORY": Object.freeze({ handler: "REFRESH_INVENTORY", preSafety: false }),
    "CHECK_INVENTORY_ONLINE_STATUS": Object.freeze({ handler: "CHECK_INVENTORY_ONLINE_STATUS", preSafety: false }),
    "CAPTURE_SINGLE_INVENTORY": Object.freeze({ handler: "CAPTURE_SINGLE_INVENTORY", preSafety: false }),
    "RETRY_RENEWAL_VERIFICATION": Object.freeze({ handler: "RETRY_RENEWAL_VERIFICATION", preSafety: false }),
    "SAVE_INVENTORY": Object.freeze({ handler: "SAVE_INVENTORY", preSafety: false }),
    "LIST_INVENTORIES": Object.freeze({ handler: "LIST_INVENTORIES", preSafety: false }),
    "LIST_TRASH": Object.freeze({ handler: "LIST_TRASH", preSafety: false }),
    "GET_INSERTION_LOCK_STATE": Object.freeze({ handler: "GET_INSERTION_LOCK_STATE", preSafety: false }),
    "DELETE_INVENTORY": Object.freeze({ handler: "DELETE_INVENTORY", preSafety: false }),
    "DELETE_TRASH_ENTRY": Object.freeze({ handler: "DELETE_TRASH_ENTRY", preSafety: false }),
    "RESET_TRASH_RETENTION": Object.freeze({ handler: "RESET_TRASH_RETENTION", preSafety: false }),
    "REMOVE_REPLACEMENT_READY_LOCAL": Object.freeze({ handler: "REMOVE_REPLACEMENT_READY_LOCAL", preSafety: false }),
    "FINISH_RENEWAL_REPLACEMENT": Object.freeze({ handler: "FINISH_RENEWAL_REPLACEMENT", preSafety: false }),
    "DISCARD_RENEWAL_DRAFT": Object.freeze({ handler: "DISCARD_RENEWAL_DRAFT", preSafety: false }),
    "CLEAR_INVENTORIES": Object.freeze({ handler: "CLEAR_INVENTORIES", preSafety: false }),
    "START_BULK_INVENTORY_OPERATION": Object.freeze({ handler: "START_BULK_INVENTORY_OPERATION", preSafety: false }),
    "BULK_INIT_RUN": Object.freeze({ handler: "BULK_INIT_RUN", preSafety: false }),
    "GET_BULK_RUN_FOR_SOURCE": Object.freeze({ handler: "GET_BULK_RUN_FOR_SOURCE", preSafety: false }),
    "GET_BULK_RUN_STATUS": Object.freeze({ handler: "GET_BULK_RUN_STATUS", preSafety: false }),
    "BULK_RUN_UPDATE": Object.freeze({ handler: "BULK_RUN_UPDATE", preSafety: false }),
    "BULK_RECORD_ROSTER_PAGE": Object.freeze({ handler: "BULK_RECORD_ROSTER_PAGE", preSafety: false }),
    "REQUEST_BULK_INVENTORY_STOP_AFTER_CURRENT": Object.freeze({ handler: "REQUEST_BULK_INVENTORY_STOP_AFTER_CURRENT", preSafety: false }),
    "BULK_FINISH_CONTROLLED_STOP": Object.freeze({ handler: "BULK_FINISH_CONTROLLED_STOP", preSafety: false }),
    "BULK_BEGIN_RECONCILIATION": Object.freeze({ handler: "BULK_BEGIN_RECONCILIATION", preSafety: false }),
    "BULK_RECORD_RECONCILIATION_PAGE": Object.freeze({ handler: "BULK_RECORD_RECONCILIATION_PAGE", preSafety: false }),
    "BULK_FINISH_RECONCILIATION": Object.freeze({ handler: "BULK_FINISH_RECONCILIATION", preSafety: false }),
    "BULK_OPEN_WORKER": Object.freeze({ handler: "BULK_OPEN_WORKER", preSafety: false }),
    "BULK_EXTRACT_SAVE_WORKER": Object.freeze({ handler: "BULK_EXTRACT_SAVE_WORKER", preSafety: false }),
    "BULK_CLOSE_WORKER": Object.freeze({ handler: "BULK_CLOSE_WORKER", preSafety: false }),
    "BULK_RECORD_EXISTING_SKIP": Object.freeze({ handler: "BULK_RECORD_EXISTING_SKIP", preSafety: false }),
    "BULK_RECORD_RESULT": Object.freeze({ handler: "BULK_RECORD_RESULT", preSafety: false }),
    "BULK_FINISH_RUN": Object.freeze({ handler: "BULK_FINISH_RUN", preSafety: false }),
    "BULK_FAIL_RUN": Object.freeze({ handler: "BULK_FAIL_RUN", preSafety: false }),
    "RETRY_BULK_FAILURE": Object.freeze({ handler: "RETRY_BULK_FAILURE", preSafety: false }),
    "START_MASS_RENEWAL_BATCH": Object.freeze({ handler: "START_MASS_RENEWAL_BATCH", preSafety: false }),
    "GET_MASS_RENEWAL_BATCH_STATUS": Object.freeze({ handler: "GET_MASS_RENEWAL_BATCH_STATUS", preSafety: false }),
    "MASS_RENEWAL_WATCHDOG_TICK": Object.freeze({ handler: "MASS_RENEWAL_WATCHDOG_TICK", preSafety: false }),
    "REQUEST_MASS_RENEWAL_STOP_AFTER_CURRENT": Object.freeze({ handler: "REQUEST_MASS_RENEWAL_STOP_AFTER_CURRENT", preSafety: false }),
    "RETRY_MASS_RENEWAL_ITEM": Object.freeze({ handler: "RETRY_MASS_RENEWAL_ITEM", preSafety: false }),
    "START_TEMPLATE_FILL": Object.freeze({ handler: "START_TEMPLATE_FILL", preSafety: false }),
    "START_ARCHIVE_INSERTION": Object.freeze({ handler: "START_ARCHIVE_INSERTION", preSafety: false }),
    "GET_ARCHIVE_INSERTION_STATUS": Object.freeze({ handler: "GET_ARCHIVE_INSERTION_STATUS", preSafety: false }),
    "START_TRASH_TEMPLATE_FILL": Object.freeze({ handler: "START_TRASH_TEMPLATE_FILL", preSafety: false }),
    "GET_TRASH_TEMPLATE_FILL_STATUS": Object.freeze({ handler: "GET_TRASH_TEMPLATE_FILL_STATUS", preSafety: false }),
    "GET_RECOVERABLE_TRASH_TEMPLATE_FILL": Object.freeze({ handler: "GET_RECOVERABLE_TRASH_TEMPLATE_FILL", preSafety: false }),
    "PREPARE_TRASH_TEMPLATE_INVENTORY_CAPTURE": Object.freeze({ handler: "PREPARE_TRASH_TEMPLATE_INVENTORY_CAPTURE", preSafety: false }),
    "COMPLETE_TRASH_TEMPLATE_FLOW": Object.freeze({ handler: "COMPLETE_TRASH_TEMPLATE_FLOW", preSafety: false }),
    "GET_APP_NOTICE": Object.freeze({ handler: "GET_APP_NOTICE", preSafety: false }),
    "DISMISS_APP_NOTICE": Object.freeze({ handler: "DISMISS_APP_NOTICE", preSafety: false }),
    "RENEWAL_PUBLISH_CLICKED": Object.freeze({ handler: "RENEWAL_PUBLISH_CLICKED", preSafety: false }),
    "GET_TEMPLATE_FILL_SESSION": Object.freeze({ handler: "GET_TEMPLATE_FILL_SESSION", preSafety: false }),
    "GET_TEMPLATE_IMAGE_CHUNK": Object.freeze({ handler: "GET_TEMPLATE_IMAGE_CHUNK", preSafety: false }),
    "UPDATE_TEMPLATE_FILL_SESSION": Object.freeze({ handler: "UPDATE_TEMPLATE_FILL_SESSION", preSafety: false }),
    "GET_DIAGNOSTICS": Object.freeze({ handler: "GET_DIAGNOSTICS", preSafety: false }),
  });

  function create(options = {}) {
    const registry = options.MessageContractRegistry;
    const assertPlatformAccessAllowedForRequest = options.assertPlatformAccessAllowedForRequest;
    const handlers = options.handlers || {};
    if (!registry?.route || !registry?.errorFor) throw new Error('background-message-router requires MessageContractRegistry.');
    if (typeof assertPlatformAccessAllowedForRequest !== 'function') throw new Error('background-message-router requires platform safety guard.');

    async function dispatch(message, sender, { messageContract = null } = {}) {
      const contract = messageContract || registry.route(message?.type, 'background');
      if (contract.action !== 'accept') throw registry.errorFor(contract);
      const descriptor = ROUTES[String(message?.type || '')];
      if (!descriptor) throw new Error('Unbekannte Erweiterungsanfrage');
      const handler = handlers[descriptor.handler];
      if (typeof handler !== 'function') throw new Error(`Background handler fehlt: ${descriptor.handler}`);
      if (!descriptor.preSafety) await assertPlatformAccessAllowedForRequest(message);
      return handler(message, sender);
    }

    return Object.freeze({ dispatch });
  }

  const api = Object.freeze({ create });
  globalThis.KRDeps?.register?.('KRBackgroundMessageRouter', api);
  if (typeof module !== 'undefined' && module?.exports) module.exports = api;
})();
