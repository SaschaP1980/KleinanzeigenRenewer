const fs=require('fs'),assert=require('assert');
let n=0; const ok=(name,fn)=>{fn();n++;console.log('PASS',name)};
ok('registry module exists and registers with KRDeps',()=>{const s=fs.readFileSync('message-contract-registry.js','utf8'); assert.match(s,/KRMessageContractRegistry/); assert.match(s,/KRDeps\.register\('KRMessageContractRegistry'/)});
ok('background loads registry before router',()=>{const s=fs.readFileSync('background.js','utf8'); assert.match(s,/importScripts\("\.\.\/shared\/runtime-deps\.js",\s*"\.\.\/shared\/message-contract-registry\.js"/); assert.match(s,/KRDeps\.require\('KRMessageContractRegistry'\)/)});
ok('content/app bootstrap registry explicitly',()=>{const m=JSON.parse(fs.readFileSync('manifest.json')); assert.equal(m.content_scripts[0].js[1],'src/shared/message-contract-registry.js'); const h=fs.readFileSync('app.html','utf8'); assert.ok(h.indexOf('message-contract-registry.js')>h.indexOf('runtime-deps.js'))});
ok('registry retains diagnostic inspection surface',()=>{const s=fs.readFileSync('message-contract-registry.js','utf8'); assert.match(s,/inspect/); assert.match(s,/snapshot/); assert.doesNotMatch(s,/throw new Error\([^\n]*Unknown message/)});
ok('diagnostic export includes registry summary and visible versionName',()=>{const s=fs.readFileSync('background.js','utf8')+'\n'+fs.readFileSync('diagnostic-export-service.js','utf8'); assert.match(s,/versionName:\s*manifest\.version_name/); assert.match(s,/messageContracts:\s*MessageContractRegistry\.snapshot\(\)/)});
console.log(`${n}/${n} PASS v1.22.24 message-contract registry contract`);
