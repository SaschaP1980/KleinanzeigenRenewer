const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = name => fs.existsSync(path.join(root, name)) ? fs.readFileSync(path.join(root, name), 'utf8') : '';
const background = require('./v12215-source-surface.cjs');
const content = read('content.js');
const app = read('app.js');
const manifest = read('manifest.json');
const hardening = read('platform-hardening.js');
let pass = 0, fail = 0;
function check(name, condition) {
  if (condition) { pass++; console.log('PASS ' + name); }
  else { fail++; console.error('FAIL ' + name); }
}

check('H1 has a shared exact platform restriction detector', /detectAccessRestriction/.test(hardening) && /IP-Bereich vorübergehend gesperrt/i.test(hardening));
check('H1 shared detector is loaded in background and content scripts', /platform-hardening\.js/.test(background) && /platform-hardening\.js/.test(manifest));
check('H1 content proactively reports a detected platform restriction', /PLATFORM_ACCESS_RESTRICTED/.test(content) && /reportPlatformAccessRestriction/.test(content));
check('H1 content readiness/status exposes restriction evidence', /platformAccessRestriction/.test(content));
check('H2 background persists a global platform restriction latch', /PLATFORM_ACCESS_RESTRICTION_KEY/.test(background) && /platformAccessRestrictionV1/.test(background));
check('H2 background terminalizes active bulk, renewal, archive, fill and mass workflows', /applyPlatformSafetyStop/.test(background) && /platform-access-restricted/.test(background) && /readRenewalSessions/.test(background) && /readArchiveInsertionSessions/.test(background) && /readFillSessions/.test(background) && /readMassRenewalBatch/.test(background));
check('H2 remote action requests are gated while local-only requests remain available', /assertPlatformAccessAllowedForRequest/.test(background) && /PLATFORM_REMOTE_ACTION_TYPES/.test(background));
check('H2 app exposes a deliberate user retry action instead of automatic resume', /retry-platform-access/.test(app) && /CLEAR_PLATFORM_ACCESS_RESTRICTION/.test(app));

console.log(`${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
