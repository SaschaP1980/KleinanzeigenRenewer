const assert=require('assert');
const fs=require('fs');
const vm=require('vm');
const src=require('./v12216-source-surface.cjs');
function extract(name){
  const m=new RegExp(`(?:async\\s+)?function\\s+${name}\\s*\\(`).exec(src); if(!m) throw new Error(`missing ${name}`);
  let i=src.indexOf('{',m.index),d=0,s=false,q='',esc=false;
  for(let j=i;j<src.length;j++){const c=src[j];if(s){if(esc){esc=false;continue}if(c==='\\\\'){esc=true;continue}if(c===q){s=false;q=''}continue}if(c==='"'||c==="'"||c==='`'){s=true;q=c;continue}if(c==='{')d++;else if(c==='}'&&--d===0)return src.slice(m.index,j+1)}throw new Error(`unterminated ${name}`)
}
let p=0;const ok=async(n,f)=>{try{await f();p++;console.log('PASS '+n)}catch(e){console.error('FAIL '+n);throw e}};
(async()=>{
await ok('template transient progress recognizes only image transfer stages',async()=>{const ctx={};vm.createContext(ctx);vm.runInContext(extract('isTransientTemplateFillProgress'),ctx);assert.equal(ctx.isTransientTemplateFillProgress('image-2-of-5-uploading','running',null),true);assert.equal(ctx.isTransientTemplateFillProgress('awaiting-publish','running',null),false);assert.equal(ctx.isTransientTemplateFillProgress('image-2-of-5-stable','complete',null),false);});
await ok('template progress snapshot preserves renewal batch correlation',async()=>{const ctx={};vm.createContext(ctx);vm.runInContext(extract('templateFillProgressSnapshot'),ctx);const x=ctx.templateFillProgressSnapshot({renewalId:'r',massBatchId:'b',massBatchItemIndex:2,fillId:'f',operationId:'o'},'image-1-of-2-stable','2026-01-01T00:00:00.000Z');assert.equal(x.status,'draft');assert.equal(x.massBatchId,'b');assert.equal(x.stage,'image-1-of-2-stable');});
await ok('archive public snapshot strips private source payload',async()=>{const ctx={normalizeRenewalMode:v=>v||'safe',structuredClone};vm.createContext(ctx);vm.runInContext(extract('archiveInsertionPublicSnapshot'),ctx);const x=ctx.archiveInsertionPublicSnapshot({archiveInsertionId:'a',sourceRecord:{title:'secret'},revision:3,status:'filling',renewalMode:'safe'});assert.equal(x.archiveInsertionId,'a');assert.equal(x.revision,3);assert.equal(Object.prototype.hasOwnProperty.call(x,'sourceRecord'),false);});
await ok('renewal insertion metadata requires a valid confirmed timestamp',async()=>{const ctx={normalizeRenewalMode:v=>v||'safe'};vm.createContext(ctx);vm.runInContext(extract('renewalInsertionMeta'),ctx);assert.equal(ctx.renewalInsertionMeta({newIdConfirmedAt:'nope'}),null);assert.equal(ctx.renewalInsertionMeta({newIdConfirmedAt:'2026-01-01T00:00:00.000Z',renewalMode:'fast'}).renewalMode,'fast');});
console.log(`${p}/4 PASS v1.22.16 pre-refactor runtime`);
})().catch(e=>{console.error(e);process.exit(1)});
