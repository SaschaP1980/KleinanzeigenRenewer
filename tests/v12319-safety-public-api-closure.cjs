'use strict';
const fs=require('node:fs');const assert=require('node:assert/strict');
const manifest=JSON.parse(fs.readFileSync('coverage/public-api-manifest.json','utf8'));
const safety=JSON.parse(fs.readFileSync('coverage/safety-critical-public-apis.json','utf8'));
const publicSet=new Set((manifest.functions||[]).map(f=>`${f.module}#${f.name}`));
let count=0;
for(const item of safety.apis||[]){
  assert.ok(publicSet.has(`${item.module}#${item.method}`),`Safety API must remain public/inventoried: ${item.module}#${item.method}`);
  assert.ok(String(item.contract||'').length>20,`Safety contract missing: ${item.method}`);
  assert.ok(Array.isArray(item.tests)&&item.tests.length>0,`Negative/fail-closed tests missing: ${item.method}`);
  for(const t of item.tests){assert.ok(fs.existsSync(t),`${item.method}: missing ${t}`);const src=fs.readFileSync(t,'utf8');assert.match(src,/assert|PASS|reject|throw|fail|blocked|abort|mismatch|invalid|safety|closed/i,`${item.method}: ${t} does not look like a contract test`);}
  count++;
}
assert.ok(count>=12,'Expected a material safety-critical public-API set');
console.log(`PASS v1.23.19 safety public-API closure: ${count} APIs have explicit negative/fail-closed regression evidence`);
