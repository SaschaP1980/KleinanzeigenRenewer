const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8') + '\n' + fs.readFileSync(path.join(root, 'mass-renewal-ui-controller.js'), 'utf8') + '\n' + fs.readFileSync(path.join(root, 'archive-trash-insertion-ui-controller.js'), 'utf8');
const start = app.indexOf('function massRenewalRowSeverity');
const end = app.indexOf('\nfunction massRenewalActivePhase', start);
assert.ok(start >= 0 && end > start, 'massRenewalRowSeverity helper not found');
const sandbox = {};
sandbox.globalThis = sandbox;
vm.runInNewContext(`${app.slice(start, end)}\nglobalThis.__severity = massRenewalRowSeverity;`, sandbox);
const severity = sandbox.__severity;

assert.strictEqual(severity({ status: 'success' }, { states: { 1: 'success', 2: 'success', 3: 'success', 4: 'success' } }), 'success');
assert.strictEqual(severity({ status: 'error' }, { states: { 1: 'success', 2: 'success', 3: 'error', 4: 'pending' } }), 'error');
assert.strictEqual(severity({ status: 'needs-review' }, { states: { 1: 'success', 2: 'success', 3: 'success', 4: 'error' } }), 'needs-review');
assert.strictEqual(severity({ status: 'running' }, { states: { 1: 'active', 2: 'pending', 3: 'pending', 4: 'pending' } }), 'active');
assert.strictEqual(severity({ status: 'queued' }, { states: { 1: 'pending', 2: 'pending', 3: 'pending', 4: 'pending' } }), 'neutral');
assert.strictEqual(severity({ status: 'cancelled' }, { states: { 1: 'pending', 2: 'pending', 3: 'pending', 4: 'pending' } }), 'neutral');

console.log('PASS v1.15.5 mass-renewal row severity runtime semantics');
