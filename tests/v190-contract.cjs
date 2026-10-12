const fs = require('fs');
const path = require('path');
const assert = require('assert');
let n = 0;
const pass = name => { n += 1; console.log(`PASS ${n}: ${name}`); };
const root = path.join(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const background = require('./v12221-legacy-background-surface.cjs');
const renewalStateRepository = require('../renewal-state-repository.js');
const app = require('./v12210-source-surface.cjs');

assert.ok(['1.9.0','1.10.0','1.10.1','1.10.2','1.10.3','1.10.4','1.11.0','1.11.1','1.11.2','1.11.3','1.11.4','1.11.5','1.12.0','1.12.1','1.13.0','1.13.1','1.13.2','1.13.3','1.13.4','1.13.5','1.13.6','1.13.7','1.13.8','1.14.0','1.14.1','1.14.2','1.14.3','1.14.4','1.14.5','1.15.0','1.15.1','1.15.2','1.15.3','1.15.4','1.15.5','1.15.6','1.15.7','1.16.0','1.16.1','1.16.2','1.16.3','1.16.4','1.16.5','1.16.6','1.16.7','1.16.8','1.16.9','1.17.0','1.17.1','1.17.2','1.17.3','1.17.4','1.17.5','1.17.6','1.17.7','1.17.8','1.17.9','1.17.10','1.18.0','1.18.1','1.18.2','1.18.3','1.18.4','1.19.0','1.19.1','1.19.2','1.19.3','1.19.4','1.19.5','1.19.6','1.19.7','1.19.8','1.20.0','1.20.1','1.20.2','1.20.3','1.20.4','1.20.5','1.20.7','1.20.8','1.20.9','1.20.10','1.20.11','1.20.12','1.20.13','1.20.14','1.20.15','1.20.16','1.20.17','1.20.18','1.20.19','1.20.20','1.20.21','1.20.22','1.21.0','1.21.1','1.21.2','1.21.3','1.21.4','1.21.5','1.21.6','1.21.7','1.21.8','1.21.9','1.21.10','1.21.11','1.21.12','1.21.13','1.21.14','1.21.15','1.22.0','1.22.1','1.22.2','1.22.3','1.22.4','1.22.5','1.22.6','1.22.7','1.22.8','1.22.9','1.22.10','1.22.11','1.22.12','1.22.13','1.22.14','1.22.15','1.22.16','1.22.17','1.22.18','1.22.19','1.22.20','1.22.21','1.22.22','1.22.23','1.22.24','1.22.25','1.22.26','1.22.27','1.22.28','1.22.29','1.22.30','1.23.0','1.23.1','1.23.2','1.23.3','1.23.4','1.23.5','1.23.6','1.23.7','1.23.8','1.23.9','1.23.10','1.23.11','1.23.12','1.23.13','1.23.14','1.23.15','1.23.16','1.23.17','1.23.18','1.23.19','1.23.20','1.23.22','1.23.23','1.23.24'].includes(manifest.version));
assert.ok(['1.9.0','1.10.0','1.10.1','1.10.2','1.10.3','1.10.4','1.11.0','1.11.1','1.11.2','1.11.3','1.11.4','1.11.5','1.12.0','1.12.1','1.13.0','1.13.1','1.13.2','1.13.3','1.13.4','1.13.5','1.13.6','1.13.7','1.13.8','1.14.0','1.14.1','1.14.2','1.14.3','1.14.4','1.14.5','1.15.0','1.15.1','1.15.2','1.15.3','1.15.4','1.15.5','1.15.6','1.15.7','1.16.0','1.16.1','1.16.2','1.16.3','1.16.4','1.16.5','1.16.6','1.16.7','1.16.8','1.16.9','1.17.0','1.17.1','1.17.2','1.17.3','1.17.4','1.17.5','1.17.6','1.17.7','1.17.8','1.17.9','1.17.10','1.18.0','1.18.1','1.18.2','1.18.3','1.18.4','1.19.0','1.19.1','1.19.2','1.19.3','1.19.4','1.19.5','1.19.6','1.19.7','1.19.8','1.20.0','1.20.1','1.20.2','1.20.3','1.20.4','1.20.5','1.20.7','1.20.8','1.20.9','1.20.10','1.20.11','1.20.12','1.20.13','1.20.14','1.20.15','1.20.16','1.20.17','1.20.18','1.20.19','1.20.20','1.20.21','1.20.22','1.21.0','1.21.1','1.21.2','1.21.3','1.21.4','1.21.5','1.21.6','1.21.7','1.21.8','1.21.9','1.21.10','1.21.11','1.21.12','1.21.13','1.21.14','1.21.15','1.22.0','1.22.1','1.22.2','1.22.3','1.22.4','1.22.5','1.22.6','1.22.7','1.22.8','1.22.9','1.22.10','1.22.11','1.22.12','1.22.13','1.22.14','1.22.15','1.22.16','1.22.17','1.22.18','1.22.19','1.22.20','1.22.21','1.22.22','1.22.23','1.22.24','1.22.25','1.22.26','1.22.27','1.22.28','1.22.29','1.22.30','1.23.0','1.23.1','1.23.2','1.23.3','1.23.4','1.23.5','1.23.6','1.23.7','1.23.8','1.23.9','1.23.10','1.23.11','1.23.12','1.23.13','1.23.14','1.23.15','1.23.16','1.23.17','1.23.18','1.23.19','1.23.20','1.23.22','1.23.23','1.23.24'].includes(pkg.version));
pass('v1.9.0 version aligned');

assert.match(background, /function renewalHoldsInsertionLock/);
assert.equal(renewalStateRepository.renewalHoldsInsertionLock({renewalId:'r',status:'verification-failed',stage:'verification-mismatch'}), true);
assert.equal(renewalStateRepository.renewalHoldsInsertionLock({renewalId:'r',status:'verification-failed',stage:'paid-insertion-required',paidInsertion:{phase:'pre-publish'}}), false);
assert.match(background, /function templateFillHoldsInsertionLock/);
assert.match(background, /\['waiting', 'running'\]\.includes/);
pass('global lock is derived from persistent active renewal and template-only sessions');

const lockState = background.match(/async function getInsertionLockState\(\) \{[\s\S]*?\n\}/)?.[0] || '';
assert.match(lockState, /readRenewalSessions/);
assert.match(lockState, /readFillSessions/);
assert.match(lockState, /kind: 'renewal'/);
assert.match(lockState, /kind: 'trash-template'/);
pass('lock state survives worker restart because it reconstructs from storage-backed sessions');

assert.match(background, /async function withInsertionStartGate/);
assert.match(background, /insertionStartGate/);
assert.match(background, /assertInsertionStartAvailable/);
pass('start requests are serialized before the persistent lock check');

const startRenewal = background.match(/async function startTemplateFill\(inventoryId, options = \{\}\) \{[\s\S]*?\n\}/)?.[0] || '';
assert.match(startRenewal, /withInsertionStartGate/);
assert.match(startRenewal, /assertInsertionStartAvailable\(\{ kind: 'renewal'/);
assert.match(startRenewal, /startTemplateFillUnlocked/);
pass('normal Neu inserieren is service-worker gated by the global lock');

const startTrash = background.match(/async function startTrashTemplateFill\(inventoryId\) \{[\s\S]*?\n\}/)?.[0] || '';
assert.match(startTrash, /withInsertionStartGate/);
assert.match(startTrash, /assertInsertionStartAvailable\(\{ kind: 'trash-template'/);
assert.match(startTrash, /startTrashTemplateFillUnlocked/);
pass('trash template fill shares the same exclusive lock');

assert.match(background, /INSERTION_START_BLOCKED_BY_GLOBAL_LOCK/);
assert.match(background, /Ein anderer Inserierungs-\/Austauschvorgang läuft bereits/);
assert.match(background, /GET_INSERTION_LOCK_STATE/);
pass('blocked technical starts are diagnosed and lock state is exposed to the app');

assert.match(app, /let currentInsertionLock = \{ locked: false \}/);
assert.match(app, /function insertionLockActive/);
assert.match(app, /function insertionLockUiText/);
assert.match(app, /GET_INSERTION_LOCK_STATE/);
pass('app consumes the authoritative background lock state');

const normalButton = app.match(/const createButton = document\.createElement\('button'\);[\s\S]*?createButton\.addEventListener\('click'/)?.[0] || '';
assert.match(normalButton, /insertionBlocked = insertionLockActive\(\)/);
assert.match(normalButton, /createButton\.disabled = (?:onlineStatusPending \|\| )?!ready \|\| insertionBlocked/);
assert.match(normalButton, /insertionLockUiText\(\)/);
pass('all ordinary Neu inserieren buttons are disabled while any lock is held');

const trashButton = app.match(/templateButton\.textContent = 'Als Vorlage neu inserieren';[\s\S]*?templateButton\.addEventListener\('click'/)?.[0] || '';
assert.match(trashButton, /insertionBlocked = insertionLockActive\(\)/);
assert.match(trashButton, /templateButton\.disabled = !ready \|\| insertionBlocked/);
assert.match(trashButton, /insertionLockUiText\(\)/);
pass('paper-bin template runs are also disabled while any lock is held');

assert.match(background, /writeRenewalSessions\(renewals\);[\s\S]{0,300}broadcastInventoryChanged\('insertion-lock-acquired'/);
assert.match(background, /writeFillSessions\(sessions\);[\s\S]{0,300}broadcastInventoryChanged\('insertion-lock-acquired'/);
assert.match(background, /broadcastInventoryChanged\('insertion-lock-released'/);
pass('other app windows receive live refresh triggers for template lock acquire/release');

assert.match(background, /status: String\(session\.status \|\| ''\)/);
assert.match(background, /stage: String\(session\.stage \|\| ''\)/);
assert.equal(renewalStateRepository.renewalHoldsInsertionLock({renewalId:'r',status:'verification-failed',stage:'verification-mismatch'}), true);
assert.equal(renewalStateRepository.renewalHoldsInsertionLock({renewalId:'r',status:'waiting-for-online',stage:'waiting-for-online'}), true);
assert.match(background, /!\['cancelled', 'replaced'\]\.includes\(String\(item\?\.status \|\| ''\)\)/);
pass('waiting-for-online and verification-failed are intentionally not terminal lock states');


const trashUnlocked = background.match(/async function startTrashTemplateFillUnlocked\(inventoryId\) \{[\s\S]*?\n\}/)?.[0] || '';
assert.match(trashUnlocked, /stage = 'target-tab-failed'/);
assert.match(trashUnlocked, /broadcastInventoryChanged\('insertion-lock-released'/);
pass('trash-template target-tab failure cannot leave an invisible permanent global lock');

console.log(`${n} v1.9.0 contract groups passed`);
