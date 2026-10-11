// Test-only bridge for historical VM tests. Production code must use KRDeps only.
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const projectRoot = path.resolve(__dirname, '..');
const originalReadFileSync = fs.readFileSync.bind(fs);
const originalExistsSync = fs.existsSync.bind(fs);
const originalStatSync = fs.statSync.bind(fs);
let legacySourcePathMap = {};
const legacyCompositeSourceMap = Object.freeze({
  'template-filler.js': [
    'src/content/template-category-flow.js',
    'src/content/template-form-fields.js',
    'src/content/template-image-upload.js',
    'src/content/template-verification.js',
    'src/content/template-publish-flow.js',
    'src/content/template-filler.js'
  ],
  'inventory-runner.js': [
    'src/content/inventory-roster-parser.js',
    'src/content/inventory-readiness.js',
    'src/content/inventory-status-overlay.js',
    'src/content/inventory-delete-operations.js',
    'src/content/inventory-run-loop.js',
    'src/content/inventory-runner.js'
  ],
  'inventory-render-controller.js': [
    'src/app/record-card-view.js',
    'src/app/inventory-card-renderer.js',
    'src/app/trash-card-renderer.js',
    'src/app/inventory-render-controller.js'
  ],
  'archive-trash-insertion-ui-controller.js': [
    'src/app/archive-insertion-ui-controller.js',
    'src/app/trash-template-ui-controller.js',
    'src/app/archive-trash-insertion-ui-controller.js'
  ],
  'profile-backup-controller.js': [
    'src/app/profile-backup-storage-service.js',
    'src/app/profile-backup-controller.js'
  ]
});
try {
  const layout = JSON.parse(originalReadFileSync(path.join(projectRoot, 'scripts/source-layout.json'), 'utf8'));
  legacySourcePathMap = { ...(layout.mapping || {}), 'diagnostic-export-service.js': 'src/background/services/diagnostic-export-service.js', 'account-session-controller.js': 'src/background/controllers/account-session-controller.js', 'profile-management-controller.js': 'src/background/controllers/profile-management-controller.js' };
} catch { legacySourcePathMap = {}; }

function redirectLegacySourcePath(value) {
  if (typeof value !== 'string') return value;
  const absolute = path.resolve(value);
  for (const [legacy, current] of Object.entries(legacySourcePathMap)) {
    if (absolute === path.join(projectRoot, legacy)) return path.join(projectRoot, current);
  }
  return value;
}

fs.readFileSync = function patchedReadFileSync(file, ...args) {
  if (typeof file === 'string') {
    const absolute = path.resolve(file);
    const legacyBase = path.basename(absolute);
    const composite = legacyCompositeSourceMap[legacyBase];
    if (composite && absolute === path.join(projectRoot, legacyBase)) {
      const encoding = typeof args[0] === 'string' ? args[0] : args[0]?.encoding;
      const joined = composite.map(rel => originalReadFileSync(path.join(projectRoot, rel), 'utf8')).join('\n');
      return encoding ? joined : Buffer.from(joined, 'utf8');
    }
  }
  return originalReadFileSync(redirectLegacySourcePath(file), ...args);
};
fs.existsSync = function patchedExistsSync(file) { return originalExistsSync(redirectLegacySourcePath(file)); };
fs.statSync = function patchedStatSync(file, ...args) { return originalStatSync(redirectLegacySourcePath(file), ...args); };

const originalResolveFilename = Module._resolveFilename;
Module._resolveFilename = function patchedResolveFilename(request, parent, isMain, options) {
  if (typeof request === 'string' && request.endsWith('.js') && parent?.filename) {
    const legacyBase = path.basename(request);
    const current = legacySourcePathMap[legacyBase];
    if (current) {
      const requestedAbsolute = path.resolve(path.dirname(parent.filename), request);
      if (requestedAbsolute === path.join(projectRoot, legacyBase) && !originalExistsSync(requestedAbsolute)) {
        return path.join(projectRoot, current);
      }
    }
  }
  return originalResolveFilename.call(this, request, parent, isMain, options);
};

const originalRunInNewContext = vm.runInNewContext;
const originalRunInContext = vm.runInContext;
// Only VMs whose dependency registry was synthesized by this historical-test
// bridge may receive compatibility behaviour. Explicit modern test registries
// and runtime mocks must preserve their own safety/failure semantics.
const legacyVmContexts = new WeakSet();

function isRuntimeDepsSource(code, options) {
  const filename = typeof options === 'string' ? options : options?.filename;
  if (String(filename || '').endsWith('runtime-deps.js')) return true;
  const text = String(code || '');
  return text.includes('const dependencies = new Map()') && text.includes('globalThis.KRDeps = api');
}

function ensureTestRegistry(context) {
  if (!context || typeof context !== 'object' || context.KRDeps) return;
  const dependencies = new Map();
  legacyVmContexts.add(context);
  context.KRDeps = {
    register(name, value) {
      const key = String(name || '');
      dependencies.set(key, value);
      // Historical tests may still address ctx.KRFoo. Keep this alias test-only.
      context[key] = value;
      return value;
    },
    require(name) {
      const key = String(name || '');
      return dependencies.has(key) ? dependencies.get(key) : (context[key] ?? null);
    },
    optional(name) {
      const key = String(name || '');
      return dependencies.has(key) ? dependencies.get(key) : (context[key] ?? null);
    },
    has(name) { return this.optional(name) != null; },
    names() { return [...dependencies.keys()].sort(); }
  };
  // Historical isolated VM tests predate the production message-contract registry.
  // Give only those tests an accept-all contract surface; v1.22.25 registry/enforcement
  // tests load the real module with their own KRDeps and never use this fallback.
  const messageContractRegistry = Object.freeze({
    route(type, target) {
      return Object.freeze({ type: String(type || '') || null, requestedTarget: String(target || '') || null, registered: true, targetRegistered: true, kind: 'request', targets: Object.freeze([String(target || '')]), action: 'accept', errorCode: null });
    },
    errorFor(decision) {
      const error = new Error(`Test message-contract rejection: ${decision?.type || '<missing>'}`);
      error.code = decision?.errorCode || 'KR_MESSAGE_CONTRACT_UNKNOWN';
      return error;
    },
    inspect(type, target) { return this.route(type, target); },
    has() { return true; },
    snapshot() { return Object.freeze({ schemaVersion: 1, mode: 'test-compat', enforcement: false, totalTypes: 0, byTarget: Object.freeze({}) }); }
  });
  dependencies.set('KRMessageContractRegistry', messageContractRegistry);
  context.KRMessageContractRegistry = messageContractRegistry;

  // v1.23.12 moves pure/composition dependencies out of the monoliths. Historical
  // isolated-VM tests stub importScripts(), so provide those in-process APIs here.
  const compatModules = Object.freeze({
    KRRenewalPolicy: path.join(projectRoot, 'src/shared/renewal-policy.js'),
    KRBackgroundMessageRouter: path.join(projectRoot, 'src/background/background-message-router.js'),
    KRAppElements: path.join(projectRoot, 'src/app/app-elements.js'),
    KRProfileAccountUiController: path.join(projectRoot, 'src/app/profile-account-ui-controller.js'),
    KRRecordCardView: path.join(projectRoot, 'src/app/record-card-view.js'),
    KRInventoryCardRenderer: path.join(projectRoot, 'src/app/inventory-card-renderer.js'),
    KRTrashCardRenderer: path.join(projectRoot, 'src/app/trash-card-renderer.js'),
    KRArchiveInsertionUiController: path.join(projectRoot, 'src/app/archive-insertion-ui-controller.js'),
    KRTrashTemplateUiController: path.join(projectRoot, 'src/app/trash-template-ui-controller.js'),
    KRProfileBackupStorageService: path.join(projectRoot, 'src/app/profile-backup-storage-service.js'),
    KRInventoryScope: path.join(projectRoot, 'src/background/lib/inventory-scope.js'),
    KRBulkWorkerService: path.join(projectRoot, 'src/background/services/bulk-worker-service.js'),
    KRBulkReconciliationService: path.join(projectRoot, 'src/background/services/bulk-reconciliation-service.js'),
    KRArchiveInsertionRecoveryService: path.join(projectRoot, 'src/background/services/archive-insertion-recovery-service.js'),
    KRArchiveInsertionVerificationService: path.join(projectRoot, 'src/background/services/archive-insertion-verification-service.js'),
    KRMassRenewalWatchdogService: path.join(projectRoot, 'src/background/services/mass-renewal-watchdog-service.js'),
    KRWorkflowEmergencyResetController: path.join(projectRoot, 'src/background/controllers/workflow-emergency-reset-controller.js')
  });
  for (const [name, modulePath] of Object.entries(compatModules)) {
    try {
      if (!originalExistsSync(modulePath)) continue;
      const api = require(modulePath);
      dependencies.set(name, api);
      context[name] = api;
    } catch { /* historical test bridge only */ }
  }
}

function mirrorRegisteredDependencies(context) {
  if (!context?.KRDeps?.names || !context?.KRDeps?.require) return;
  try {
    for (const name of context.KRDeps.names()) {
      if (context[name] == null) context[name] = context.KRDeps.require(name);
    }
  } catch { /* historical test bridge only */ }
}

function provideLegacyContentStartupStub(code, context) {
  // Current content.js checks persistent platform restrictions at startup.
  // Older isolated VMs have onMessage but no background sendMessage stub.
  // Recognize this exact content entry point, not arbitrary VM code.
  if (!legacyVmContexts.has(context) ||
      !String(code || '').includes('globalThis.__KR_CONTENT_V160__') ||
      !String(code || '').includes('GET_PLATFORM_ACCESS_RESTRICTION') ||
      !String(code || '').includes('chrome.runtime.onMessage.addListener')) return;
  const runtime = context?.chrome?.runtime;
  if (typeof runtime?.onMessage?.addListener !== 'function' ||
      typeof runtime.sendMessage === 'function') return;
  runtime.sendMessage = (message, callback) => {
    if (message?.type !== 'GET_PLATFORM_ACCESS_RESTRICTION') {
      throw new Error('Legacy content VM startup stub only supports GET_PLATFORM_ACCESS_RESTRICTION');
    }
    callback?.({ ok: true, result: { active: false } });
  };
}

vm.runInNewContext = function patchedRunInNewContext(code, context = {}, options) {
  if (!isRuntimeDepsSource(code, options)) {
    ensureTestRegistry(context);
    provideLegacyContentStartupStub(code, context);
  }
  const result = originalRunInNewContext.call(this, code, context, options);
  mirrorRegisteredDependencies(context);
  return result;
};

vm.runInContext = function patchedRunInContext(code, contextifiedObject, options) {
  if (!isRuntimeDepsSource(code, options)) {
    ensureTestRegistry(contextifiedObject);
    provideLegacyContentStartupStub(code, contextifiedObject);
  }
  const result = originalRunInContext.call(this, code, contextifiedObject, options);
  mirrorRegisteredDependencies(contextifiedObject);
  return result;
};
