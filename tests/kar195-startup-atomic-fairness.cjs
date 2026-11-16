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

test('KAR-195 duplicate passive trash-template recovery queries coalesce while startup is in flight',
  async () => {
    const TrashTemplate = require('../src/app/trash-template-ui-controller.js');
    let calls = 0, release;
    const gate = new Promise(resolve => { release = resolve; });
    const controller = TrashTemplate.create({
      insertionLockActive: () => false,
      runtimeMessage: async message => {
        assert.equal(message.type, 'GET_RECOVERABLE_TRASH_TEMPLATE_FILL');
        calls++;
        await gate;
        return null; // no active template session
      }
    });
    for (let i = 0; i < 8; i++) controller.syncFromLock();
    assert.equal(calls, 1, 'eight synchronous refreshes must send one recovery read');
    release();
    await new Promise(resolve => setImmediate(resolve));
    controller.syncFromLock(); // stable empty result is briefly cached
    assert.equal(calls, 1, 'a verified empty recovery result must not immediately fan out again');
  });

test('KAR-195 P8 timing hook exposes only bounded route, phase and aggregate-safe durations',
  async () => {
    const rows = Object.create(null);
    let sequence = 0;
    const storageLocal = {
      async get(keys) {
        const names = keys === null ? Object.keys(rows) : Array.isArray(keys) ? keys : [keys];
        return Object.fromEntries(names.filter(k => Object.hasOwn(rows, k))
          .map(k => [k, structuredClone(rows[k])]));
      },
      async set(patch) { Object.assign(rows, structuredClone(patch)); }
    };
    const lockManager = {async request(name, options, fn) {
      assert.equal(name, Atomic.LOCK_NAME);
      assert.deepEqual(options, {mode:'exclusive', ifAvailable:true});
      return fn({name,mode:'exclusive'});
    }};
    const samples = [];
    const coordinator = Atomic.create({
      storageLocal, lockManager, workerInstanceId: 'private-worker-token',
      clock: () => 1000, newToken: () => 'sensitive_token_' + (++sequence) + '_long',
      onSample: sample => samples.push(sample)
    });
    assert.equal(await coordinator.withAdmission('LOG_DIAGNOSTIC_EVENT',
      async () => 'ok'), 'ok');
    assert.equal(await coordinator.guardReserve(() => 'idle'), 'idle');
    assert.deepEqual(samples.map(s => s.phase), ['start','finish','reserve']);
    assert.ok(samples.every(s => s.route === 'LOG_DIAGNOSTIC_EVENT' || s.route === 'RESERVE'));
    for (const s of samples) {
      assert.ok(Number.isSafeInteger(s.holdMs) && s.holdMs >= 0 && s.holdMs <= 60000);
      assert.ok(Number.isSafeInteger(s.waitMs) && s.waitMs >= 0 && s.waitMs <= 60000);
      assert.ok(Number.isSafeInteger(s.busyAttempts) && s.busyAttempts >= 0);
      assert.ok(['ok','denied'].includes(s.outcome));
      assert.deepEqual(Object.keys(s).sort(),
        ['busyAttempts','holdMs','outcome','phase','route','waitMs'].sort(),
        'no receipts, worker IDs or unbounded dynamic fields in the hook');
      assert.doesNotMatch(JSON.stringify(s), /private-worker-token|sensitive_token/);
    }
    const throwing = Atomic.create({
      storageLocal, lockManager, workerInstanceId: 'worker-with-throwing-hook',
      clock: () => 1000, newToken: () => 'sensitive_token_' + (++sequence) + '_long',
      onSample: () => { throw Error('telemetry hook failed'); }
    });
    assert.equal(await throwing.withAdmission('GET_BULK_RUN_STATUS', () => 5), 5,
      'telemetry failure must never affect the safety-critical admitted operation');
  });

test('KAR-195 diagnostic-service aggregator stores a bounded startup-only lock window',
  async () => {
    const Diagnostics = require('../src/background/services/diagnostics-service.js');
    const rows = Object.create(null);
    const store = {
      async get(keys) {
        const names = keys === null ? Object.keys(rows) : Array.isArray(keys) ? keys : [keys];
        return Object.fromEntries(names.filter(k => Object.hasOwn(rows, k))
          .map(k => [k, structuredClone(rows[k])]));
      },
      async set(patch) { Object.assign(rows, structuredClone(patch)); }
    };
    const d = Diagnostics.create({
      storageLocal: store, randomUUID: () => 'synthetic-session',
      atomicProfileWindowMs: 5, batchFlushMs: 2
    });
    for (let i = 0; i < 14; i++) {
      d.recordAtomicSample({phase: 'start', route: 'LOG_DIAGNOSTIC_EVENT',
        holdMs: i + 1, waitMs: 7, busyAttempts: 1, outcome: 'ok',
        token: 'private-secret-must-never-be-recorded'});
    }
    await sleep(25);
    await d.flush();
    const events = (await d.read()).filter(e => e.event === 'P8_ATOMIC_ADMISSION_WINDOW');
    assert.equal(events.length, 1);
    assert.equal(events[0].details.samples, 14);
    assert.equal(events[0].details.busyAttempts, 14);
    assert.equal(events[0].details.maxHoldMs, 14);
    assert.ok(Array.isArray(events[0].details.routes));
    assert.equal(events[0].details.routes[0].name, 'LOG_DIAGNOSTIC_EVENT');
    assert.doesNotMatch(JSON.stringify(events), /private-secret-must-never-be-recorded/);
  });
