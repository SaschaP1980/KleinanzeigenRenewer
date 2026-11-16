// KAR-195: deterministic cold-start fan-out against the actual P8 admission API.
// Local synthetic fixtures only; no accounts, IDs, URLs or remote mutation.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const Atomic = require('../src/background/services/cross-worker-atomic-admission.js');

const routes = [
  'LOG_DIAGNOSTIC_EVENT', 'GET_RECOVERABLE_TRASH_TEMPLATE_FILL',
  'SET_ACCOUNT_GATE_DIAGNOSTIC_STATE', 'RECOGNIZE_PROFILE',
  'GET_RENEWAL_CONFIGURATION', 'GET_TRASH_RETENTION_CONFIGURATION',
  'GET_BULK_RUN_STATUS', 'GET_INSERTION_LOCK_STATE'
];
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function burst(diagnosticCount) {
  const data = Object.create(null);
  data.diagnostics = Array.from({length: diagnosticCount}, (_, i) =>
    ({event: 'SYNTHETIC', severity: 'info', sequence: i}));
  let waitingForFirstRead = false, releaseFirstRead;
  const firstReadBarrier = new Promise(resolve => { releaseFirstRead = resolve; });
  const store = {
    async get(keys) {
      if (keys === null && !waitingForFirstRead) {
        waitingForFirstRead = true;
        await firstReadBarrier; // deterministic long same-worker admission overlap
      }
      const names = keys === null ? Object.keys(data) : Array.isArray(keys) ? keys : [keys];
      return Object.fromEntries(names.filter(key => Object.hasOwn(data, key))
        .map(key => [key, structuredClone(data[key])]));
    },
    async set(patch) { Object.assign(data, structuredClone(patch)); }
  };
  const shared = {held: false, sameWorkerBusy: 0, otherWorkerBusy: 0, requests: 0};
  function lockManager(source) {
    return {async request(name, options, fn) {
      assert.equal(name, Atomic.LOCK_NAME);
      assert.deepEqual(options, {mode:'exclusive', ifAvailable:true});
      shared.requests++;
      if (shared.held) {
        if (source === 'first') shared.sameWorkerBusy++;
        else shared.otherWorkerBusy++;
        return fn(null);
      }
      shared.held = true;
      try {return await fn({name,mode:'exclusive'});}
      finally {shared.held = false;}
    }};
  }
  let serial = 0, started = 0;
  function worker(source, id) {
    return Atomic.create({
      storageLocal: store, lockManager: lockManager(source),
      workerInstanceId: id, clock: () => 123456,
      newToken: () => 'kar195_synthetic_token_' + (++serial) + '_xyz'
    });
  }
  const firstWorker = worker('first', 'worker-cold-start');
  const otherWorker = worker('other', 'worker-restarted');
  const first = firstWorker.withAdmission('GET_RENEWAL_CONFIGURATION', async () => {
    started++; return 'first';
  });
  for (let i=0; i<500 && !waitingForFirstRead; i++) await Promise.resolve();
  assert.equal(waitingForFirstRead, true, 'first worker must acquire lock before fan-out');
  const pending = routes.map((route, i) =>
    firstWorker.withAdmission(route, async () => { started++; return i; }));
  // Observe rejections immediately; RED must fail on the semantic assertion,
  // not on Node's unhandled-rejection timing while the first lock is held.
  const outcomesPromise = Promise.allSettled([first, ...pending]);
  // An independent worker must NOT steal the held lock during the burst.
  await assert.rejects(otherWorker.guardReserve(() => true),
    error => error?.code === 'KR_UPDATE_FENCE_ATOMIC_BUSY');
  await sleep(1550); // longer than the old 16-attempt synchronized retry budget
  releaseFirstRead();
  const outcomes = await outcomesPromise;
  assert.equal(outcomes.filter(x => x.status === 'rejected').length, 0,
    'same-worker burst must queue rather than exhaust Web Lock retry budget');
  assert.equal(started, routes.length + 1, 'every legitimate callback ran exactly once');
  assert.equal(shared.sameWorkerBusy, 0,
    'same-worker scheduler must not repeatedly contend with its own exclusive Web Lock');
  const starts = Object.keys(data).filter(key => key.startsWith(Atomic.START_PREFIX));
  const finishes = Object.keys(data).filter(key => key.startsWith(Atomic.FINISH_PREFIX));
  assert.equal(starts.length, routes.length + 1, 'durable start receipts are not skipped');
  assert.equal(finishes.length, starts.length, 'every completed callback has durable finish receipt');
  assert.equal(await otherWorker.guardReserve(() => 'idle'), 'idle',
    'fresh worker can reserve only after verified prior-generation receipts');
  return {diagnosticCount, routeCount: routes.length + 1, sameWorkerBusy: shared.sameWorkerBusy,
    otherWorkerBusy: shared.otherWorkerBusy, requests: shared.requests};
}

test('KAR-195 fresh diagnostic session: same-worker startup burst must not starve its own P8 requests',
  {timeout: 12000}, async () => { console.log('KAR195 fixture', await burst(0)); });
test('KAR-195 near-capacity diagnostics: equivalent startup burst retains cross-worker fencing',
  {timeout: 16000}, async () => { console.log('KAR195 fixture', await burst(2498)); });
