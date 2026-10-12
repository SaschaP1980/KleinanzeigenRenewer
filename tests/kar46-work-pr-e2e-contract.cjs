'use strict';
// KAR-46 test-first Work PR real-browser proof contract; no live account.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const work = fs.readFileSync(path.join(root, '.github/workflows/kar-work-pr.yml'), 'utf8');
const main = fs.readFileSync(path.join(root, '.github/workflows/kar-ci.yml'), 'utf8');

assert.match(work, /^  browser_e2e:\s*$/m, 'Independent packaged Chromium E2E Work-PR job required');
const validation = work.split('\n  validation:\n')[1]?.split('\n  browser_e2e:\n')[0];
const browser = work.split('\n  browser_e2e:\n')[1];
assert.ok(validation && browser, 'Must preserve validated contract -> runtime -> browser gating');
assert.match(validation, /python3 tests\/kar46-unfixed-next-patch-red\.py/);
assert.ok(fs.existsSync(path.join(root, 'tests/kar46-unfixed-next-patch-red.py')),
  'Pinned unfixed-basis RED proof must remain executable in Work PR');
assert.match(browser, /^    needs: validation$/m);
assert.match(browser, /^    timeout-minutes: 30$/m);
assert.match(validation, /ref: \$\{\{ github\.event\.pull_request\.head\.sha \}\}/);
assert.match(browser, /ref: \$\{\{ github\.event\.pull_request\.head\.sha \}\}/);
assert.match(browser, /test "\$\(git rev-parse HEAD\)" = "\$EXPECTED_WORK_HEAD"/);
assert.match(browser, /python3 scripts\/verify_committed_chrome_zip\.py --base-sha/);
assert.match(browser, /E2E_CHROME_ZIP="\$PWD\/release\/kleinanzeigen-renewal-chrome-v\$VERSION.zip"/);
assert.match(browser, /unzip -t "\$ZIP"/);
assert.match(browser, /unzip -q "\$E2E_CHROME_ZIP"/);
assert.match(browser, /python3 -m playwright install --with-deps --no-shell chromium/);
assert.match(browser, /KR_E2E_BROWSER_CHANNEL=chromium/);
assert.match(browser, /KR_CHROME_BINARY/);
assert.match(browser, /KR_E2E_EXTENSION_ROOT/);
assert.match(browser, /python3 tests\/e2e\/run_browser_e2e_supervisor\.py --report/);
assert.match(browser, /python3 tests\/e2e\/verify_pr_e2e_report\.py --report/);
assert.match(browser, /actions\/upload-artifact@v4/);
assert.match(browser, /if: always\(\)/);
assert.match(browser, /if-no-files-found: warn/);
assert.doesNotMatch(work, /gh release (create|upload)|git push|workflow_dispatch:/,
  'Work PR proof must not mutate or release main');
for (const token of ['python3 -m playwright install --with-deps --no-shell chromium',
  'KR_E2E_BROWSER_CHANNEL=chromium', 'KR_E2E_EXTENSION_ROOT']) {
  assert.ok(main.includes(token), 'E2E runtime must reuse proven KAR CI configuration: ' + token);
}
const verifier = path.join(root, 'tests/e2e/verify_pr_e2e_report.py');
assert.ok(fs.existsSync(verifier), 'Fail-closed nine-scenario report verifier required');
const check = execFileSync('python3', [verifier, '--self-test'], {
  cwd: root, encoding: 'utf8', timeout: 15000,
});
assert.match(check, /PASS KAR-46 browser evidence verifier: valid report and 14 negative cases/);
console.log('PASS KAR-46 exact-head Work-PR packaged Chromium E2E, artifact and 14 negative report cases');
