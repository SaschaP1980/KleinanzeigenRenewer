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
      if (!waitingForFirstRead) {
        waitingForFirstRead = true;
        await firstReadBarrier; // deterministic slow first receipt read under exclusive lock
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

test('KAR-195 cross-worker reserve remains fail-closed on interrupted uncompleted P8 handler',
  async () => {
    const data = Object.create(null);
    const storageLocal = {
      async get(keys) {
        const names = keys === null ? Object.keys(data) : Array.isArray(keys) ? keys : [keys];
        return Object.fromEntries(names.filter(key => Object.hasOwn(data, key))
          .map(key => [key, structuredClone(data[key])]));
      },
      async set(patch) { Object.assign(data, structuredClone(patch)); }
    };
    let held = false, sequence = 0;
    const lockManager = {async request(name, opts, fn) {
      assert.equal(name, Atomic.LOCK_NAME);
      assert.deepEqual(opts, {mode:'exclusive', ifAvailable:true});
      if (held) return fn(null);
      held = true;
      try { return await fn({name, mode:'exclusive'}); }
      finally { held = false; }
    }};
    function make(workerInstanceId) {
      return Atomic.create({
        storageLocal, lockManager, workerInstanceId,
        clock: () => Date.now(), newToken: () => 'synthetic_crash_token_' + (++sequence) + '_long'
      });
    }
    const beforeRestart = make('synthetic_worker_before_restart');
    const afterRestart = make('synthetic_worker_after_restart');
    let signalStarted;
    const started = new Promise(resolve => { signalStarted = resolve; });
    const forever = new Promise(() => {});
    // A simulated worker is terminated after durable start, before its task
    // settles. No finish receipt may be invented and a fresh worker must deny reserve.
    void beforeRestart.withAdmission('GET_BULK_RUN_STATUS', async () => {
      signalStarted();
      return forever;
    });
    await started;
    await assert.rejects(afterRestart.guardReserve(() => 'idle'),
      error => error?.code === 'KR_UPDATE_FENCE_BUSY');
    assert.equal(Object.keys(data).filter(key => key.startsWith(Atomic.START_PREFIX)).length, 1);
    assert.equal(Object.keys(data).filter(key => key.startsWith(Atomic.FINISH_PREFIX)).length, 0);
  });

test('KAR-195 a rejected admitted task cannot poison queued later P8 admissions',
  async () => {
    const data = Object.create(null);
    let count = 0;
    const coordinator = Atomic.create({
      storageLocal: {
        async get(keys) {
          const names = keys === null ? Object.keys(data) : Array.isArray(keys) ? keys : [keys];
          return Object.fromEntries(names.filter(key => Object.hasOwn(data,key))
            .map(key => [key, structuredClone(data[key])]));
        },
        async set(patch) { Object.assign(data, structuredClone(patch)); }
      },
      lockManager: {async request(name,opts,fn) {
        assert.equal(name,Atomic.LOCK_NAME);
        assert.deepEqual(opts,{mode:'exclusive',ifAvailable:true});
        return fn({name,mode:'exclusive'});
      }},
      workerInstanceId: 'synthetic_queue_rejection_worker',
      clock: () => Date.now(),
      newToken: () => 'synthetic_queue_token_' + (++count) + '_long'
    });
    await assert.rejects(coordinator.withAdmission('GET_BULK_RUN_STATUS', async () => {
      throw new Error('EXPECTED_SYNTHETIC_HANDLER_FAILURE');
    }), /EXPECTED_SYNTHETIC_HANDLER_FAILURE/);
    assert.equal(await coordinator.withAdmission('LOG_DIAGNOSTIC_EVENT', async () => 'ok'), 'ok');
    assert.equal(Object.keys(data).filter(key => key.startsWith(Atomic.START_PREFIX)).length, 2);
    assert.equal(Object.keys(data).filter(key => key.startsWith(Atomic.FINISH_PREFIX)).length, 2);
    assert.equal(await coordinator.guardReserve(() => 'idle'), 'idle');
  });


test('KAR-195 native 250ms full-store delay: routed admission uses targeted durable receipts, reserve remains independent full double-scan',
  {timeout: 10000}, async () => {
    const data = Object.create(null);
    data.diagnostics = Array.from({length: 2498}, (_, sequence) => ({event:'SYNTHETIC', sequence}));
    let fullReads = 0, targetedReads = 0, serial = 0;
    const storageLocal = {
      async get(keys) {
        if (keys === null) {
          fullReads++;
          await sleep(10); // deterministic proxy for the expensive real native full-store scan
        } else targetedReads++;
        const names = keys === null ? Object.keys(data) : Array.isArray(keys) ? keys : [keys];
        return Object.fromEntries(names.filter(key => Object.hasOwn(data, key))
          .map(key => [key, structuredClone(data[key])]));
      },
      async set(patch) { Object.assign(data, structuredClone(patch)); }
    };
    const lockManager = {async request(name, options, fn) {
      assert.equal(name, Atomic.LOCK_NAME);
      assert.deepEqual(options, {mode:'exclusive', ifAvailable:true});
      return fn({name,mode:'exclusive'});
    }};
    const coordinator = Atomic.create({
      storageLocal, lockManager, workerInstanceId:'synthetic_native_worker',
      clock: () => 123456, newToken: () => 'kar195_native_token_' + (++serial) + '_long'
    });
    const responses = await Promise.all(Array.from({length: 12}, (_, i) =>
      coordinator.withAdmission('RECOGNIZE_PROFILE', async () => i)));
    assert.deepEqual(responses, Array.from({length: 12}, (_, i) => i),
      'all concurrent startup messages must complete under the real exclusive Web Lock');
    assert.equal(fullReads, 0,
      'common start/finish route must not copy the entire 2498-record diagnostic store for each receipt');
    assert.ok(targetedReads >= 48,
      'each start and finish must still independently read the token slot and verify durable write ACK');
    assert.equal(Object.keys(data).filter(k => k.startsWith(Atomic.START_PREFIX)).length, 12);
    assert.equal(Object.keys(data).filter(k => k.startsWith(Atomic.FINISH_PREFIX)).length, 12);
    assert.equal(await coordinator.guardReserve(() => 'idle'), 'idle');
    assert.equal(fullReads, 2,
      'cross-worker reserve must still independently enumerate the complete durable journal twice');
    data[Atomic.START_PREFIX + 'unresolved_prior_worker_token'] = {
      schema:1,state:'admitted',token:'unresolved_prior_worker_token',
      operationType:'REMOTE_PENDING',workerInstanceId:'older_worker',startedAtMs:123456
    };
    await assert.rejects(coordinator.guardReserve(() => 'unreachable'),
      error => error?.code === 'KR_UPDATE_FENCE_BUSY',
      'an interrupted prior-generation receipt must still block reserve after fast routed admissions');
    data[Atomic.FINISH_PREFIX + 'unresolved_prior_worker_token'] = {bad:true};
    await assert.rejects(coordinator.guardReserve(() => 'unreachable'),
      error => error?.code === 'KR_UPDATE_FENCE_ATOMIC_STORAGE',
      'malformed remote finish remains fail closed during the independent full-journal scan');
  });

test('KAR-195 targeted P8 receipt check fails closed on token collision or changed own start',
  async () => {
    const data = Object.create(null);
    const token = 'synthetic_duplicate_token_123';
    const store = {
      async get(keys) {
        const names = keys === null ? Object.keys(data) : Array.isArray(keys) ? keys : [keys];
        return Object.fromEntries(names.filter(key => Object.hasOwn(data,key))
          .map(key => [key,structuredClone(data[key])]));
      },
      async set(patch) { Object.assign(data,structuredClone(patch)); }
    };
    const lockManager = {async request(name,options,fn) {
      assert.equal(name,Atomic.LOCK_NAME);
      assert.deepEqual(options,{mode:'exclusive',ifAvailable:true});
      return fn({name,mode:'exclusive'});
    }};
    const coordinator = Atomic.create({
      storageLocal:store, lockManager, workerInstanceId:'synthetic_token_worker',
      clock:()=>123456, newToken:()=>token
    });
    await coordinator.withAdmission('GET_PROFILE_STATE',()=>true);
    await assert.rejects(coordinator.withAdmission('RECOGNIZE_PROFILE',()=>true),
      error=>error?.code==='KR_UPDATE_FENCE_ATOMIC_STORAGE',
      'a repeated receipt token must not overwrite a prior start/finish');
    const different = Atomic.create({
      storageLocal:store,lockManager,workerInstanceId:'synthetic_other_worker',
      clock:()=>123456,newToken:()=>token+'_new'
    });
    await assert.rejects(different.withAdmission('RECOGNIZE_PROFILE', async receipt=>{
      data[Atomic.START_PREFIX+receipt.token].startedAtMs++;
    }),error=>error?.code==='KR_UPDATE_FENCE_ATOMIC_STORAGE',
    'the changed durable start cannot be considered completed');
    assert.equal(Object.hasOwn(data,Atomic.FINISH_PREFIX+token+'_new'), false);
  });
