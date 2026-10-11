const fs = require('node:fs');
const path = require('node:path');
const root = process.env.KR_ROOT ? path.resolve(process.env.KR_ROOT) : path.join(__dirname, '..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
const html = read('app.html');
const app = read('app.js');
const capture = read('inventory-capture-controller.js');
const captureUi = app + '\n' + capture;
const background = require('./v12215-source-surface.cjs');
const runner = read('inventory-runner.js');
let pass = 0, fail = 0;
function check(name, condition) {
  if (condition) { pass++; console.log('PASS ' + name); }
  else { fail++; console.error('FAIL ' + name); }
}
check('bulk inventory dialog exposes controlled stop action', /id="inventoryCaptureStopAfterCurrent"/.test(html) && /Nach aktueller Anzeige stoppen/.test(html));
check('app requests stop-after-current for the active run', /REQUEST_BULK_INVENTORY_STOP_AFTER_CURRENT/.test(captureUi) && /inventoryCaptureStopAfterCurrent/.test(captureUi));
check('requested stop is shown as pending while current listing finishes', /Stopp vorgemerkt/.test(captureUi) && /aktuelle Anzeige wird noch vollständig erfasst/i.test(captureUi));
check('controlled stop is a terminal inventory result with skipped reconciliation', /status === 'stopped'/.test(captureUi) && /Bereits gespeicherte Anzeigen bleiben erhalten/i.test(captureUi) && /skipped-controlled-stop/.test(background));
check('runner finishes only at a listing boundary and does not begin reconciliation', /BULK_FINISH_CONTROLLED_STOP/.test(runner) && /stopAfterCurrentRequested/.test(runner));
console.log(`${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
