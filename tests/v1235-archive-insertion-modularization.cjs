const fs=require('fs'),assert=require('assert');
assert.ok(fs.existsSync('archive-insertion-controller.js'),'archive-insertion-controller.js must exist');
const bg=fs.readFileSync('background.js','utf8');
const ctl=fs.readFileSync('archive-insertion-controller.js','utf8');
assert.match(ctl,/KRDeps\.register\('KRArchiveInsertionController'/);
assert.match(bg,/archive-insertion-controller\.js/);
assert.match(bg,/KRDeps\.require\('KRArchiveInsertionController'\)/);
for(const name of ['compareArchiveInsertionRecords','completeRecoveredArchiveInsertionIfAlreadyInventoried','resumePendingArchiveInsertions','assertArchiveStagingReady','resolveArchiveTargetProfile','promoteArchiveTemplateToInventory','findArchivePublishedAd','verifyAndSaveArchiveInsertion','runArchiveInsertionPostPublish','confirmPublishedArchiveInsertion','startArchiveInsertion']) {
  assert.ok(ctl.includes(`function ${name}(`)||ctl.includes(`async function ${name}(`),name+' must live in archive insertion controller');
}
assert.ok(!/async function startArchiveInsertion\([^]*?withInsertionStartGate/.test(bg),'background must not own archive workflow body');
console.log('PASS v1.23.5 archive insertion modularization ownership');
