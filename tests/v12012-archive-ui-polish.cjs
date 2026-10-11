const assert = require('assert');
const fs = require('fs');

const app = fs.readFileSync('app.js', 'utf8') + '\n' + fs.readFileSync('mass-renewal-ui-controller.js', 'utf8') + '\n' + fs.readFileSync('archive-trash-insertion-ui-controller.js', 'utf8');
const activity = fs.readFileSync('app-activity-center.js', 'utf8');
const html = fs.readFileSync('app.html', 'utf8');
const css = fs.readFileSync('app.css', 'utf8');
function pass(label) { console.log(`PASS ${label}`); }

assert.match(html, /<div class="archive-insert-flow">\s*<div id="archiveDropzone"/);
assert.ok(html.indexOf('class="archive-insert-flow"') > html.indexOf('id="archiveInsertSteps"'));
assert.ok(html.indexOf('id="archiveProgressMessage"') > html.indexOf('class="archive-insert-flow"'));
pass('archive dynamic content is grouped below the gold-line stepper');

assert.match(css, /\.archive-insert-flow\s*\{[^}]*display:grid;[^}]*gap:12px;[^}]*margin:0 0 16px;/s);
assert.match(css, /\.archive-insert-flow\s*>\s*\.renewal-progress-message\s*\{\s*margin:0;\s*\}/s);
pass('archive content stack owns consistent vertical spacing without negative progress overlap');

assert.match(html, /id="archiveInsertSafety" class="renewal-start-safety info hidden"/);
pass('archive safety copy uses neutral info styling instead of amber warning styling');

assert.doesNotMatch(app, /setStatus\(\s*['"]ready['"]\s*,\s*['"]Anzeige aus ZIP wird inseriert['"]/);
pass('archive insertion no longer publishes a generic persistent running status card');

assert.match(app, /LEGACY_ARCHIVE_INSERT_STATUS_ID\s*=\s*['"]status:Anzeige aus ZIP wird inseriert['"]/);
assert.match(app, /legacyArchiveInsertStatusId:\s*LEGACY_ARCHIVE_INSERT_STATUS_ID/);
assert.match(activity, /String\(currentActivity\?\.id \|\| ''\) === legacyArchiveInsertStatusId/);
assert.match(activity, /currentActivity\s*=\s*null;\s*migrationChanged\s*=\s*true;/);
pass('legacy stale archive running card is migrated out of the current status slot');

assert.match(app, /ARCHIVE_INSERTION_STATE_CHANGED/);
assert.match(app, /revision\s*<\s*trackedArchiveInsertionRevision/);
pass('v1.20.11 monotonic archive workflow state channel remains intact');

console.log('PASS v1.20.12 ZIP UI polish contract');
