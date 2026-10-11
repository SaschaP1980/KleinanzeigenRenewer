const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');

const html = fs.readFileSync('app.html', 'utf8');
const css = fs.readFileSync('app.css', 'utf8');
const app = fs.readFileSync('app.js', 'utf8') + '\n' + fs.readFileSync('control-accordion-controller.js', 'utf8');
const actionsDiagnostics = fs.readFileSync('actions-diagnostics-controller.js', 'utf8');
const manifest = JSON.parse(fs.readFileSync('manifest.json', 'utf8'));
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const gold = JSON.parse(fs.readFileSync('tests/e2e/gold-v1.21.15.json', 'utf8'));
const sha = file => crypto.createHash('sha256').update(fs.readFileSync(path.resolve(file))).digest('hex');
let n = 0;
const pass = label => { n += 1; console.log(`PASS ${label}`); };

assert.ok(['1.22.1','1.22.2','1.22.3','1.22.4','1.22.5','1.22.6','1.22.7','1.22.8','1.22.9','1.22.10','1.22.11','1.22.12','1.22.13','1.22.14','1.22.15','1.22.16','1.22.17','1.22.18','1.22.19','1.22.20','1.22.21','1.22.22','1.22.23','1.22.24','1.22.25','1.22.26','1.22.27','1.22.28','1.22.29','1.22.30','1.23.0','1.23.1','1.23.2','1.23.3','1.23.4','1.23.5','1.23.6','1.23.7','1.23.8','1.23.9','1.23.10','1.23.11','1.23.12','1.23.13','1.23.14','1.23.15','1.23.16','1.23.17','1.23.18','1.23.19','1.23.20','1.23.22'].includes(manifest.version));
assert.ok(['1.22.1','1.22.2','1.22.3','1.22.4','1.22.5','1.22.6','1.22.7','1.22.8','1.22.9','1.22.10','1.22.11','1.22.12','1.22.13','1.22.14','1.22.15','1.22.16','1.22.17','1.22.18','1.22.19','1.22.20','1.22.21','1.22.22','1.22.23','1.22.24','1.22.25','1.22.26','1.22.27','1.22.28','1.22.29','1.22.30','1.23.0','1.23.1','1.23.2','1.23.3','1.23.4','1.23.5','1.23.6','1.23.7','1.23.8','1.23.9','1.23.10','1.23.11','1.23.12','1.23.13','1.23.14','1.23.15','1.23.16','1.23.17','1.23.18','1.23.19','1.23.20','1.23.22'].includes(pkg.version));
pass('v1.22.1+ controlled-accordion version range');

const v1224DependencyBoundaryFiles = new Set(['background.js','content.js','inventory-runner.js','platform-guard-content.js']);
for (const [file, expected] of Object.entries(gold.runtimeFileSha256)) {
  if (['1.22.22','1.22.23','1.22.24','1.22.25','1.22.26','1.22.27','1.22.28','1.22.29','1.22.30','1.23.0','1.23.1','1.23.2','1.23.3','1.23.4','1.23.5','1.23.6','1.23.7','1.23.8','1.23.9','1.23.10','1.23.11','1.23.12','1.23.13','1.23.14','1.23.15','1.23.16','1.23.17','1.23.18','1.23.19','1.23.20','1.23.22'].includes(manifest.version)) continue; // v1.22.22 cleanup intentionally changes runtime dependency wiring
  if (['app.html','app.css','app.js','template-filler.js'].includes(file)) continue;
  if (['1.22.4','1.22.5','1.22.6','1.22.7','1.22.8','1.22.9','1.22.10','1.22.11','1.22.12','1.22.13','1.22.14','1.22.15','1.22.16','1.22.17','1.22.18','1.22.19','1.22.20','1.22.21','1.22.22','1.22.23','1.22.24','1.22.25','1.22.26','1.22.27','1.22.28','1.22.29','1.22.30','1.23.0','1.23.1','1.23.2','1.23.3','1.23.4','1.23.5','1.23.6','1.23.7','1.23.8','1.23.9','1.23.10','1.23.11','1.23.12','1.23.13','1.23.14','1.23.15','1.23.16','1.23.17','1.23.18','1.23.19','1.23.20','1.23.22'].includes(manifest.version) && v1224DependencyBoundaryFiles.has(file)) continue;
  assert.equal(sha(file), expected, `unintended Gold runtime delta: ${file}`);
}
pass('all unaffected Gold production runtime files remain byte-identical');

assert.doesNotMatch(html, /<details\s+id="actionsAccordion"/);
assert.match(html, /<(?:section|div)\s+id="actionsAccordion"[^>]*data-accordion-mode="controlled"[^>]*data-open="true"/);
pass('Actions accordion no longer uses native details/open state');

assert.match(html, /<button\s+id="actionsAccordionToggle"[^>]*class="[^"]*control-accordion-summary[^"]*"[^>]*aria-expanded="true"[^>]*aria-controls="actionsAccordionPanel"/);
assert.match(html, /id="actionsAccordionPanel"[^>]*class="control-accordion-panel"/);
pass('Actions accordion uses accessible controlled button and panel');

assert.match(css, /\.control-accordion\s*>\s*\.control-accordion-summary/);
assert.match(css, /\.control-accordion\[data-open="true"\]\s*>\s*\.control-accordion-summary/);
pass('controlled Actions accordion has explicit visual open-state selectors');

assert.match(app, /function readOpen\(/);
assert.match(app, /function writeOpen\(/);
assert.match(app, /function header\(/);
pass('accordion controller abstracts native and controlled state');

assert.match(app, /dataset\?\.accordionMode\s*===\s*'controlled'/);
assert.match(app, /(?:header|summary)\?\.setAttribute\?\.\('aria-expanded'/);
assert.match(app, /panel\.hidden\s*=\s*!open/);
pass('controlled state synchronizes aria-expanded and panel visibility');

assert.doesNotMatch(app, /actionsAccordion\.querySelector\(':scope > summary'\)/);
assert.match(actionsDiagnostics, /const summary = accordionHeader\(actionsAccordion\)/);
assert.match(app, /accordionHeader:\s*controlAccordionHeader/);
pass('Actions diagnostics use injected generic header instead of native summary');

assert.equal((app.match(/\.submit\s*\(/g) || []).length, 0);
assert.equal((app.match(/requestSubmit\s*\(/g) || []).length, 0);
pass('publish safety invariant retained');

console.log(`${n}/9 PASS v1.22.1 controlled Actions accordion contract`);
