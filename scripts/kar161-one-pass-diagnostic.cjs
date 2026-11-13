'use strict';
// Temporary, read-only KAR-161 diagnostic: collect ALL historical unit failures in
// one hosted run rather than stopping at the first obsolete version assertion.
const { spawnSync } = require('node:child_process');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const pkg = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
const test = pkg.scripts.test;
const nodes = [...test.matchAll(/\bnode\s+((?:(?:--[\w-]+\s+)*)(?:tests|scripts)\/[\w.-]+\.cjs)/g)]
  .map(m => m[1].trim().split(/\s+/));
if (nodes.length < 450) throw new Error('Diagnostics aborted: npm test command parser found only ' + nodes.length);
const start = Date.now();
const failures = [];
let passed = 0;
let skipped = 0;
for (let i = 0; i < nodes.length; i++) {
  const args = nodes[i];
  // Coverage outputs must be produced by the dedicated coverage gate, not here.
  if (args.some(x => x.startsWith('scripts/v12319-'))) { skipped++; continue; }
  const child = spawnSync(process.execPath, args, {
    cwd: root,
    env: { ...process.env,
      NODE_OPTIONS: i === 0 ? '' : '--require ./tests/v12222-vm-legacy-bridge.cjs' },
    encoding: 'utf8', timeout: 45000, maxBuffer: 8 * 1024 * 1024
  });
  if (child.status !== 0 || child.error) {
    failures.push({
      args: args.join(' '), status: child.status,
      error: String(child.error || ''),
      tail: ((child.stdout || '') + '\n' + (child.stderr || '')).slice(-2400)
    });
    process.stdout.write('FAIL ' + (i+1) + '/' + nodes.length + ' ' + args.join(' ') + '\n');
  } else {
    passed++;
    if (passed % 50 === 0) process.stdout.write('PASS ' + passed + '/' + nodes.length + '\n');
  }
}
console.log('KAR-161 one-pass diagnostic:', JSON.stringify({
  total: nodes.length, passed, failed: failures.length, skipped,
  seconds: Math.round((Date.now() - start) / 1000)
}, null, 2));
for (const fail of failures) console.log('\n--- ' + fail.args + ' ---\n' + fail.tail);
if (failures.length) process.exitCode = 1;
