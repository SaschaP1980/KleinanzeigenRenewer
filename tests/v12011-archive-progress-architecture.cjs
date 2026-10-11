const assert = require('assert');
const fs = require('fs');

const app = fs.readFileSync('app.js', 'utf8') + '\n' + fs.readFileSync('mass-renewal-ui-controller.js', 'utf8') + '\n' + fs.readFileSync('archive-trash-insertion-ui-controller.js', 'utf8');
const background = fs.readFileSync('background.js', 'utf8') + '\n' + fs.readFileSync('archive-insertion-service.js', 'utf8');
const html = fs.readFileSync('app.html', 'utf8');

function pass(label) { console.log(`PASS ${label}`); }

assert.match(background, /function broadcastArchiveInsertionState\(/);
assert.match(background, /type:\s*['"]ARCHIVE_INSERTION_STATE_CHANGED['"]/);
assert.match(background, /revision:\s*Math\.max\(0,\s*Number\(session\.revision\)/);
assert.match(background, /session\.revision\s*=\s*Math\.max\(/);
assert.doesNotMatch(background, /broadcastInventoryChanged\(['"]archive-insertion-updated['"]/);
pass('archive workflow state has a dedicated monotonic runtime channel');

assert.match(app, /function applyArchiveInsertionSessionSnapshot\(/);
assert.match(app, /trackedArchiveInsertionRevision/);
assert.match(app, /ARCHIVE_INSERTION_STATE_CHANGED/);
assert.match(app, /revision\s*<\s*trackedArchiveInsertionRevision/);
pass('archive UI consumes monotonic snapshots independently of inventory refresh');

const scheduleStart = app.indexOf('function scheduleLiveInventoryRefresh');
const scheduleEnd = app.indexOf('\nchrome.runtime.onMessage.addListener', scheduleStart);
const scheduleBody = app.slice(scheduleStart, scheduleEnd);
assert.doesNotMatch(scheduleBody, /archive-insertion-updated/);
assert.doesNotMatch(scheduleBody, /refreshArchiveInsertionProgress/);
pass('inventory debounce no longer owns archive workflow progress');

const introPos = html.indexOf('id="archiveInsertIntro"');
const stepsPos = html.indexOf('id="archiveInsertSteps"');
const dropzonePos = html.indexOf('id="archiveDropzone"');
const previewPos = html.indexOf('id="archivePreview"');
assert.ok(introPos >= 0 && stepsPos > introPos && stepsPos < dropzonePos && stepsPos < previewPos);
pass('ZIP stepper is directly below the stable intro and above changing content');

const showStart = app.indexOf('function showArchiveInsertionProgress');
const showEnd = app.indexOf('\nasync function refreshArchiveInsertionProgress', showStart);
const showBody = app.slice(showStart, showEnd);
assert.doesNotMatch(showBody, /archiveInsertIntro\.classList\.add\(['"]hidden['"]\)/);
assert.match(showBody, /archiveInsertIntro\.classList\.remove\(['"]hidden['"]\)/);
pass('ZIP progress keeps the intro + stepper stable during the single-run workflow');

console.log('PASS v1.20.11 ZIP progress architecture contract');
