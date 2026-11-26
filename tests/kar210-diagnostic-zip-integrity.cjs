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
