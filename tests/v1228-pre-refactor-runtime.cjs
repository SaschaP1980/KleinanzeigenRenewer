const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const RenewalSettingsController=require('../src/app/renewal-settings-controller.js');
const RenewalPolicy=require('../src/shared/renewal-policy.js');
const root=path.resolve(__dirname,'..');
const read=n=>fs.existsSync(path.join(root,n))?fs.readFileSync(path.join(root,n),'utf8'):'';
const code=[read('app.js'),read('inventory-capture-controller.js'),read('renewal-dialog-controller.js')].join('\n');
function fn(name){const start=code.indexOf(`function ${name}`);if(start<0)throw new Error('missing '+name);const brace=code.indexOf('{',start);let d=0,q=null,esc=false;for(let i=brace;i<code.length;i++){const c=code[i];if(q){if(esc)esc=false;else if(c==='\\')esc=true;else if(c===q)q=null;continue;}if(c==="'"||c==='"'||c==='`'){q=c;continue;}if(c==='{')d++;else if(c==='}'&&--d===0)return code.slice(start,i+1);}throw new Error('unterminated '+name);}
let n=0;const ok=(m,f)=>{f();n++;console.log('PASS '+m)};
{
 const ctx={};vm.createContext(ctx);vm.runInContext(`${fn('inventoryCaptureBulkProgressModel')};this.model=inventoryCaptureBulkProgressModel;`,ctx);
 ok('bulk inventory progress model preserves running and completed counts',()=>{const r=ctx.model({status:'running',successCount:2,failedCount:1,expectedTotal:7,currentAdId:'123'});assert.equal(r.terminal,false);assert.equal(r.processed,3);assert.equal(r.total,7);assert.equal(r.title,'Wird gerade erfasst');const c=ctx.model({status:'complete',successCount:7,expectedTotal:7});assert.equal(c.terminal,true);assert.equal(c.kind,'success');assert.equal(c.percent,100)});
 ok('bulk inventory progress model preserves new-only and review semantics',()=>{const n1=ctx.model({status:'complete',inventoryScope:'new-only',successCount:2,skippedExistingCount:5,expectedTotal:7});assert.match(n1.facts,/2 neu/);assert.match(n1.facts,/5 vorhanden/);const review=ctx.model({status:'needs-review',stage:'reconciliation-mismatch',expectedTotal:7});assert.equal(review.kind,'waiting');assert.equal(review.title,'Bestand prüfen')});
}
{
 const renewalSettingsController=RenewalSettingsController.create({safeMode:'safe',fastMode:'fast'});
 const ctx={RenewalPolicy,RENEWAL_MODE_SAFE:'safe',RENEWAL_MODE_FAST:'fast',currentRenewalConfiguration:{renewalMode:'safe'},requireRenewalSettingsController:()=>renewalSettingsController};vm.createContext(ctx);vm.runInContext(`${fn('normalizeRenewalMode')};${fn('renewalModeForRecord')};${fn('renewalProgressModel')};this.model=renewalProgressModel;`,ctx);
 ok('renewal model preserves safe-mode reinventory progression',()=>{const r=ctx.model({adId:'222',renewal:{renewalMode:'safe',status:'reinventorizing',stage:'edit-worker-opened'}});assert.equal(r.mode,'safe');assert.equal(r.states[1],'success');assert.equal(r.states[2],'active');assert.match(r.title,/kontrolliert/)});
 ok('renewal model preserves fast-mode skipped phase and My Ads verification',()=>{const r=ctx.model({adId:'333',renewal:{renewalMode:'fast',status:'verifying',stage:'fast-my-ads-checking'}});assert.equal(r.mode,'fast');assert.equal(r.states[2],'skipped');assert.equal(r.states[3],'active');assert.match(r.title,/Meine Anzeigen/)});
 ok('renewal model preserves protected-source failure behavior',()=>{const r=ctx.model({adId:'444',renewal:{renewalMode:'safe',status:'verification-failed',stage:'comparing'}});assert.equal(r.kind,'error');assert.match(r.text,/alte Anzeige wurde nicht entfernt/)});
}
console.log(`${n}/5 PASS`);
