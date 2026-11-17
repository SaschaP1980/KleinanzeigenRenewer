'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const zlib = require('node:zlib');
const fs = require('node:fs');
const Export = require('../src/background/services/diagnostic-export-service.js');
const Zip = require('../src/app/diagnostic-zip.js');
const Controls = require('../src/app/diagnostics-controls-controller.js');

async function decodeZip(blob) {
  const bytes = Buffer.from(await blob.arrayBuffer()), files = new Map();
  let offset = 0;
  while (offset + 30 <= bytes.length && bytes.readUInt32LE(offset) === 0x04034b50) {
    const method = bytes.readUInt16LE(offset + 8);
    const crc = bytes.readUInt32LE(offset + 14);
    const compressedSize = bytes.readUInt32LE(offset + 18);
    const plainSize = bytes.readUInt32LE(offset + 22);
    const nameSize = bytes.readUInt16LE(offset + 26);
    const extraSize = bytes.readUInt16LE(offset + 28);
    const name = bytes.subarray(offset + 30, offset + 30 + nameSize).toString('utf8');
    const from = offset + 30 + nameSize + extraSize;
    const compressed = bytes.subarray(from, from + compressedSize);
    const decoded = method === 8 ? zlib.inflateRawSync(compressed) : Buffer.from(compressed);
    assert.ok(method === 0 || method === 8, 'only valid stored/deflate ZIP methods');
    assert.equal(decoded.length, plainSize, 'ZIP uncompressed byte length');
    assert.equal(Zip.crc32(decoded), crc, 'ZIP CRC32 for ' + name);
    assert.ok(name && !files.has(name), 'distinct nonempty ZIP member');
    files.set(name, decoded.toString('utf8'));
    offset = from + compressedSize;
  }
  assert.equal(bytes.readUInt32LE(offset), 0x02014b50, 'ZIP has central directory');
  assert.ok(bytes.includes(Buffer.from([0x50,0x4b,0x05,0x06])), 'ZIP has end-of-central-directory');
  return files;
}

function exportFixture(events) {
  const chromeApi = {
    storage: {
      local: { get: async () => ({}) },
      session: { get: async () => ({}) }
    },
    runtime: {
      id: 'hafahjhhgiipdegfkgacchmnacgblnah',
      getManifest: () => ({ name: 'kleinanzeigen Manager', version: '1.24.3',
        manifest_version: 3, permissions: ['storage'], host_permissions: [] })
    }
  };
  return Export.create({
    chromeApi, navigatorApi: { userAgent: 'KAR-191 fixture', language: 'de-DE', platform: 'fixture' },
    messageContractRegistry: { snapshot: () => ({}) },
    maxDiagnostics: 2500, diagnosticRetentionMs: 14 * 86400000,
    readDiagnostics: async () => events,
    getBulkRunState: async () => null,
    listInventories: async () => [],
    readFillSessions: async () => ({}),
    readRenewalSessions: async () => ({}),
    getProfileState: async () => ({ profiles: [] }),
    readRecentGalleryDiagnostics: async () => [],
    readMassRenewalBatch: async () => null,
    sanitizeDiagnosticValue: value => value,
    currentDiagnosticSessionId: () => 'session-kar191',
    normalizeRenewalPhaseAttempts: value => value,
    renewalPublicSnapshot: value => value,
    massRenewalPublicSnapshot: value => value,
    redactUrl: value => value,
    representedDiagnosticEventCount: values => values.length
  });
}

test('KAR-191 zero, small and near-capacity diagnostic buffers produce real valid ZIP archives', async () => {
  for (const amount of [0, 3, 2498]) {
    const events = Array.from({ length: amount }, (_, i) => ({
      timestamp: new Date(Date.now() - i * 1000).toISOString(),
      sessionId: 'session-kar191', severity: i % 100 ? 'info' : 'warning',
      event: 'KAR191_EVENT', details: { ordinal: i, attempt: 'export-zip-integrity' },
      context: {}
    }));
    const exported = await exportFixture(events).buildDiagnosticExport();
    assert.equal(exported.files.some(f => f.name === 'diagnostics.jsonl'), true);
    const zip = await Zip.createZip(exported.files.map(f => ({ name: f.name, data: f.text })));
    const result = await decodeZip(zip);
    assert.ok(result.has('summary.txt'));
    assert.ok(result.has('environment.json'));
    assert.ok(result.has('diagnostics.jsonl'));
    const restored = result.get('diagnostics.jsonl').trim().split('\n').filter(Boolean);
    assert.equal(restored.length, amount);
    assert.match(result.get('summary.txt'), new RegExp('Exportierte Diagnoseeinträge: ' + amount));
  }
});

function element() {
  const listeners = {};
  const attrs = {};
  return {
    textContent: '', style: {}, hidden: true, disabled: false, open: false,
    addEventListener(name, callback) { listeners[name] = callback; },
    fire(name) { return listeners[name]?.(); },
    setAttribute(name, value) { attrs[name] = value; },
    removeAttribute(name) { delete attrs[name]; },
    getAttribute(name) { return attrs[name]; }
  };
}

test('KAR-191 ZIP action retries transient busy without bypassing its P8 request and delivers valid ZIP', async () => {
  const ui = Object.fromEntries(['occupancy', 'occupancyFill', 'occupancyText', 'accordion',
    'zipButton', 'resetButton', 'emergencyButton', 'status'].map(name => [name, element()]));
  const payload = { filename: 'kar191.zip', files: [
    { name: 'summary.txt', text: 'KAR-191 success\n' },
    { name: 'diagnostics.jsonl', text: '' }
  ] };
  let requested = 0, clicked = 0, delivered = null, appends = 0, logs = 0;
  const doc = {
    createElement(tag) {
      assert.equal(tag, 'a');
      return { href: '', download: '', click() { clicked += 1; }, remove() {} };
    },
    body: { append() { appends += 1; } }
  };
  Controls.create({
    elements: ui, document: doc, DiagnosticZip: Zip, exportRetryDelayMs: 1,
    objectUrlApi: {
      createObjectURL(blob) { delivered = blob; return 'blob:kar191-diagnostic'; },
      revokeObjectURL() {}
    },
    runtimeMessage: async request => {
      assert.equal(request.type, 'GET_DIAGNOSTIC_EXPORT', 'no synthetic or unsafe routes');
      requested += 1;
      if (requested < 3) throw Object.assign(Error('KR_UPDATE_FENCE_ATOMIC_BUSY'),
        { code: 'KR_UPDATE_FENCE_ATOMIC_BUSY' });
      return payload;
    },
    logEvent: async () => { logs += 1; throw Error('diagnostics writer temporarily blocked'); }
  });
  ui.zipButton.fire('click');
  await new Promise(resolve => setTimeout(resolve, 60));
  assert.equal(requested, 3, 'bounded retries only for transient atomic lock contention');
  assert.equal(clicked, 1);
  assert.equal(appends, 1);
  assert.equal(ui.zipButton.disabled, false);
  assert.match(ui.status.textContent, /2 Diagnosedateien als ZIP erstellt/);
  const files = await decodeZip(delivered);
  assert.equal(files.get('summary.txt'), 'KAR-191 success\n');
  assert.equal(files.get('diagnostics.jsonl'), '');
  assert.ok(logs > 0, 'logging attempts remain nonblocking even when writer fails');
});

test('KAR-191 interrupted/malformed/never-settled replies show a bounded error and retry controls', async () => {
  const ui = Object.fromEntries(['occupancy', 'occupancyFill', 'occupancyText', 'occupancyRetry',
    'occupancyStatus', 'accordion', 'zipButton', 'resetButton', 'emergencyButton', 'status']
    .map(name => [name, element()]));
  const controller = Controls.create({
    elements: ui,
    occupancyTimeoutMs: 8, exportTimeoutMs: 8,
    runtimeMessage: () => new Promise(() => {}),
    logEvent: async () => {}
  });
  await controller.refreshOccupancy();
  assert.equal(ui.occupancyRetry.hidden, false);
  assert.match(ui.occupancyStatus.textContent, /Zeitüberschreitung/);
  ui.zipButton.fire('click');
  await new Promise(resolve => setTimeout(resolve, 40));
  assert.equal(ui.zipButton.disabled, false);
  assert.match(ui.status.textContent, /Zeitüberschreitung/);
  const markup = fs.readFileSync('src/app/app.html', 'utf8');
  assert.match(markup, /id="diagnosticOccupancyRetry"/);
  assert.match(markup, /id="diagnosticOccupancyStatus" role="status"/);
});
