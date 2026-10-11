const assert = require('assert');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const app = require('./v12210-source-surface.cjs');
function pass(message) { console.log(`PASS ${message}`); }

const start = app.indexOf("} else {\n\n    const createButton = document.createElement('button');");
assert.ok(start >= 0, 'ordinary inventory action block must exist');
const end = app.indexOf("    const deleteButton = document.createElement('button');", start);
assert.ok(end > start, 'ordinary inventory action block must contain delete button');
const block = app.slice(start, end);

assert.match(block, /const onlineStatusPending\s*=\s*publicAvailabilityPending\(record\);/);
pass('ordinary inventory card snapshots Bald Online state once');
assert.match(block, /updateButton\.textContent\s*=\s*onlineStatusPending\s*\?\s*'Online-Status prüfen'\s*:\s*'Daten aktualisieren';/);
pass('ordinary inventory card labels pending public availability as Online-Status prüfen');
assert.match(block, /createButton\.disabled\s*=\s*onlineStatusPending\s*\|\|/);
pass('ordinary inventory card explicitly disables Neu inserieren while Bald Online');
assert.match(block, /const onlineStatusOnly\s*=\s*onlineStatusPending;/);
pass('ordinary inventory card routes pending refresh through online-status-only action');
assert.match(block, /createButton\.disabled\s*=\s*onlineStatusPending\s*\|\|\s*!ready\s*\|\|\s*insertionLockActive\(\)/);
pass('failed Online Status retry cannot re-enable Neu inserieren while Bald Online');
