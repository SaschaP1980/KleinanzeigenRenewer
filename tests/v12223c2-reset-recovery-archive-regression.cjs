const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');

const source = fs.readFileSync('src/app/trash-template-ui-controller.js', 'utf8');
let API = null;
const sandbox = {
  console, Promise, Object, String, Number, Array, Date,
  KRDeps: { register(name, value) { if (name === 'KRTrashTemplateUiController') API = value; } }
};
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(source, sandbox);
assert.ok(API?.create, 'trash-template UI controller must register via KRDeps');

let archived = 0;
let cleared = 0;
const controller = API.create({
  document: {},
  elements: {},
  archiveTrashTemplateRecoveryActivity() { archived += 1; },
  clearTrashTemplateRecoveryActivity() { cleared += 1; }
});

assert.equal(typeof controller.handleEmergencyWorkflowReset, 'function');
controller.handleEmergencyWorkflowReset();
assert.equal(archived, 1, 'emergency reset must archive the visible trash-template recovery activity before clearing it');
assert.equal(cleared, 1, 'emergency reset must still clear the active recovery slot');
assert.match(source, /archiveTrashTemplateRecoveryActivity\(\);[\s\S]{0,160}syncTrashTemplateRecoveryActivity\(null\)/,
  'archive must happen before clearing the recovery activity');

console.log('PASS v1.22.23_c2 emergency-reset recovery archive regression');
