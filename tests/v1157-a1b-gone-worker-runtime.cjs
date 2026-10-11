const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'src/background/services/bulk-worker-service.js'), 'utf8');
function extractFunction(source, name) {
  const start = source.indexOf(`async function ${name}(`);
  assert.ok(start >= 0, `${name} helper not found`);
  const brace = source.indexOf('{', start);
  let depth = 0;
  for (let i = brace; i < source.length; i += 1) {
    if (source[i] === '{') depth += 1;
    else if (source[i] === '}') { depth -= 1; if (depth === 0) return source.slice(start, i + 1); }
  }
  throw new Error(`unterminated ${name}`);
}
const helper = extractFunction(source, 'resolveBulkWorkerLifecycle');

function makeContext({ entry = null, getTabResult = null, getTabError = null } = {}) {
  const calls = { get: 0, getTabOrThrow: 0 };
  const tabRegistry = {
    async get() { calls.get += 1; return entry; },
    async getTabOrThrow() {
      calls.getTabOrThrow += 1;
      if (getTabError) throw getTabError;
      return getTabResult || { id: 41, status: 'complete', url: 'https://www.kleinanzeigen.de/p-anzeige-bearbeiten.html?adId=123' };
    }
  };
  const context = {
    tabRegistry,
    TAB_STATES: { GONE: 'gone' },
    TAB_ROLES: { BULK_WORKER: 'bulk-worker' },
    sessionCorrelationContext: (state, extra) => ({ operationId: state.operationId, runId: state.runId, ...extra }),
    chrome: { tabs: {} },
    TabRegistry: {
      isGoneError: error => error?.code === 'KR_TAB_GONE',
      isDiscardedError: error => error?.code === 'KR_TAB_DISCARDED'
    },
    globalThis: {},
    console
  };
  vm.runInNewContext(`${helper}; globalThis.__helper = resolveBulkWorkerLifecycle;`, context);
  return { fn: context.globalThis.__helper, calls };
}

(async () => {
  const state = { runId: 'run-1', bulkRunId: 'run-1', operationId: 'op-1', workerTabId: 41, currentAdId: '123' };

  {
    const { fn, calls } = makeContext({ entry: { lifecycleState: 'gone', owner: { runId: 'run-1', adId: '123' } } });
    const result = await fn(state, 41, '123');
    assert.equal(result.state, 'terminal');
    assert.equal(result.lifecycleCode, 'KR_TAB_GONE');
    assert.equal(calls.getTabOrThrow, 0);
  }

  {
    const err = new Error('gone'); err.code = 'KR_TAB_GONE';
    const { fn, calls } = makeContext({ entry: { lifecycleState: 'active', owner: { runId: 'run-1', adId: '123' } }, getTabError: err });
    const result = await fn(state, 41, '123');
    assert.equal(result.state, 'terminal');
    assert.equal(result.lifecycleCode, 'KR_TAB_GONE');
    assert.equal(calls.getTabOrThrow, 1);
  }

  {
    const err = new Error('discarded'); err.code = 'KR_TAB_DISCARDED';
    const { fn } = makeContext({ entry: { lifecycleState: 'discarded', owner: { runId: 'run-1', adId: '123' } }, getTabError: err });
    const result = await fn(state, 41, '123');
    assert.equal(result.state, 'waiting');
    assert.equal(result.lifecycleCode, 'KR_TAB_DISCARDED');
  }

  {
    const { fn } = makeContext({ entry: { lifecycleState: 'active', owner: { runId: 'different', adId: '999' } } });
    const result = await fn({ ...state, workerTabId: 99 }, 41, '123');
    assert.equal(result.state, 'mismatch');
  }

  console.log('PASS v1.15.7 A1b gone/discarded lifecycle runtime semantics');
})().catch(error => { console.error(error); process.exit(1); });
