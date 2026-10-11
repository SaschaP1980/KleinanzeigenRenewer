const fs = require('fs');
const assert = require('assert');

const runner = fs.readFileSync('inventory-runner.js', 'utf8');
const background = fs.readFileSync('background.js', 'utf8');
const bulkInventoryController = fs.readFileSync('bulk-inventory-controller.js', 'utf8');
const app = fs.readFileSync('app.js', 'utf8');

let pass = 0;
function check(name, fn) {
  try { fn(); pass += 1; console.log(`PASS ${name}`); }
  catch (error) { console.error(`FAIL ${name}: ${error.message}`); process.exitCode = 1; }
}

check('readiness timeout classifies single-page count mismatch explicitly', () => {
  assert.match(runner, /KR_MY_ADS_INCONSISTENT/);
  assert.match(runner, /single-page-incomplete/);
});
check('readiness error carries observed listing ids and counts', () => {
  assert.match(runner, /error\.details\s*=\s*\{[\s\S]*expectedOnline[\s\S]*listingCount[\s\S]*listingIds/);
});
check('content response exposes structured readiness details', () => {
  assert.match(runner, /errorDetails\s*:\s*error\.details/);
});
check('background tab request preserves structured error details', () => {
  assert.match(background, /response\?\.errorDetails[\s\S]*error\.details/);
});
check('bulk source attempt diagnostics include observed listing ids', () => {
  assert.match(bulkInventoryController, /BULK_SOURCE_OPERATION_ATTEMPT_FAILED[\s\S]*listingIds/);
});
check('background runtime response preserves structured error details for app', () => {
  assert.match(background, /sendResponse\(\{ ok: false, error: error\.message, errorCode: error\?\.code \|\| null, errorDetails:/);
});
check('app runtime errors preserve structured details', () => {
  assert.match(app, /response\?\.errorDetails[\s\S]*error\.details/);
});
check('end-user copy explains Kleinanzeigen count inconsistency and safe abort', () => {
  assert.match(app, /KR_MY_ADS_INCONSISTENT/);
  assert.match(app, /Deshalb wurde die Erfassung zur Sicherheit nicht gestartet/);
  assert.match(app, /Bitte warte kurz und versuche es anschließend erneut/);
});

if (!process.exitCode) console.log(`${pass}/8 PASS`);
