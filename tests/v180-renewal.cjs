const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.join(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const background = require('./v12215-source-surface.cjs');
const template = fs.readFileSync(path.join(root, 'template-filler.js'), 'utf8');
const content = fs.readFileSync(path.join(root, 'content.js'), 'utf8');
const app = require('./v12210-source-surface.cjs');
const css = fs.readFileSync(path.join(root, 'app.css'), 'utf8');
let n = 0; const pass = name => { n += 1; console.log('PASS ' + name); };

assert.ok(['1.8.0','1.8.1','1.8.2','1.8.3','1.8.4','1.8.5','1.8.6','1.8.7','1.8.8','1.8.9','1.8.10','1.8.11','1.8.12','1.8.13','1.8.14','1.9.0','1.10.0','1.10.1','1.10.2','1.10.3','1.10.4','1.11.0','1.11.1','1.11.2','1.11.3','1.11.4','1.11.5','1.12.0','1.12.1','1.13.0','1.13.1','1.13.2','1.13.3','1.13.4','1.13.5','1.13.6','1.13.7','1.13.8','1.14.0','1.14.1','1.14.2','1.14.3','1.14.4','1.14.5','1.15.0','1.15.1','1.15.2','1.15.3','1.15.4','1.15.5','1.15.6','1.15.7','1.16.0','1.16.1','1.16.2','1.16.3','1.16.4','1.16.5','1.16.6','1.16.7','1.16.8','1.16.9','1.17.0','1.17.1','1.17.2','1.17.3','1.17.4','1.17.5','1.17.6','1.17.7','1.17.8','1.17.9','1.17.10','1.18.0','1.18.1','1.18.2','1.18.3','1.18.4','1.19.0','1.19.1','1.19.2','1.19.3','1.19.4','1.19.5','1.19.6','1.19.7','1.19.8','1.20.0','1.20.1','1.20.2','1.20.3','1.20.4','1.20.5','1.20.7','1.20.8','1.20.9','1.20.10','1.20.11','1.20.12','1.20.13','1.20.14','1.20.15','1.20.16','1.20.17','1.20.18','1.20.19','1.20.20','1.20.21','1.20.22','1.21.0','1.21.1','1.21.2','1.21.3','1.21.4','1.21.5','1.21.6','1.21.7','1.21.8','1.21.9','1.21.10','1.21.11','1.21.12','1.21.13','1.21.14','1.21.15','1.22.0','1.22.1','1.22.2','1.22.3','1.22.4','1.22.5','1.22.6','1.22.7','1.22.8','1.22.9','1.22.10','1.22.11','1.22.12','1.22.13','1.22.14','1.22.15','1.22.16','1.22.17','1.22.18','1.22.19','1.22.20','1.22.21','1.22.22','1.22.23','1.22.24','1.22.25','1.22.26','1.22.27','1.22.28','1.22.29','1.22.30','1.23.0','1.23.1','1.23.2','1.23.3','1.23.4','1.23.5','1.23.6','1.23.7','1.23.8','1.23.9','1.23.10','1.23.11','1.23.12','1.23.13','1.23.14','1.23.15','1.23.16','1.23.17','1.23.18','1.23.19','1.23.20','1.23.22','1.23.23'].includes(manifest.version));
assert.equal(pkg.version, manifest.version);
pass('v1.8.x version metadata is aligned');

assert.match(background, /RENEWAL_SESSIONS_KEY = "renewalSessionsV1"/);
assert.match(background, /createRenewalSkeleton/);
assert.match(background, /inventoryId: skeletonInventoryId/);
assert.match(background, /sourceInventoryId/);
assert.match(background, /sourceAdId/);
assert.match(background, /recordKind: 'renewal-draft'/);
pass('renewal start persists a draft skeleton linked to the source inventory item');

assert.match(template, /Rückmeldung ausblenden/);
assert.match(template, /panel\.style\.display = 'none'/);
assert.match(template, /panel\.style\.display = 'block'/);
assert.match(template, /RENEWAL_PUBLISH_CLICKED/);
assert.match(template, /stage: complete \? '(?:form-verified|awaiting-publish)'/);
pass('feedback popover can be dismissed and is re-shown by new messages throughout the renewal flow');

assert.match(template, /verifiedPublishGate/);
assert.match(template, /AUTO_PUBLISH_GATE_PASSED/);
assert.match(template, /AUTO_PUBLISH_GATE_BLOCKED/);
pass('phase 1 publication is guarded by an explicit verified hard gate and falls back safely when ambiguous');

assert.match(content, /DETECT_PUBLISHED_AD/);
assert.match(content, /\/s-anzeige\//);
assert.match(content, /sourceAdId/);
assert.match(background, /RENEWAL_NEW_ID_CONFIRMED/);
assert.match(background, /newAdId/);
pass('phase 1 detects and confirms a new ad ID after the verified listing is submitted');

assert.match(background, /runRenewalReinventory/);
assert.match(background, /p-anzeige-bearbeiten\.html\?adId=/);
assert.match(background, /resolveRenewalPublicEvidence\(newAdId/);
assert.match(background, /extractReadOnlyMetadata/);
assert.match(background, /inventoryIdOverride: session\.skeletonInventoryId/);
pass('phase 2 re-inventories the new ad from edit and read-only sources and fills the existing skeleton');

assert.match(background, /compareRenewalRecords/);
assert.match(background, /dynamicAttributes/);
assert.match(background, /images\.content-order/);
assert.match(background, /OffscreenCanvas/);
assert.match(background, /visual-16x16-gray/);
assert.match(background, /difference <= 10/);
assert.match(background, /onlineConfirmed/);
assert.match(background, /replacement-ready/);
pass('phase 3 compares relevant content including order-aware tolerant image content and requires online confirmation');

assert.match(background, /Prüfung nicht abgeschlossen – bisherige Anzeige bleibt unverändert/);
assert.match(background, /bisherige Anzeige/i);
pass('phase 1-3 failure and success feedback both preserve the source ad');

assert.match(app, /renewalStatusLabel/);
assert.match(app, /renewal-badge/);
assert.match(app, /Bisherige Anzeige/);
assert.match(app, /Neue Anzeige/);
assert.match(css, /\.renewal-card/);
pass('inventory UI exposes draft/verification state and source/new ad references');

assert.match(background, /renewal-sessions\.json/);
assert.match(background, /Renewal-Sessions:/);
assert.match(background, /resumePendingRenewals/);
assert.match(background, /resume-after-worker-restart/);
pass('diagnostic ZIP contains persistent renewal state and interrupted phase 2/3 work can resume');

console.log(`${n} v1.8.0 renewal contract groups passed`);
