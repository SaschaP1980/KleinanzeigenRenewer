'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const ci = fs.readFileSync(path.join(root, '.github/workflows/kar-ci.yml'), 'utf8');
const release = fs.readFileSync(path.join(root, '.github/workflows/kar-release.yml'), 'utf8');

const checks = [
  ['main push triggers validation', /\bon:\s*\n\s*push:\s*\n\s*branches:\s*\[main\]/.test(ci)],
  ['CI also supports manual reruns', /\n\s*workflow_dispatch:\s*\n/.test(ci)],
  ['CI token has read-only repository contents', /\npermissions:\s*\n\s*contents:\s*read\s*\n/.test(ci)],
  ['CI checkout does not preserve credentials', /persist-credentials:\s*false/.test(ci)],
  ['CI executes complete release coverage gate', /bash scripts\/coverage-gate\.sh/.test(ci)],
  ['CI builds the canonical Chrome package', /python3 scripts\/package\.py/.test(ci)],
  ['CI checks ZIP integrity', /unzip -t "\$ZIP"/.test(ci)],
  ['CI runs packaged browser E2E', /KR_E2E_EXTENSION_ROOT/.test(ci) && /python3 tests\/e2e\/run_browser_e2e\.py/.test(ci)],
  ['CI installs extension-capable Playwright Chromium', /playwright install --with-deps --no-shell chromium/.test(ci) && /KR_CHROME_BINARY/.test(ci) && /KR_E2E_BROWSER_CHANNEL=chromium/.test(ci)],
  ['Release uses identical Playwright Chromium E2E runtime', /playwright install --with-deps --no-shell chromium/.test(release) && /KR_CHROME_BINARY/.test(release) && /KR_E2E_BROWSER_CHANNEL=chromium/.test(release)],
  ['CI cannot perform GitHub Release publication', !/\bgh\s+release\s+(create|upload|edit|delete)\b|\bgh\s+api\s+(?:-X\s+)?(?:POST|PUT|PATCH|DELETE)\b|\bgit\s+push\b/.test(ci)],
  ['Release still requires manual dispatch', /\bon:\s*\n\s*workflow_dispatch:/.test(release) && !/\bon:\s*\n\s*push:/.test(release)],
  ['Release retains full coverage and packaged E2E before publication', release.indexOf('bash scripts/coverage-gate.sh') < release.indexOf('python3 tests/e2e/run_browser_e2e.py') && release.indexOf('python3 tests/e2e/run_browser_e2e.py') < release.indexOf('gh release create')]
];
for (const [label, valid] of checks) {
  assert.ok(valid, 'KAR CI contract: ' + label);
  console.log('PASS ' + label);
}
console.log(checks.length + '/' + checks.length + ' KAR CI separation checks passed');
