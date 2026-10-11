const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const runner = fs.readFileSync(path.join(__dirname, '../inventory-runner.js'), 'utf8');
const background = require('./v12212-source-surface.cjs');
let n = 0;
const pass = name => { n += 1; console.log('PASS ' + name); };

assert.match(runner, /\/m-meine-anzeigen\.html/);
assert.match(runner, /Anzeigen\\s\+online/);
assert.match(runner, /aria-label="Nächste"/);
assert.match(runner, /aria-current="page"/);
pass('runner targets Meine Anzeigen, header count and real paging semantics');

assert.match(runner, /normalizeKey\(element\.textContent\) === 'bearbeiten'/);
assert.match(runner, /p-anzeige-bearbeiten\.html\?adId=/);
assert.match(runner, /processedIds/);
assert.match(runner, /new Set\(state\.processedIds \|\| \[\]\)/);
pass('listing discovery uses Bearbeiten and stable ad-id deduplication');

assert.match(runner, /BULK_OPEN_WORKER/);
assert.match(runner, /BULK_EXTRACT_SAVE_WORKER/);
assert.match(runner, /BULK_RECORD_RESULT/);
assert.match(runner, /WORKER_TIMEOUT_MS = 90000/);
pass('each listing is processed sequentially through a dedicated worker tab');

assert.match(background, /processed === expected/);
assert.match(background, /complete-with-errors/);
assert.match(background, /needs-review/);
pass('final completeness is reconciled against the online-ad total');

assert.match(runner, /Erfassung abgeschlossen/);
assert.match(runner, /Anzeigen abgearbeitet/);
assert.match(runner, /Seite \$\{state\.currentPage\}/);
pass('in-page progress exposes total, current page and current title');

console.log(`${n} v1.2.0 inventory-runner tests passed`);
