'use strict';
// Test the actual PAGE_STATUS content listener, with synthetic DOM/form
// fixtures. No navigation, form modification, network or remote actions.
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const ManagedNavigation=require('../src/shared/managed-navigation.js');
const source=fs.readFileSync('src/content/content.js','utf8');
const editUrl='https://www.kleinanzeigen.de/p-anzeige-bearbeiten.html?adId=456';
const publicUrl='https://www.kleinanzeigen.de/s-anzeige/example/456-22-1';
function fixture(opts={}){
  const url=new URL(opts.url||editUrl);let listener=null;
  const form={querySelectorAll:()=>opts.inputs||[],getAttribute:key=>key==='action'?(opts.action||''):null};
  const edit={eligible:true,form,adId:'456',title:'Example',description:'Description',
    diagnostics:{structuredSource:{adId:456}},blockingIssues:[],...opts.edit};
  const document={title:'Example',body:{innerText:'',textContent:''},
    querySelectorAll:()=>[],
    querySelector(sel){
      if(sel==='link[rel="canonical"]'&&opts.canonical)return {href:opts.canonical};
      if(sel.includes('og:url')&&opts.og)return {content:opts.og};
      if(sel==='#viewad-title'&&opts.publicTitle)return {textContent:'Example'};
      if(sel==='#viewad-description-text'&&opts.publicDescription)return {textContent:'Description'};
      return null;
    }};
  const modules={
    KRMessageContractRegistry:{route:()=>({action:'accept'})},
    KRPlatformHardening:{detectAccessRestriction:()=>opts.restriction||null},
    KRManagedNavigation:ManagedNavigation,
    KRForm:{locate:()=>({eligible:!opts.noForm}),extract:()=>{if(opts.throwExtract)throw Error('not ready');return edit;}},
    KRImages:{},KRTemplateFill:{},KRInventoryRun:{isMyAdsUrl:()=>false,detectedProfileName:()=> 'Account'}
  };
  const ctx={URL,document,location:{href:url.href,origin:url.origin,pathname:url.pathname},
    KRDeps:{require:name=>modules[name]},
    chrome:{runtime:{onMessage:{addListener:f=>{listener=f;}},sendMessage:(_m,cb)=>cb?.(),lastError:null}}};
  vm.runInNewContext(source,ctx);
  return (extra={})=>{let response;listener({type:'PAGE_STATUS',...extra},null,x=>{response=x;});return response;};
}
const edit=opts=>fixture(opts)({publicationEditProof:true}).result.publicationEditEvidence;
const pub=opts=>fixture({url:publicUrl,...opts})({publicationPublicProof:true}).result.publicationPublicEvidence;
assert.equal(edit({}).state,'verified');
assert.equal(edit({edit:{diagnostics:{}}}).state,'not-ready','URL plus generic form is insufficient');
assert.equal(edit({edit:{diagnostics:{structuredSource:{adId:999}}}}).state,'identity-conflict');
assert.equal(edit({edit:{conflict:true}}).state,'identity-conflict');
assert.equal(edit({edit:{blockingIssues:['structured-ad-identity']}}).state,'identity-conflict');
assert.equal(edit({edit:{eligible:false}}).state,'not-ready');
assert.equal(edit({edit:{description:''}}).state,'not-ready');
assert.equal(edit({throwExtract:true}).state,'not-ready');
assert.equal(edit({edit:{diagnostics:{}},inputs:[{name:'adId',value:'456'}]}).state,'verified');
assert.equal(edit({edit:{diagnostics:{}},inputs:[{name:'ad_id',value:'999'}]}).state,'identity-conflict');
assert.equal(edit({edit:{diagnostics:{}},action:'/p-anzeige-bearbeiten.html?adId=456'}).state,'verified');
assert.equal(edit({action:'https://example.invalid/'}).state,'identity-conflict');
assert.equal(edit({url:publicUrl}).state,'not-ready');
assert.equal(edit({url:editUrl.replace('456','invalid')}).state,'not-ready');
assert.equal(fixture()().result.publicationEditEvidence,undefined,'existing PAGE_STATUS unchanged unless requested');
assert.equal(pub({canonical:publicUrl,publicTitle:true,publicDescription:true}).state,'verified');
assert.equal(pub({og:publicUrl,publicTitle:true,publicDescription:true}).state,'verified');
assert.equal(pub({publicTitle:true,publicDescription:true}).state,'not-ready','URL and content without independent identity insufficient');
assert.equal(pub({canonical:publicUrl,publicTitle:true}).state,'not-ready','missing listing description insufficient');
assert.equal(pub({canonical:publicUrl.replace('456-','999-'),publicTitle:true,publicDescription:true}).state,'identity-conflict');
assert.equal(pub({canonical:publicUrl,og:publicUrl.replace('456-','999-'),publicTitle:true,publicDescription:true}).state,'identity-conflict');
assert.equal(pub({url:editUrl}).state,'not-ready');
assert.equal(fixture({url:publicUrl})().result.publicationPublicEvidence,undefined);
console.log('PASS KAR-206 content PAGE_STATUS: 23 exact-ID and readiness assertions, no new message route');

// Real content handler -> actual publication service. The fixture supplies
// DOM only, never the status.adId field. Short URL stays short after loading.
async function integrated(){
  const Service=(()=>{let api;vm.runInNewContext(fs.readFileSync('src/background/services/publish-intent-authorization-service.js','utf8'),{KRDeps:{register:(_n,v)=>{api=v;}}});return api;})();
  const short='https://www.kleinanzeigen.de/s-anzeige/456';
  let passed=0,failed=0;
  async function check(name,fn){try{await fn();passed++;console.log('PASS '+name);}catch(e){failed++;console.log('FAIL '+name+': '+e.message);}}
  function serviceFixture(url,opts={}){
    const editListener=fixture(),publicListener=fixture({url,noForm:true,canonical:publicUrl,publicTitle:true,publicDescription:true,...opts.public});
    const opened=[],closed=[],requests=[],stages=[],tabs=new Map();
    const service=Service.create({
      sessionPort:{readRenewalSessions:async()=>({r:{fillId:'f',targetTabId:42,profileId:'P',sourceAdId:'123'}}),readArchiveInsertionSessions:async()=>({}),readFillSessions:async()=>({})},
      accountPort:{assertSelectedProfileMatchesLiveAccount:async()=>({profileId:'P',displayName:'Account'}),normalizeProfileName:x=>String(x||'').trim()},
      tabPort:{createManagedWorkerTab:async({url:u})=>{const id=opened.length+100;opened.push(u);tabs.set(id,u);return{id};},waitForTabComplete:async()=>{},ensureContentConnection:async()=>{},closeManagedWorkerTab:async id=>{closed.push(id);},
        sendTabRequestWithBootstrap:async(id,msg)=>{
          requests.push(msg.type);
          if(msg.type==='PAGE_STATUS'){
            const response=(tabs.get(id)===editUrl?editListener:publicListener)(msg);
            assert.equal(response.ok,true);return response.result;
          }
          if(msg.type==='MY_ADS_STATUS')return {isMyAdsPage:true,isProjectsTab:true,profileName:'Account',expectedOnline:opts.count??4,listingCount:opts.cards??2,currentPage:1,hasNext:true};
          if(msg.type==='WAIT_FOR_MY_ADS_READY')return {isMyAdsPage:true,isProjectsTab:true,profileName:'Account'};
          if(msg.type==='FIND_OWN_AD_BY_ID')throw Object.assign(new Error('PRIVATE_SITE_TEXT'),{code:opts.scanCode||'KR_MY_ADS_ROSTER_INCOMPLETE'});
          throw Error('Unexpected operation '+msg.type);
        }},
      journalPort:{requireAutoPublishIntentJournal:()=>({})},
      configPort:{MY_ADS_PROJECTS_URL:'https://www.kleinanzeigen.de/m-meine-anzeigen.html?tab=PROJECTS',TAB_LOAD_TIMEOUT_PHASE4_MS:30000,URL},
      verificationPort:{delay:async()=>{},onStage:x=>stages.push(x)}
    });
    const verify=()=>service.verifyAutoPublishRemoteOutcomeFresh({kind:'renewal',workflowId:'r',fillId:'f',targetTabId:42,sourceAdId:'123',profileId:'P',attemptId:'attempt'},'456');
    return {verify,opened,closed,requests,stages};
  }
  await check('actual PAGE_STATUS returns exact ID for both public URLs',()=>{
    for(const url of [short,publicUrl]){
      const result=fixture({url,noForm:true,canonical:publicUrl,publicTitle:true,publicDescription:true})({publicationPublicProof:true}).result;
      assert.equal(result.adId,'456');assert.equal(result.publicationPublicEvidence.state,'verified');
    }
  });
  await check('real short URL listener -> verifier succeeds without roster or mutation',async()=>{
    const f=serviceFixture(short);const p=await f.verify();assert.equal(p.targetEvidence,'verified-edit-and-public-listing');assert.equal(p.targetEditAdId,'456');assert.equal(p.targetPublicAdId,'456');assert.equal(f.opened.length,2);assert.equal(f.closed.length,2);assert.ok(f.requests.every(x=>x==='PAGE_STATUS'));
  });
  await check('real canonical URL listener -> verifier retains identical proof',async()=>{
    const f=serviceFixture(publicUrl);assert.equal((await f.verify()).targetEvidence,'verified-edit-and-public-listing');assert.equal(f.opened.length,2);
  });
  await check('short URL alone is never positive evidence',async()=>{
    const f=serviceFixture(short,{public:{canonical:null}});
    await assert.rejects(f.verify(),/KR_PUBLISH_INTENT_UNVERIFIED/);assert.ok(f.requests.includes('FIND_OWN_AD_BY_ID'));
    assert.ok(f.stages.some(x=>x.stage==='my-ads-search'&&x.result==='roster-incomplete'));
    assert.ok(!JSON.stringify(f.stages).includes('PRIVATE_SITE_TEXT'));
  });
  await check('wrong canonical ID fails closed without roster fallback',async()=>{
    const f=serviceFixture(short,{public:{canonical:publicUrl.replace('456-','999-')}});
    await assert.rejects(f.verify(),/KR_PUBLISH_INTENT_UNVERIFIED/);assert.equal(f.opened.length,2);
  });
  await check('unknown error is sanitized and never positive',async()=>{
    const f=serviceFixture(short,{public:{canonical:null},scanCode:'PRIVATE_CODE'});
    await assert.rejects(f.verify(),/KR_PUBLISH_INTENT_UNVERIFIED/);
    assert.ok(f.stages.some(x=>x.stage==='my-ads-search'&&x.result==='request-failed'));
    assert.ok(!JSON.stringify(f.stages).includes('PRIVATE'));
  });
  return {passed,failed};
}
module.exports=integrated;
if(require.main===module)integrated().then(r=>{console.log(JSON.stringify(r));if(r.failed)process.exitCode=1;}).catch(e=>{console.error(e);process.exitCode=1;});
