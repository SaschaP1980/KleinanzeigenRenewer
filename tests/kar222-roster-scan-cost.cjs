'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const read=p=>fs.readFileSync(p,'utf8');
function fixture(pages,{repeat=false}={}){
 let page=0,scans=0,nextClicks=0;
 const cards=pages.map(ids=>ids.map(id=>({getAttribute:k=>k==='data-adid'?id:null,querySelector:()=>null,querySelectorAll:()=>[],textContent:'',innerText:''})));
 const location={href:'https://www.kleinanzeigen.de/m-meine-anzeigen.html?tab=PROJECTS'};
 const document={body:{innerText:''},querySelectorAll(s){if(s==='[data-testid="ad-card"][data-adid]'){scans++;return cards[page];}return [];},querySelector(s){if(s.includes('aria-current'))return {textContent:String(page+1)};if(s.includes('Nächste')&&page<pages.length-1)return {getAttribute:()=>null,click(){nextClicks++;if(!repeat)page++;}};return null;}};
 const ctx=vm.createContext({console,URL,location,document,KRDeps:{register(n,api){ctx[n]=api;}}});
 for(const p of ['inventory-roster-parser.js','inventory-delete-operations.js'])vm.runInContext(read('src/content/'+p),ctx,{filename:p});
 const normalize=v=>String(v||'').trim(),normalizeKey=v=>normalize(v).toLowerCase(),sleep=async()=>{};
 const roster=ctx.KRInventoryRosterParser.create({MY_ADS_PATH:'/m-meine-anzeigen.html',PAGE_CHANGE_TIMEOUT_MS:100,normalize,normalizeKey,sleep});
 const ops=ctx.KRInventoryDeleteOperations.create({...roster,MAX_PHASE4_PAGES:5,sleep,normalize,normalizeKey,diagnostic:()=>{},...(repeat?{waitForPageChange:async()=>true}:{})});
 return {ops,roster,scans:()=>scans,nextClicks:()=>nextClicks};
}
test('Fast presence on a nonempty first page parses the roster exactly once',async()=>{
 const h=fixture([['300','200','100']]);const result=await h.ops.findOwnAdById('200');
 assert.equal(result.found,true);assert.equal(result.adId,'200');assert.equal(result.pagesScanned,1);assert.equal(h.scans(),1);assert.equal(h.nextClicks(),0);
});
test('independent source absence exhausts nonempty pages with fresh page-change check and no duplicate per-page parse',async()=>{
 const h=fixture([['300','200'],['400']]);const result=await h.ops.verifyOwnAdAbsentById('100');
 assert.equal(result.verified,true);assert.equal(result.adId,'100');assert.equal(result.pagesScanned,2);assert.equal(h.nextClicks(),1);assert.equal(h.scans(),3);
});
test('target on the second page retains exact identity and page transition proof',async()=>{
 const h=fixture([['100'],['200','300']]);const result=await h.ops.findOwnAdById('200');
 assert.equal(result.found,true);assert.equal(result.adId,'200');assert.equal(result.page,2);assert.equal(h.nextClicks(),1);assert.equal(h.scans(),3);
});
test('repeated page still fails rather than declaring source absent',async()=>{
 const h=fixture([['100'],['200']],{repeat:true});await assert.rejects(h.ops.verifyOwnAdAbsentById('999'),/Seitennavigation.*wiederholt/);assert.equal(h.nextClicks(),1);
});
test('empty roster keeps historical wait and fresh fingerprint fallback',async()=>{
 const h=fixture([[]]);const result=await h.ops.verifyOwnAdAbsentById('999');assert.equal(result.verified,true);assert.equal(result.adId,'999');assert.equal(h.scans(),13);
});
test('normal standalone fingerprint continues to read the live DOM and sorts exact IDs',()=>{
 const h=fixture([['300','100','200']]);assert.equal(h.roster.pageFingerprint(),'100,200,300');assert.equal(h.scans(),1);
});
