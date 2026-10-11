const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
(async () => {
  const DiagnosticZip = require(path.join(__dirname, '..', 'diagnostic-zip.js'));
  assert.ok(DiagnosticZip?.createZip);
  const blob = await DiagnosticZip.createZip([
    { name: 'summary.txt', data: 'Kleinanzeigen Renewal\n' },
    { name: 'errors.json', data: '[]\n' }
  ]);
  assert.equal(blob.type, 'application/zip');
  const bytes = Buffer.from(await blob.arrayBuffer());
  assert.equal(bytes.subarray(0, 4).toString('hex'), '504b0304');
  assert.ok(bytes.includes(Buffer.from('summary.txt')));
  assert.ok(bytes.includes(Buffer.from('errors.json')));
  assert.ok(bytes.includes(Buffer.from([0x50,0x4b,0x05,0x06])));
  const crc = DiagnosticZip.crc32(new TextEncoder().encode('123456789'));
  assert.equal(crc >>> 0, 0xcbf43926);
  console.log('PASS diagnostic ZIP writer creates a valid ZIP envelope and CRC32');
})().catch(error => { console.error(error); process.exitCode = 1; });
