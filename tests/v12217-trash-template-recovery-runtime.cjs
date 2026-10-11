const fs=require('fs'),vm=require('vm'),assert=require('assert');
if(!fs.existsSync('published-inventory-resolver.js')){console.error('FAIL resolver module missing');process.exit(1);}
const src=fs.readFileSync('published-inventory-resolver.js','utf8');
let updated=[];let waited=[];let messages=[];
const ctx={globalThis:null,URL,console};ctx.globalThis=ctx;vm.createContext(ctx);vm.runInContext(src,ctx);
const api=ctx.KRPublishedInventoryResolver;
assert.ok(api?.create,'resolver API');
const resolver=api.create({
  getTab:async id=>({id,url:'https://www.kleinanzeigen.de/p-anzeige-aufgeben-bestaetigung.html?addId=3522379383'}),
  updateTab:async(id,props)=>{updated.push({id,props});return {id,url:props.url};},
  waitForExpectedComplete:async(id,url)=>{waited.push({id,url});return {id,url,status:'complete'};},
  ensureContentConnection:async()=>({ready:true}),
  tabMessage:async(id,msg)=>{messages.push(msg.type);if(msg.type==='PAGE_STATUS')return {auth:{loggedIn:true,ownAd:true},adId:'3522379383'};if(msg.type==='INVENTORY_CANDIDATE_PREVIEW')return {adId:'3522379383',title:'Test',publicUrl:null};throw new Error('unexpected');}
});
(async()=>{
 const out=await resolver.resolve({tabId:77,adId:'3522379383'});
 assert.equal(out.adId,'3522379383');assert.equal(out.sourceTabId,77);
 assert.equal(updated.length,1);assert.match(updated[0].props.url,/p-anzeige-bearbeiten\.html\?adId=3522379383/);
 assert.equal(waited.length,1);assert.deepEqual(messages,['PAGE_STATUS','INVENTORY_CANDIDATE_PREVIEW']);
 const denied=api.create({getTab:async()=>({id:9,url:'https://www.kleinanzeigen.de/p-anzeige-aufgeben-bestaetigung.html?addId=3522379383'}),updateTab:async()=>({}),waitForExpectedComplete:async()=>({}),ensureContentConnection:async()=>({}),tabMessage:async(_id,msg)=>msg.type==='PAGE_STATUS'?{auth:{loggedIn:true,ownAd:false},adId:'3522379383'}:{adId:'3522379383'}});
 await assert.rejects(()=>denied.resolve({tabId:9,adId:'3522379383'}),/eigene Anzeige|Own-Ad|zugeordnet/i);
 console.log('v1.22.17 trash-template resolver runtime: 2/2 PASS');
})().catch(e=>{console.error(e);process.exit(1)});
