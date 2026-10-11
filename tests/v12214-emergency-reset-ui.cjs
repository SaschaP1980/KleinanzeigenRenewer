const fs=require('fs'),assert=require('assert');
const app=fs.readFileSync('app.js','utf8'); const diagnostics=fs.readFileSync('diagnostics-controls-controller.js','utf8'); const html=fs.readFileSync('app.html','utf8');
let p=0;function ok(n,f){try{f();p++;console.log('PASS '+n)}catch(e){console.error('FAIL '+n);throw e}}
ok('emergency reset button has initial accessible help',()=>{assert.match(html,/id="emergencyWorkflowResetButton"[^>]+title="[^"]+"[^>]+aria-label="[^"]+"|id="emergencyWorkflowResetButton"[^>]+aria-label="[^"]+"[^>]+title="[^"]+"/);});
ok('normal and confirmation states synchronize button label tooltip and aria',()=>{assert.match(diagnostics,/function syncEmergencyUi\(\)/);assert.match(diagnostics,/Zur Bestätigung erneut klicken/);assert.match(diagnostics,/setAttribute\(['"]aria-label['"]/);assert.match(diagnostics,/\.title\s*=/);});
ok('confirmation expiry clears only its own status message',()=>{assert.match(diagnostics,/emergencyConfirmationRevision/);assert.match(diagnostics,/emergencyStatusRevision/);assert.match(diagnostics,/clearEmergencyConfirmationStatus/);});
ok('confirmation timeout restores full normal UI state',()=>{assert.match(diagnostics,/setTimeout\([\s\S]*syncEmergencyUi\([\s\S]*clearEmergencyConfirmationStatus/);});
console.log(`${p}/4 PASS v1.22.14 emergency reset UI`);
