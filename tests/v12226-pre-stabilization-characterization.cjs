const fs=require('fs'),assert=require('assert');
const app=fs.readFileSync('app.js','utf8'),bg=fs.readFileSync('background.js','utf8'),reg=fs.readFileSync('message-contract-registry.js','utf8'),remote=fs.readFileSync('remote-delete-replacement-service.js','utf8');
let n=0; const pass=s=>{n++;console.log('PASS',s)};
assert.equal((app+'\n'+bg).match(/\.requestSubmit\s*\(/g)?.length||0,0); assert.equal((app+'\n'+bg).match(/\.submit\s*\(/g)?.length||0,0); pass('direct submit bypasses remain absent');
assert.match(reg,/enforcement:\s*true/); assert.match(reg,/mode:\s*['"]enforced['"]/); pass('message contract enforcement stays enabled');
assert.match(bg,/CONTENT_SCRIPT_FILES\s*=\s*\[[^\]]*message-contract-registry\.js/s); pass('dynamic bootstrap retains registry');
assert.match(app,/UI_ACTION_STATE_DESYNC_DETECTED|actionsDiagnosticsController/); pass('actions diagnostics surface remains present');
assert.match(remote,/RENEWAL_SOURCE_DELETE_VERIFIED/); assert.match(remote,/RENEWAL_REPLACEMENT_COMPLETED/); pass('replacement verification events remain present');
console.log(`${n}/5 PASS`);
