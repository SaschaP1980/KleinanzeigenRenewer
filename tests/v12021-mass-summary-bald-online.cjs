const assert = require('assert');
const fs = require('fs');
const path = require('path');
const root = process.argv[2] ? path.resolve(process.argv[2]) : path.join(__dirname, '..');
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8') + '\n' + fs.readFileSync(path.join(root, 'mass-renewal-ui-controller.js'), 'utf8') + '\n' + fs.readFileSync(path.join(root, 'archive-trash-insertion-ui-controller.js'), 'utf8');
const background = require('./v12215-source-surface.cjs');
const css = fs.readFileSync(path.join(root, 'app.css'), 'utf8');
function pass(message) { console.log(`PASS ${message}`); }

assert.match(background, /publicAvailabilityPending:\s*item\.publicAvailabilityPending\s*===\s*true/);
pass('mass-renewal public snapshot preserves per-item public availability pending state');

const markStart = background.indexOf('async function markMassRenewalItemSucceeded');
assert.ok(markStart >= 0, 'markMassRenewalItemSucceeded must exist');
const markEnd = background.indexOf('\nasync function startMassRenewalBatch', markStart);
assert.ok(markEnd > markStart, 'markMassRenewalItemSucceeded block must be bounded');
const markBlock = background.slice(markStart, markEnd);
assert.match(markBlock, /item\.publicAvailabilityPending\s*=\s*session\.publicAvailabilityPending\s*===\s*true;/);
pass('successful mass item captures pending public availability from renewal session');
assert.match(markBlock, /publicAvailabilityPending:\s*snapshot\.publicAvailabilityPending\s*===\s*true/);
pass('success diagnostic records pending public availability');

const recoveryStart = background.indexOf("if (/^\\d+$/.test(String(running.newAdId || ''))) {");
assert.ok(recoveryStart >= 0, 'mass recovery success block must exist');
const recoveryBlock = background.slice(recoveryStart, recoveryStart + 1400);
assert.match(recoveryBlock, /item\.publicAvailabilityPending\s*=\s*publicAvailabilityPending\(existing\);/);
pass('recovery success reconstructs pending public availability from promoted inventory record');

const previewStart = app.indexOf('function massRenewalPreviewRecord(item)');
assert.ok(previewStart >= 0, 'massRenewalPreviewRecord must exist');
const previewEnd = app.indexOf('\nfunction massRenewalRetryActionLabel', previewStart);
const previewBlock = app.slice(previewStart, previewEnd);
const newInventoryPos = previewBlock.indexOf("String(item?.newInventoryId || '')");
const sourceInventoryPos = previewBlock.indexOf("String(item?.inventoryId || '')");
assert.ok(newInventoryPos >= 0 && sourceInventoryPos >= 0 && newInventoryPos < sourceInventoryPos,
  'mass summary preview must prefer promoted new inventory record over trashed source record');
pass('mass summary preview prefers new inventory record');

assert.match(app, /function massRenewalItemPublicPending\(item, previewRecord = null\)/);
pass('mass summary has a dedicated pending-public helper');
assert.match(app, /if \(newAdId && previewRecord && previewAdId === newAdId\) return publicAvailabilityPending\(previewRecord\);/);
pass('live promoted inventory state overrides a stale historical pending snapshot once public availability changes');
assert.match(app, /if \(status === 'success' && massRenewalItemPublicPending\(item, previewRecord\)\) return 'Bald Online';/);
pass('successful pending mass item is visibly labelled Bald Online');
assert.match(app, /massRenewalItemStatusClass\(item, previewRecord\)/);
pass('mass summary derives a distinct visual class for Bald Online');
assert.match(css, /\.mass-renewal-status\.bald-online\s*\{[^}]*border-color:\s*#8d7a35;[^}]*color:\s*#ffe6a1;[^}]*background:\s*#342e18;/s);
pass('Bald Online summary status uses the established amber pending treatment');
