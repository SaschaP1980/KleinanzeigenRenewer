// KAR-199: persisted Phase-4 unknowns must NOT render as an active spinner
// or enable the normal replacement-ready action.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Formatting = require('../src/app/inventory-formatting.js');
const fmt = Formatting.create({sharedUiHelpers:{}});
const dialogCode = fs.readFileSync(path.join(__dirname,'../src/app/renewal-dialog-controller.js'),'utf8');

for(const stage of ['source-delete-status-unverified','source-delete-outcome-unverified']) {
  test('KAR-199 '+stage+' is blocked in compact and full inventory views', () => {
    const record = {adId:'200',recordKind:'renewal-candidate',renewal:{
      renewalId:'r199',newAdId:'200',status:'verified',stage,autoReplacementAllowed:true
    }};
    assert.equal(fmt.renewalIsReplacementReady(record),false);
    assert.equal(fmt.renewalAutoCompletionPending(record),false);
    assert.equal(fmt.renewalStatusLabel(record),'AUSTAUSCH UNGEKLÄRT');
    assert.equal(fmt.renewalStatusText(record),'Austausch ungeklärt · prüfen');
  });
}
test('KAR-199 progress dialog prioritizes unknown outcome over running stage', () => {
  const start = dialogCode.indexOf("if (stage === 'source-delete-status-unverified'");
  const running = dialogCode.indexOf("if (stage.startsWith('source-delete'))");
  assert.ok(start > 0 && running > start, 'blocked state must be evaluated before generic active stage');
  assert.match(dialogCode,/Neue Anzeige bestätigt; alte Anzeige noch nicht nachweislich gelöscht/);
  assert.match(dialogCode,/states\[4\] = 'error'/);
});
test('KAR-199 normal verified handoff remains unchanged', () => {
  const record={adId:'200',renewal:{renewalId:'r199',status:'verified',
    stage:'source-delete-started',newAdId:'200',autoReplacementAllowed:true}};
  assert.equal(fmt.renewalAutoCompletionPending(record),true);
  assert.equal(fmt.renewalStatusLabel(record),'AUSTAUSCH LÄUFT');
});
