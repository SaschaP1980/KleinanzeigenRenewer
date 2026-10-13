const { includesActivePatch } = require('./current-patch-policy.cjs');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.join(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const appHtml = fs.readFileSync(path.join(root, 'app.html'), 'utf8');
const appJs = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const appCss = fs.readFileSync(path.join(root, 'app.css'), 'utf8');
const template = fs.readFileSync(path.join(root, 'template-filler.js'), 'utf8');
const background = fs.readFileSync(path.join(root, 'background.js'), 'utf8') + '\n' + fs.readFileSync(path.join(root, 'diagnostic-export-service.js'), 'utf8');
let n = 0; const pass = name => { n += 1; console.log('PASS ' + name); };

assert.ok(includesActivePatch(['1.8.1','1.8.2','1.8.3','1.8.4','1.8.5','1.8.6','1.8.7','1.8.8','1.8.9','1.8.10','1.8.11','1.8.12','1.8.13','1.8.14','1.9.0','1.10.0','1.10.1','1.10.2','1.10.3','1.10.4','1.11.0','1.11.1','1.11.2','1.11.3','1.11.4','1.11.5','1.12.0','1.12.1','1.13.0','1.13.1','1.13.2','1.13.3','1.13.4','1.13.5','1.13.6','1.13.7','1.13.8','1.14.0','1.14.1','1.14.2','1.14.3','1.14.4','1.14.5','1.15.0','1.15.1','1.15.2','1.15.3','1.15.4','1.15.5','1.15.6','1.15.7','1.16.0','1.16.1','1.16.2','1.16.3','1.16.4','1.16.5','1.16.6','1.16.7','1.16.8','1.16.9','1.17.0','1.17.1','1.17.2','1.17.3','1.17.4','1.17.5','1.17.6','1.17.7','1.17.8','1.17.9','1.17.10','1.18.0','1.18.1','1.18.2','1.18.3','1.18.4','1.19.0','1.19.1','1.19.2','1.19.3','1.19.4','1.19.5','1.19.6','1.19.7','1.19.8','1.20.0','1.20.1','1.20.2','1.20.3','1.20.4','1.20.5','1.20.7','1.20.8','1.20.9','1.20.10','1.20.11','1.20.12','1.20.13','1.20.14','1.20.15','1.20.16','1.20.17','1.20.18','1.20.19','1.20.20','1.20.21','1.20.22','1.21.0','1.21.1','1.21.2','1.21.3','1.21.4','1.21.5','1.21.6','1.21.7','1.21.8','1.21.9','1.21.10','1.21.11','1.21.12','1.21.13','1.21.14','1.21.15','1.22.0','1.22.1','1.22.2','1.22.3','1.22.4','1.22.5','1.22.6','1.22.7','1.22.8','1.22.9','1.22.10','1.22.11','1.22.12','1.22.13','1.22.14','1.22.15','1.22.16','1.22.17','1.22.18','1.22.19','1.22.20','1.22.21','1.22.22','1.22.23','1.22.24','1.22.25','1.22.26','1.22.27','1.22.28','1.22.29','1.22.30','1.23.0','1.23.1','1.23.2','1.23.3','1.23.4','1.23.5','1.23.6','1.23.7','1.23.8','1.23.9','1.23.10','1.23.11','1.23.12','1.23.13','1.23.14','1.23.15','1.23.16','1.23.17','1.23.18','1.23.19','1.23.20','1.23.22','1.23.23','1.23.24'], manifest.version));
assert.equal(pkg.version, manifest.version);
assert.deepEqual([...manifest.permissions].sort(), require('./current-patch-policy.cjs').expectedManifestPermissions(manifest.version).sort());
pass('v1.8.1+ version and established permissions are aligned');

assert.match(appHtml, /id="appVersion"[^>]*class="app-version"/);
assert.match(appJs, /chrome\.runtime\.getManifest\(\)\.version/);
assert.match(appJs, /appVersion\.textContent = `v\$\{manifest\.version_name \|\| manifest\.version\}`/);
assert.match(appCss, /\.app-version\s*\{/);
pass('installed extension version is shown dynamically in the app header');

assert.match(template, /findPostFillContinueButtons/);
assert.match(template, /return \/\^weiter\$\/i\.test\(text\)/);
assert.match(template, /stage: complete \? 'form-verified' : 'verified'/);
assert.match(template, /stage: 'post-fill-continuing'/);
assert.match(template, /POST_FILL_CONTINUE_CLICK_STARTED/);
assert.match(template, /button\.click\(\)/);
assert.match(template, /POST_FILL_CONTINUE_NAVIGATION_DETECTED/);
assert.match(template, /stage: 'awaiting-manual-continue'/);
pass('verified template fill automatically advances through exactly one visible Weiter control with a safe manual fallback');

assert.match(template, /return 'post-fill'/);
assert.match(template, /runPostFillSession/);
assert.match(template, /autoPublishVerifiedRenewal/);
assert.match(template, /AUTO_PUBLISH_GATE_PASSED/);
pass('post-fill page resumes the verified publish gate; v1.8.2 may auto-publish only after a complete issue-free renewal fill');

assert.match(background, /const hasManualBoundary = Boolean\(diagnosticBoundaryId && Number\.isFinite\(diagnosticBoundaryStartMs\)\)/);
assert.match(background, /sanitizedRetentionEvents\.filter\(event => String\(event\?\.sessionId \|\| ''\) === currentDiagnosticSessionId\(\)\)/);
assert.match(background, /diagnostics\.jsonl', text: sessionEvents\.map/);
assert.match(background, /errors = sessionEvents\.filter/);
assert.match(background, /exportScope: hasManualBoundary \? 'manual-reset-session' : 'current-service-worker-session'/);
assert.match(background, /Standardexport enthält nur Daten innerhalb der aktuellen Diagnose-Messgrenze/);
pass('standard diagnostic ZIP respects the current manual diagnostic boundary or service-worker session');

assert.match(background, /fillSessionsRaw = rawFillSessions\.filter/);
assert.match(background, /relevantRenewalSessions = rawRenewalSessions\.filter/);
assert.match(background, /inventorySummary = inventories\s*\.filter/);
assert.match(background, /if \(relevantRun\) files\.splice\(3, 0, \{ name: 'bulk-run\.json'/);
pass('diagnostic session export scopes fill, renewal, inventory and bulk snapshots to current-session relevance');

console.log(`${n} v1.8.1 contract groups passed`);
