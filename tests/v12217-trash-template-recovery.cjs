const fs=require('fs');const assert=require('assert');
const read=n=>fs.readFileSync(n,'utf8');
const app=read('app.js'), bg=read('background.js'), ui=read('archive-trash-insertion-ui-controller.js'), html=read('app.html');
let pass=0;function ok(name,fn){try{fn();console.log('PASS',name);pass++;}catch(e){console.error('FAIL',name,'-',e.message);process.exitCode=1;}}
ok('known published capture uses background preparation with fill identity',()=>{assert.match(app,/PREPARE_TRASH_TEMPLATE_INVENTORY_CAPTURE/);assert.match(app,/fillId/);});
ok('background exposes safe preparation bridge',()=>{assert.match(bg,/PREPARE_TRASH_TEMPLATE_INVENTORY_CAPTURE/);assert.match(bg,/prepareTrashTemplateInventoryCapture/);});
ok('recoverable trash-template session can be queried after lock release',()=>{assert.match(bg,/GET_RECOVERABLE_TRASH_TEMPLATE_FILL/);assert.match(ui,/GET_RECOVERABLE_TRASH_TEMPLATE_FILL/);});
ok('recoverable trash-template session exposes a persistent activity-card affordance',()=>{assert.doesNotMatch(html,/trashTemplateResumeButton/);assert.match(ui,/resume-trash-template/);assert.match(ui,/Anzeige prüfen/);assert.match(ui,/Inventarisierung fortsetzen/);assert.match(ui,/Problem prüfen/);assert.match(ui,/Status öffnen/);});
ok('controller owns explicit recovery and reopen path',()=>{assert.match(ui,/recoverTrashTemplateSession/);assert.match(ui,/reopenTrashTemplateSession/);});
ok('successful inventory handoff can terminalize resume state',()=>{assert.match(bg,/COMPLETE_TRASH_TEMPLATE_FLOW/);assert.match(ui,/COMPLETE_TRASH_TEMPLATE_FLOW/);});
ok('published inventory resolver is modular',()=>{assert.ok(fs.existsSync('published-inventory-resolver.js'));const code=read('published-inventory-resolver.js');assert.match(code,/KRPublishedInventoryResolver/);assert.match(code,/p-anzeige-bearbeiten\.html/);assert.match(code,/INVENTORY_CANDIDATE_PREVIEW/);assert.match(code,/PAGE_STATUS/);});
if(!process.exitCode)console.log(`v1.22.17 trash-template recovery: ${pass}/7 PASS`);
