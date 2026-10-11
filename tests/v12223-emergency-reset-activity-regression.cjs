const assert = require('assert');
const fs = require('fs');

const app = fs.readFileSync('app.js', 'utf8');
const diagnosticsSource = fs.readFileSync('diagnostics-controls-controller.js', 'utf8');
const controllerSource = fs.readFileSync('archive-trash-insertion-ui-controller.js', 'utf8');
const Controller = require('../archive-trash-insertion-ui-controller.js');

let cleared = 0;
const controller = Controller.create({
  document: { createTextNode() {}, createElement() { return {}; } },
  publishTrashTemplateRecoveryActivity() {},
  clearTrashTemplateRecoveryActivity() { cleared += 1; }
});

assert.strictEqual(typeof controller.handleEmergencyWorkflowReset, 'function', 'controller must own emergency-reset recovery UI cleanup');
controller.handleEmergencyWorkflowReset();
assert.strictEqual(cleared, 1, 'emergency reset must clear persisted trash-template recovery activity');
assert.match(controllerSource, /function handleEmergencyWorkflowReset\s*\(/, 'controller must expose explicit emergency reset lifecycle handler');
assert.match(diagnosticsSource, /RESET_ACTIVE_WORKFLOWS[\s\S]{0,700}onEmergencyReset\s*\(/, 'successful manual emergency reset must invoke the app recovery cleanup callback');
assert.match(app, /async onEmergencyReset\(\)[\s\S]{0,500}handleEmergencyWorkflowReset\s*\(/, 'app recovery callback must clear recovery UI immediately');
assert.match(app, /message\.reason === ['"]workflow-emergency-reset['"][\s\S]{0,700}handleEmergencyWorkflowReset\s*\(/, 'workflow-emergency-reset broadcast must defensively clear recovery UI');

console.log('v1.22.23 emergency reset activity regression: 5/5 PASS');
