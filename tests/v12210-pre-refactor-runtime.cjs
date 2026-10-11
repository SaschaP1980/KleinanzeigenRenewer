const fs=require('fs'),assert=require('assert/strict'),vm=require('vm');
const read=n=>fs.existsSync(n)?fs.readFileSync(n,'utf8'):'';
const source=[read('inventory-formatting.js'),read('app.js')].join('\n');
function sourceOf(name){
  const re=new RegExp(`function\\s+${name}\\s*\\(`); const m=re.exec(source); if(!m) throw new Error(`missing ${name}`);
  const start=m.index, open=source.indexOf('{',start); let depth=0, quote='', escape=false;
  for(let i=open;i<source.length;i++){
    const c=source[i];
    if(quote){if(escape)escape=false;else if(c==='\\\\')escape=true;else if(c===quote)quote='';continue;}
    if(c==='"'||c==="'"||c==='`'){quote=c;continue;} if(c==='{')depth++; else if(c==='}'&&--depth===0) return source.slice(start,i+1);
  }
  throw new Error(`unterminated ${name}`);
}
const names=['displayPrice','categoryLabel','compactCategoryLabel','renewalIsReplacementReady','renewalAutoCompletionPending','renewalStatusLabel','canDiscardRenewalDraft','trashReasonLabel'];
const api=vm.runInNewContext(`${names.map(sourceOf).join('\n')}\n({${names.join(',')}})`);
let n=0;const check=(m,f)=>{f();n++;console.log('PASS '+m)};
check('price formatting preserves currency normalization',()=>{assert.equal(api.displayPrice({price:{value:'19'}}),'19 €');assert.equal(api.displayPrice({price:{displayed:'19 €',value:'19'}}),'19 €');assert.equal(api.displayPrice({price:{}}),'–')});
check('category formatting preserves full and compact labels',()=>{const r={category:{path:['Mode & Beauty','Damenbekleidung','Weitere Damenbekleidung']}};assert.equal(api.categoryLabel(r),'Mode & Beauty › Damenbekleidung › Weitere Damenbekleidung');assert.equal(api.compactCategoryLabel(r),'Weitere Damenbekleidung')});
check('replacement-ready renewal remains a verified normal inventory state',()=>{const r={adId:'123',renewal:{renewalId:'r1',status:'verified',stage:'replacement-ready'}};assert.equal(api.renewalIsReplacementReady(r),true);assert.equal(api.renewalStatusLabel(r),'AUSTAUSCH BEREIT')});
check('automatic source deletion remains visibly in-progress rather than replacement-ready',()=>{const r={adId:'123',renewal:{renewalId:'r1',status:'verified',stage:'source-delete-started',autoReplacementAllowed:true}};assert.equal(api.renewalAutoCompletionPending(r),true);assert.equal(api.renewalStatusLabel(r),'AUSTAUSCH LÄUFT')});
check('published renewal drafts cannot be discarded',()=>{assert.equal(api.canDiscardRenewalDraft({renewal:{renewalId:'r1',status:'draft',stage:'draft'}}),true);assert.equal(api.canDiscardRenewalDraft({adId:'123',renewal:{renewalId:'r1',status:'verified',stage:'replacement-ready'}}),false)});
check('trash reasons keep stable user-facing labels',()=>{assert.equal(api.trashReasonLabel({trash:{reason:'renewal-replaced'}}),'Nach erfolgreichem Austausch');assert.equal(api.trashReasonLabel({trash:{reason:'manual'}}),'Manuell aus Inventar entfernt')});
console.log(`${n}/6 PASS`);
