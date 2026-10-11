const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const app = fs.readFileSync(path.join(root, 'src/app/app.js'), 'utf8');
const Controller = require('../src/app/control-accordion-controller.js');

let passed = 0;
const pass = (label, fn) => { fn(); passed += 1; console.log('PASS ' + label); };

pass('activity center reduced-motion dependency is backed by a defined thin app facade', () => {
  assert.match(app, /reducedMotion:\s*controlAccordionReducedMotion/);
  assert.match(app, /function\s+controlAccordionReducedMotion\s*\([^)]*\)\s*\{[^}]*requireControlAccordionController\(\)\.reducedMotion\(\)/s);
});

pass('control accordion controller exposes reduced-motion ownership through its public API', () => {
  const fakeMedia = query => ({ matches: query.includes('reduce') });
  const controller = Controller.create({ accordions: [], matchMedia: fakeMedia });
  assert.equal(typeof controller.reducedMotion, 'function');
  assert.equal(controller.reducedMotion(), true);
});

console.log(`${passed}/2 PASS v1.23.9 app boot reduced-motion regression`);
