const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const root=path.resolve(__dirname,'..');
const read=n=>fs.existsSync(path.join(root,n))?fs.readFileSync(path.join(root,n),'utf8'):'';
const code=[read('mass-renewal-ui-controller.js'),read('archive-trash-insertion-ui-controller.js'),read('app.js')].join('\n');
function fn(name){const start=code.indexOf(`function ${name}`);if(start<0)throw new Error('missing '+name);const brace=code.indexOf('{',start);let d=0,q=null,esc=false;for(let i=brace;i<code.length;i++){const c=code[i];if(q){if(esc)esc=false;else if(c==='\\')esc=true;else if(c===q)q=null;continue;}if(c==="'"||c==='"'||c==='`'){q=c;continue;}if(c==='{')d++;else if(c==='}'&&--d===0)return code.slice(start,i+1);}throw new Error('unterminated '+name);}
let n=0;const ok=(m,f)=>{f();n++;console.log('PASS '+m)};
{
 const ctx={RENEWAL_MODE_FAST:'fast',normalizeRenewalMode:v=>String(v||'safe')};vm.createContext(ctx);vm.runInContext(`${fn('massRenewalPhaseLabels')};this.labels=massRenewalPhaseLabels;`,ctx);
 ok('mass renewal phase labels preserve safe and fast phase 2 wording',()=>{assert.equal(ctx.labels('safe')[2],'Neue Anzeige kontrollieren');assert.equal(ctx.labels('fast')[2],'Zusätzliche Datenprüfung entfällt');assert.equal(ctx.labels('fast')[4],'Bisherige Anzeige löschen')});
}
{
 const ctx={RENEWAL_MODE_FAST:'fast',normalizeRenewalMode:v=>String(v||'safe'),renewalProgressModel:record=>({states:{1:'success',2:record?.renewal?.renewalMode==='fast'?'skipped':'success',3:'active',4:'pending'}})};vm.createContext(ctx);vm.runInContext(`${fn('massRenewalPhaseLabels')};${fn('massRenewalPhaseModel')};this.model=massRenewalPhaseModel;`,ctx);
 ok('mass renewal phase model preserves success and fast skipped phase',()=>{const safe=ctx.model({status:'success'},{renewalMode:'safe'});assert.deepEqual(JSON.parse(JSON.stringify(safe.states)),{1:'success',2:'success',3:'success',4:'success'});const fast=ctx.model({status:'running',newAdId:'123',renewalStatus:'verifying',stage:'fast-my-ads-checking'},{renewalMode:'fast'});assert.equal(fast.states[2],'skipped');assert.equal(fast.states[3],'active')});
}
{
 const ctx={};vm.createContext(ctx);vm.runInContext(`${fn('massRenewalRetryActionLabel')};this.label=massRenewalRetryActionLabel;`,ctx);
 ok('mass renewal retry label preserves phase-aware recovery choices',()=>{assert.equal(ctx.label({renewalId:'r1',newAdId:'123',stage:'replacement-ready'}),'Austausch abschließen');assert.equal(ctx.label({renewalId:'r1',newAdId:'123',stage:'comparing'}),'Erneut prüfen');assert.equal(ctx.label({stage:'start-failed'}),'Neu inserieren erneut starten')});
}
{
 const ctx={RENEWAL_MODE_FAST:'fast',normalizeRenewalMode:v=>String(v||'safe')};vm.createContext(ctx);vm.runInContext(`${fn('archiveProgressModel')};this.model=archiveProgressModel;`,ctx);
 ok('archive progress model preserves full and fast completion semantics',()=>{const full=ctx.model({renewalMode:'safe',status:'complete',stage:'complete',newAdId:'123'});assert.deepEqual(JSON.parse(JSON.stringify(full.states)),{1:'success',2:'success',3:'success',4:'success'});const fast=ctx.model({renewalMode:'fast',status:'complete',stage:'complete',newAdId:'123'});assert.equal(fast.states[2],'success');assert.equal(fast.states[3],'skipped');assert.equal(fast.states[4],'success')});
}
{
 const ctx={selectedProfileId:'p1',trackedTrashTemplateNewAdId:'',trackedTrashTemplateRecord:{profileId:'p1'},accountGateModel:()=>({allowed:true,tooltip:''})};vm.createContext(ctx);vm.runInContext(`${fn('trashTemplateInventoryGate')};this.gate=trashTemplateInventoryGate;`,ctx);
 ok('trash template inventory gate preserves publish account and profile requirements',()=>{assert.equal(ctx.gate().allowed,false);vm.runInContext(`trackedTrashTemplateNewAdId='123'`,ctx);assert.equal(ctx.gate().allowed,true);vm.runInContext(`trackedTrashTemplateRecord={profileId:'p2'}`,ctx);const mismatch=ctx.gate();assert.equal(mismatch.allowed,false);assert.match(mismatch.tooltip,/ausgewählten Inventarprofil/) });
}
console.log(`${n}/5 PASS`);
