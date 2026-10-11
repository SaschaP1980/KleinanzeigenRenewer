const fs = require('fs');
const assert = require('assert');
const bg = fs.readFileSync('background.js','utf8') + '\n' + fs.readFileSync('background-message-router.js','utf8') + '\n' + fs.readFileSync('diagnostic-export-service.js','utf8');
const diagnostics = fs.readFileSync('diagnostics-service.js','utf8');
const app = fs.readFileSync('app.js','utf8') + '\n' + fs.readFileSync('diagnostics-controls-controller.js','utf8');
const html = fs.readFileSync('app.html','utf8');
let pass = 0;
function ok(name, fn){ fn(); pass++; console.log(`PASS ${name}`); }
ok('diagnostics UI exposes a dedicated reset button', () => {
  assert.match(html, /id="diagnosticResetButton"[^>]*>\s*Diagnose zurücksetzen\s*</);
});
ok('reset has a dedicated runtime message and background handler', () => {
  assert.match(app, /runtimeMessage\(\{\s*type:\s*['"]RESET_DIAGNOSTICS['"]\s*\}\)/);
  assert.match(bg, /(?:message\?\.type\s*===\s*["']RESET_DIAGNOSTICS["']|["']RESET_DIAGNOSTICS["']\s*:\s*Object\.freeze)/);
  assert.match(bg, /RESET_DIAGNOSTICS[\s\S]*resetDiagnostics/);
});
ok('reset flushes pending diagnostics before establishing a new boundary', () => {
  assert.match(bg, /function resetDiagnostics\(\)\s*\{\s*return requireDiagnosticsService\(\)\.reset\(\)/);
  assert.match(diagnostics, /async function reset\(\)[\s\S]*await flush\(\)/);
});
ok('manual diagnostic boundary is persisted and used by export', () => {
  assert.match(bg, /DIAGNOSTIC_BOUNDARY_KEY/);
  assert.match(bg, /diagnosticBoundaryId/);
  assert.match(bg, /diagnosticBoundaryStartedAt/);
  assert.match(bg, /buildDiagnosticExport[\s\S]*DIAGNOSTIC_BOUNDARY_KEY/);
});
ok('reset clears prior retained diagnostic and gallery payloads', () => {
  assert.match(diagnostics, /storageLocal\.set\(\{[\s\S]*\[config\.diagnosticsKey\]: \[\][\s\S]*\[config\.galleryKey\]: \[\][\s\S]*\[config\.boundaryKey\]/);
});
ok('new boundary starts with a reset diagnostic event', () => {
  assert.match(diagnostics, /DIAGNOSTIC_SESSION_RESET/);
});
ok('UI blocks reset while a workflow is active', () => {
  assert.match(app, /function syncDiagnosticResetUi/);
  assert.match(app, /(?:diagnosticResetButton|elements\.resetButton)\.disabled\s*=\s*busy/);
  assert.match(app, /workflowActivityModel/);
});
ok('reset is immediate and does not use a confirmation dialog', () => {
  const idx = app.indexOf("type: 'RESET_DIAGNOSTICS'");
  assert.ok(idx >= 0);
  const block = app.slice(Math.max(0, idx - 1200), idx + 1500);
  assert.doesNotMatch(block, /confirm\s*\(/);
});
console.log(`${pass}/8 PASS`);
