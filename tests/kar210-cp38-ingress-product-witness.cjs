'use strict';
// Product-only assertions; actual historical owners and synthetic fixtures.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),test=require('node:test'),vm=require('node:vm');
const Recovery=require('../src/background/services/archive-insertion-recovery-service.js');
const source=name=>fs.readFileSync(name,'utf8');
function section(body,start,end){const a=body.indexOf(start),b=body.indexOf(end,a+start.length);assert.ok(a>=0&&b>a);return body.slice(a,b);}
test('exact original delete, no-submit and read-only postpublish assertions',()=>{
 const ok=(value,label)=>assert.ok(value,label);
const ownDelete = source('src/content/inventory-delete-operations.js');
const ownDeleteFn = section(ownDelete, 'async function deleteOwnAdById(', 'async function ');
ok(ownDeleteFn.includes('exactDeleteControls(listing.root)')
   && ownDeleteFn.includes('deleteControls.length !== 1')
   && ownDeleteFn.includes('deleteControls[0].click()'),
  'only an unambiguous exact-ad-id own-listing Delete control may proceed');


const verify = source('src/background/services/archive-insertion-verification-service.js');
const archivePost = section(verify, 'async function runArchiveInsertionPostPublish(', 'async function confirmPublishedArchiveInsertion(');
ok(archivePost.includes('findArchivePublishedAd(session)')
   && !archivePost.includes('.click(') && !archivePost.includes('DELETE_OWN_AD_BY_ID')
   && !archivePost.includes('AUTHORIZE_AUTOMATIC_PUBLISH'),
  'detached archive postpublish continuation has no second external publish/delete side effect');

const contentDir = 'src/content';
const modules = fs.readdirSync(contentDir).filter(x => x.endsWith('.js'));
const callers = [];
for (const name of modules) {
  const raw = source(path.join(contentDir, name));
  const lines = raw.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line.startsWith('//') && /(?:^|[^.])(?:form\.)?requestSubmit\s*\(|\.submit\s*\(/.test(line))
      callers.push(name + ':' + (i+1));
  }
}
ok(callers.length === 0, 'no direct form.submit()/requestSubmit() bypass in any content runtime module: ' + callers.join(', '));

});
test('actual read-only PAGE_STATUS never treats public seller links as logged-in identity',()=>{
 const ok=(value,label)=>assert.ok(value,label),adPageUrl='https://www.kleinanzeigen.de/m-meine-anzeigen.html?tab=PROJECTS';
  const vm=require('node:vm');
  const actualContent=fs.readFileSync('src/content/content.js','utf8');
  function actualPageStatus(hrefs,{loggedIn=true}={}){
    const calls={external:0,listener:null};
    const anchors=hrefs.map(href=>({
      textContent:'',getAttribute:key=>key==='href'?href:null
    }));
    const account={textContent:'Meins',getAttribute:key=>
      key==='href'?'/m-meine-anzeigen.html':null};
    const document={
      title:'Meine Anzeigen',body:{innerText:'',textContent:''},
      querySelectorAll:selector=>selector==='a[href]'?anchors:
        selector==='a,button'?(loggedIn?[account]:[]):[],
      querySelector:()=>null
    };
    const context={
      document,URL,
      location:{href:adPageUrl,pathname:'/m-meine-anzeigen.html',
        origin:'https://www.kleinanzeigen.de'},
      KRDeps:{require:name=>{
        if(name==='KRMessageContractRegistry')
          return {route:()=>({action:'allow'})};
        if(name==='KRPlatformHardening')
          return {detectAccessRestriction:()=>null};
        if(name==='KRForm')return {locate:()=>({eligible:false})};
        if(name==='KRInventoryRun')
          return {isMyAdsUrl:()=>true,detectedProfileName:()=>'Fixture account'};
        return {};
      }},
      chrome:{runtime:{
        lastError:null,onMessage:{addListener:fn=>{calls.listener=fn;}},
        sendMessage:()=>{calls.external++;}
      }}
    };
    vm.runInNewContext(actualContent,context,{timeout:2000});
    assert.equal(typeof calls.listener,'function');
    let response;
    calls.listener({type:'PAGE_STATUS'},{},value=>{response=value;});
    assert.equal(response?.ok,true);
    assert.equal(calls.external,1,'only existing platform safety status request');
    return JSON.parse(JSON.stringify(response.result));
  }
  const profileLinks=actualPageStatus([
    '/s-bestandsliste.html?userId=445566',
    'https://kleinanzeigen.de/s-bestandsliste.html?userId=789',
    'https://attacker.example/s-bestandsliste.html?userId=999',
    'https://www.kleinanzeigen.de.evil.example/s-bestandsliste.html?userId=999',
    'javascript:alert(1)',
    'https://www.kleinanzeigen.de/s-bestandsliste.html?userId=987&userId=765',
    '/s-bestandsliste.html?userId=not-numeric',
    '/s-anzeige/123-111-222'
  ]);
  ok(profileLinks.auth.loggedIn===true
    &&profileLinks.profileName==='Fixture account'
    &&!Object.hasOwn(profileLinks,'siteSellerIdHints'),
    'actual PAGE_STATUS reuses only existing account status and never infers account identity from public seller links');
  const publicLinks=Array.from({length:36},(_,i)=>
    '/s-bestandsliste.html?userId='+String(10000+i));
  const overflow=actualPageStatus(publicLinks);
  ok(overflow.profileName==='Fixture account'
    &&!Object.hasOwn(overflow,'siteSellerIdHints'),
    'unrelated seller links are not scanned or processed as account identity evidence');
  const loggedOut=actualPageStatus(['/s-bestandsliste.html?userId=445566'],
    {loggedIn:false});
  ok(loggedOut.auth.loggedIn===false
    &&!Object.hasOwn(loggedOut,'siteSellerIdHints'),
    'logged-out PAGE_STATUS provides no spurious seller ID evidence');

});
test('actual ingress dispatches managed and user-owned initial and post-fill branches',async()=>{
 const filler=source('src/content/template-filler.js');
 for(const [session,kind,expected] of [[{renewalId:'r'},'target','fill'],[{archiveInsertionId:'a'},'target','fill'],[{renewalId:'r',stage:'auto-publish-ready'},'post-fill','postfill'],[{templateOnly:true},'target','fill'],[{renewalId:'r'},'category','category']]){
  const events=[];const run=vm.runInNewContext(section(filler,'async function runPendingFill()','const API = Object.freeze(')+'\nrunPendingFill;',{
   armMassRenewalHeartbeat:()=>{},pageKind:()=>kind,runtimeMessage:async msg=>{assert.equal(msg.type,'GET_TEMPLATE_FILL_SESSION');return {fillId:'f',stage:'form-ready',...session};},activeCorrelationContext:{},panelTemplateOnly:false,panelArchiveInsertion:false,
   armPublishDetection:id=>events.push('armed:'+id),runFillSession:async()=>events.push('fill'),runPostFillSession:async()=>events.push('postfill'),runLegacyCategorySelection:async()=>events.push('category')
  });await run();assert.equal(events.at(-1),expected);if(session.templateOnly)assert.deepEqual(events,['fill']);
 }
});
test('actual archive recovery dispatches known published continuations, not terminal or unknown-id sessions',async()=>{
 const cases=[{status:'published',newAdId:'123',expected:1},{status:'finding',newAdId:'123',expected:1},{status:'error',newAdId:'123',failurePhase:2,lastError:'Profil des exportierten Datensatzes',expected:1},{status:'complete',newAdId:'123',expected:0},{status:'needs-review',newAdId:'123',expected:0},{status:'cancelled',newAdId:'123',expected:0},{status:'published',newAdId:'',expected:0}];
 for(const {expected,...row} of cases){
  const starts=[],writes=[];const session={archiveInsertionId:'abc',...row};
  const recovery=Recovery.create({readArchiveInsertionSessions:async()=>({abc:session}),readFillSessions:async()=>({}),getInventory:async()=>null,isTrashRecord:()=>false,persistArchiveInsertionSession:async s=>writes.push(structuredClone(s)),deleteImagesByInventoryId:async()=>{},logDiagnostic:async()=>{},setAppNotice:async()=>{},broadcastInventoryChanged:()=>{},normalizeRenewalMode:()=> 'safe',compareArchiveInsertionRecords:async()=>({status:'mismatch'}),runArchiveInsertionPostPublish:async id=>starts.push(id),confirmPublishedArchiveInsertion:async()=>assert.fail('unexpected confirmation'),cryptoApi:{randomUUID:()=> 'fixture'}});
  await recovery.resumePendingArchiveInsertions();assert.deepEqual(starts,expected?['abc']:[]);
  if(row.status==='error'){assert.equal(writes.length,1);assert.equal(writes[0].stage,'new-id-confirmed');}else assert.equal(writes.length,0);
 }
 const a=source('src/background/services/archive-insertion-recovery-service.js'),v=source('src/background/services/archive-insertion-verification-service.js');
 assert.equal((a.match(/void runArchiveInsertionPostPublish\(/g)||[]).length,2);assert.equal((v.match(/void runArchiveInsertionPostPublish\(/g)||[]).length,1);
});
