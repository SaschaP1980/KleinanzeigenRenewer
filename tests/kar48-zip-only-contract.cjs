'use strict';
// KAR-48 Work/PR proof: the exact archive under release/ is the browser subject.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const work = fs.readFileSync(path.join(root,'.github/workflows/kar-work-pr.yml'),'utf8');
const main = fs.readFileSync(path.join(root,'.github/workflows/kar-ci.yml'),'utf8');
const validator = path.join(root, 'scripts/verify_committed_chrome_zip.py');
assert.ok(fs.existsSync(validator), 'Independent archive parity and negative verifier missing');
assert.match(work, /python3 scripts\/verify_committed_chrome_zip\.py --base-sha "\$EXPECTED_BASE_SHA" --report/);
assert.match(work, /E2E_CHROME_ZIP="\$PWD\/release\/kleinanzeigen-renewal-chrome-v\$VERSION.zip"/);
assert.match(work, /unzip -q "\$E2E_CHROME_ZIP"/);
assert.match(work, /needs: validation/);
assert.match(work, /python3 tests\/e2e\/run_browser_e2e_supervisor\.py --report/);
assert.match(work, /python3 tests\/e2e\/verify_pr_e2e_report\.py/);
assert.match(main, /python3 scripts\/verify_committed_chrome_zip\.py --report/);
assert.match(main, /ZIP="\$PWD\/release\/kleinanzeigen-renewal-chrome-v\$VERSION.zip"/);
assert.match(main, /unzip -q "\$ZIP"/);
assert.match(main, /bash scripts\/coverage-gate\.sh/);
for (const workflow of [work, main]) {
  assert.doesNotMatch(workflow, /\bgh release (?:create|upload)|\bgit push\b/);
}
const selfTest = execFileSync('python3', [validator, '--self-test'],
  {cwd:root,encoding:'utf8',timeout:30000});
assert.match(selfTest, /PASS KAR-48 ZIP verifier self-test: authentic archive \+ 10 fail-closed mutations/);
console.log('PASS KAR-48 real committed ZIP is the exact subject of Work/main browser E2E');
