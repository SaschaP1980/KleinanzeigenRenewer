const fs = require('node:fs');
const assert = require('node:assert/strict');

const app = require('./v12210-source-surface.cjs');
const actions = fs.readFileSync('actions-diagnostics-controller.js', 'utf8');
const actionCode = app + '\n' + actions;
const css = fs.readFileSync('app.css', 'utf8');
const manifest = JSON.parse(fs.readFileSync('manifest.json', 'utf8'));
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));

let passed = 0;
function pass(label) { passed += 1; console.log(`PASS ${label}`); }

assert.match(app, /makeInfoLine\('Im Papierkorb',\s*formatDate\(record\.trash\?\.trashedAt\)\)/);
assert.match(app, /\['Im Papierkorb',\s*formatDate\(record\.trash\?\.trashedAt\)\]/);
pass('Papierkorb-Feldlabel ist auf Im Papierkorb gekürzt');

assert.match(css, /\.trash-template-steps\s*\{[^}]*grid-template-columns:\s*repeat\(3,minmax\(0,1fr\)\)/);
pass('drei Vorlagen-Schrittkacheln nutzen die gesamte verfügbare Breite');

assert.doesNotMatch(css, /\.control-accordion\.is-animating\s*>\s*summary\s*\{[^}]*pointer-events\s*:\s*none/);
pass('Accordion-Summary bleibt auch während Animation pointer-interaktiv');

assert.match(actionCode, /UI_ACTIONS_POINTER_CAPTURE/);
assert.match(actionCode, /elementsFromPoint/);
assert.match(app, /controlAccordionDiagnosticSnapshot/);
assert.match(actionCode, /possibleOverlay/);
pass('document-level Actions-Pointerdiagnose erfasst Hit-Stack, Accordion und Overlays');

assert.match(app, /UI_ACTIONS_ACCORDION_WATCHDOG_RECOVERED/);
assert.match(app, /UI_ACTIONS_ACCORDION_STALE_STATE_RECOVERED/);
assert.match(app, /sanitizeControlAccordionAnimations/);
pass('Accordion besitzt Watchdog und Sanierung für verwaiste Animationszustände');

assert.match(app, /window\.addEventListener\('focus',[\s\S]{0,260}sanitizeControlAccordionAnimations/);
assert.match(app, /visibilitychange[\s\S]{0,320}sanitizeControlAccordionAnimations/);
assert.match(actions, /performResync[\s\S]{0,500}sanitizeAccordionAnimations/);
pass('Focus, Visibility und Actions-Resync sanieren stale Accordion-Zustände');

assert.match(actionCode, /accordion:\s*accordionSnapshot\(actionsAccordion\)/);
pass('Actions-State-Snapshot enthält Accordion-Geometrie und Animationszustand');

assert.equal((app.match(/\.submit\s*\(/g) || []).length, 0);
assert.equal((app.match(/requestSubmit\s*\(/g) || []).length, 0);
pass('Publish-Safety bleibt bei 0 submit/requestSubmit');

assert.ok(['1.21.15','1.22.0','1.22.1','1.22.2','1.22.3','1.22.4','1.22.5','1.22.6','1.22.7','1.22.8','1.22.9','1.22.10','1.22.11','1.22.12','1.22.13','1.22.14','1.22.15','1.22.16','1.22.17','1.22.18','1.22.19','1.22.20','1.22.21','1.22.22','1.22.23','1.22.24','1.22.25','1.22.26','1.22.27','1.22.28','1.22.29','1.22.30','1.23.0','1.23.1','1.23.2','1.23.3','1.23.4','1.23.5','1.23.6','1.23.7','1.23.8','1.23.9','1.23.10','1.23.11','1.23.12','1.23.13','1.23.14','1.23.15','1.23.16','1.23.17','1.23.18','1.23.19','1.23.20','1.23.22'].includes(manifest.version));
assert.ok(['1.21.15','1.22.0','1.22.1','1.22.2','1.22.3','1.22.4','1.22.5','1.22.6','1.22.7','1.22.8','1.22.9','1.22.10','1.22.11','1.22.12','1.22.13','1.22.14','1.22.15','1.22.16','1.22.17','1.22.18','1.22.19','1.22.20','1.22.21','1.22.22','1.22.23','1.22.24','1.22.25','1.22.26','1.22.27','1.22.28','1.22.29','1.22.30','1.23.0','1.23.1','1.23.2','1.23.3','1.23.4','1.23.5','1.23.6','1.23.7','1.23.8','1.23.9','1.23.10','1.23.11','1.23.12','1.23.13','1.23.14','1.23.15','1.23.16','1.23.17','1.23.18','1.23.19','1.23.20','1.23.22'].includes(pkg.version));
pass('v1.21.15+ retained Actions/Accordion contract');

console.log(`${passed}/9 PASS v1.21.15+ Actions/Accordion recovery contract`);
