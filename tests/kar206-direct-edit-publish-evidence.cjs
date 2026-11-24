'use strict';
// KAR-206: exact-ID authenticated edit evidence is not by itself online proof.
// Exercise the production authorization service and immutable journal, not a
// duplicated state machine. All remote ports are synthetic, read-only fixtures.
async function run({Service,Journal,assert,URL}) {
  const intent={kind:'renewal',workflowId:'r',fillId:'f',targetTabId:42,
    sourceAdId:'123',profileId:'P',attemptId:'attempt',workerInstanceId:'worker',
    admissionToken:'original-token'};
  const editUrl='https://www.kleinanzeigen.de/p-anzeige-bearbeiten.html?adId=456';
  const publicUrl='https://www.kleinanzeigen.de/s-anzeige/example/456-22-1';
  const rosterUrl='https://www.kleinanzeigen.de/m-meine-anzeigen.html?tab=PROJECTS';
  const editStatus={url:editUrl,pageType:'edit',adId:'456',profileName:'Account',
    auth:{loggedIn:true,ownAd:true,evidence:'existing-edit-form'},
    publicationEditEvidence:{state:'verified',adId:'456'}};
  const publicStatus={url:publicUrl,adId:'456',
    publicationPublicEvidence:{state:'verified',adId:'456'}};
  const rosterStatus={isMyAdsPage:true,isProjectsTab:true,profileName:'Account'};
  const rosterFound={found:true,adId:'456',page:1,pagesScanned:1,
    evidence:'found-in-my-ads-full-pagination-scan'};
  function fixture(opts={}) {
    const opened=[],closed=[],messages=[],stages=[],tabs=new Map();
    const session={fillId:'f',targetTabId:42,profileId:'P',sourceAdId:'123'};
    let accountReads=0,editReads=0,publicReads=0,rosterReads=0;
    const service=Service.create({
      sessionPort:{readArchiveInsertionSessions:async()=>({}),readRenewalSessions:async()=>({r:session}),readFillSessions:async()=>({})},
      accountPort:{assertSelectedProfileMatchesLiveAccount:async()=>{
        accountReads++;return {profileId:opts.changedAccount&&accountReads>1?'other':'P',displayName:'Account'};
      },normalizeProfileName:x=>String(x||'').trim()},
      tabPort:{createManagedWorkerTab:async({url})=>{
        const id=100+opened.length;opened.push(url);tabs.set(id,url);return {id};
      },waitForTabComplete:async()=>{},ensureContentConnection:async()=>{},
      sendTabRequestWithBootstrap:async(id,msg)=>{
        const url=tabs.get(id);messages.push(msg.type);
        if(msg.type==='PAGE_STATUS'&&url===editUrl){
          editReads++;return typeof opts.edit==='function'?opts.edit(editReads):opts.edit??editStatus;
        }
        if(msg.type==='PAGE_STATUS'&&url.includes('/s-anzeige/')){
          publicReads++;if(opts.changeSession)session.sourceAdId='999';
          return typeof opts.public==='function'?opts.public(publicReads):opts.public??publicStatus;
        }
        if(msg.type==='MY_ADS_STATUS'){
          rosterReads++;if(opts.rosterUnavailable)throw Error('site roster unavailable');
          return typeof opts.roster==='function'?opts.roster(rosterReads):opts.roster??rosterStatus;
        }
        if(msg.type==='WAIT_FOR_MY_ADS_READY')return rosterStatus;
        if(msg.type==='FIND_OWN_AD_BY_ID')return opts.presence??rosterFound;
        throw Error('unexpected remote operation '+msg.type);
      },closeManagedWorkerTab:async id=>{closed.push(id);}},
      journalPort:{requireAutoPublishIntentJournal:()=>({})},
      configPort:{MY_ADS_PROJECTS_URL:rosterUrl,TAB_LOAD_TIMEOUT_PHASE4_MS:30000,URL},
      verificationPort:{delay:async()=>{},onStage:info=>stages.push(info)}
    });
    return {service,opened,closed,messages,stages};
  }
  let passed=0,failed=0;
  async function check(name,fn){
    try{await fn();passed++;console.log('PASS '+name);}
    catch(error){failed++;console.log('FAIL '+name+': '+error.message);}
  }
  const proof=f=>f.service.verifyAutoPublishRemoteOutcomeFresh(intent,'456');
  await check('direct edit plus independently verified public page succeeds without roster',async()=>{
    const f=fixture({rosterUnavailable:true});const p=await proof(f);
    assert.equal(p.targetEvidence,'verified-edit-and-public-listing');
    assert.equal(p.targetEditAdId,'456');assert.equal(p.targetPublicAdId,'456');
    assert.equal(p.targetPresent,true);assert.equal(p.targetPagesScanned,undefined);
    assert.equal(p.admissionToken,intent.admissionToken);
    assert.equal(f.opened[0],editUrl);assert.equal(f.opened.length,2);
    assert.equal(f.closed.length,2);assert.equal(f.messages.every(x=>x==='PAGE_STATUS'),true);
  });
  await check('edit not ready is bounded and falls back to authenticated roster',async()=>{
    const f=fixture({edit:{...editStatus,publicationEditEvidence:{state:'not-ready'}}});
    const p=await proof(f);assert.equal(p.targetEvidence,rosterFound.evidence);
    assert.equal(f.messages.filter(x=>x==='PAGE_STATUS').length,3);
    assert.equal(f.opened[0],editUrl);assert.equal(f.opened[1],rosterUrl);
    assert.equal(f.closed.length,2);
  });
  await check('edit alone without public or roster proof cannot advance',async()=>{
    const f=fixture({public:{...publicStatus,publicationPublicEvidence:{state:'not-ready'}},rosterUnavailable:true});
    await assert.rejects(proof(f),/KR_PUBLISH_INTENT_UNVERIFIED/);
    assert.equal(f.closed.length,3);assert.equal(f.opened.length,3);
  });
  await check('wrong edit account never falls back or authorizes',async()=>{
    const f=fixture({edit:{...editStatus,profileName:'Wrong'}});
    await assert.rejects(proof(f),/KR_PUBLISH_INTENT_UNVERIFIED/);
    assert.equal(f.opened.length,1);assert.equal(f.closed.length,1);
  });
  await check('conflicting edit ID fails closed',async()=>{
    const f=fixture({edit:{...editStatus,publicationEditEvidence:{state:'identity-conflict'}}});
    await assert.rejects(proof(f),/KR_PUBLISH_INTENT_UNVERIFIED/);
    assert.equal(f.opened.length,1);
  });
  await check('wrong public ID fails closed even if roster could succeed',async()=>{
    const f=fixture({public:{...publicStatus,url:publicUrl.replace('456-','999-'),adId:'999'}});
    await assert.rejects(proof(f),/KR_PUBLISH_INTENT_UNVERIFIED/);
    assert.equal(f.opened.length,2);
  });
  await check('account or workflow change invalidates otherwise positive direct evidence',async()=>{
    for(const opts of [{changedAccount:true},{changeSession:true}]){
      const f=fixture(opts);await assert.rejects(proof(f),/KR_PUBLISH_INTENT_UNVERIFIED/);
      assert.equal(f.closed.length,2);
    }
  });
  await check('missing roster profile waits for readiness, then exact roster evidence',async()=>{
    const f=fixture({edit:{...editStatus,publicationEditEvidence:{state:'not-ready'}},
      roster:n=>n===1?{...rosterStatus,profileName:''}:rosterStatus});
    const p=await proof(f);assert.equal(p.targetEvidence,rosterFound.evidence);
    assert.equal(f.messages.includes('WAIT_FOR_MY_ADS_READY'),true);
  });
  await check('existing roster evidence remains valid and incomplete counts denied',async()=>{
    const edit={...editStatus,publicationEditEvidence:{state:'not-ready'}};
    const f=fixture({edit,presence:{...rosterFound,page:2}});
    await assert.rejects(proof(f),/KR_PUBLISH_INTENT_UNVERIFIED/);
  });
  // No P8 token is invented here; existing P8 adversarial tests remain.
  const original={fillId:'f',workflowId:'r',kind:'renewal',profileId:'P',sourceAdId:'123',targetTabId:42};
  const direct=(row,id)=>({fillId:row.fillId,workflowId:row.workflowId,kind:row.kind,
    profileId:row.profileId,sourceAdId:row.sourceAdId,newAdId:id,targetPresent:true,
    targetEvidence:'verified-edit-and-public-listing',targetEditAdId:id,targetPublicAdId:id});
  function journal(proofFactory){
    const rows={};let now=100;
    return Journal.create({storageLocal:{
      get:async keys=>Object.fromEntries((keys===null?Object.keys(rows):keys).filter(k=>Object.hasOwn(rows,k)).map(k=>[k,{...rows[k]}])),
      set:async entries=>Object.assign(rows,JSON.parse(JSON.stringify(entries)))},
      lockManager:{request:async(name,opts,fn)=>fn({name,mode:'exclusive'})},
      lockName:'kar-updater-global-admission-v1',workerInstanceId:'worker',
      clock:()=>++now,newToken:()=>'attempt',verifyRemoteOutcome:proofFactory});
  }
  await check('journal persists typed direct evidence, no fake roster page counts',async()=>{
    const j=journal(direct);await j.begin(original);
    const p=await j.resolveVerified({fillId:'f',newAdId:'456'});
    assert.equal(p.targetEditAdId,'456');assert.equal(p.targetPublicAdId,'456');
    assert.equal(p.targetPagesScanned,undefined);
    assert.equal((await j.observe('f')).state,'resolved');
  });
  await check('journal rejects edit-only, wrong ID and mixed invented roster counts',async()=>{
    for(const change of [{targetPublicAdId:undefined},{targetPublicAdId:'999'},{targetPagesScanned:1,targetFoundPage:1}]){
      const j=journal((r,id)=>({...direct(r,id),...change}));await j.begin(original);
      await assert.rejects(j.resolveVerified({fillId:'f',newAdId:'456'}),/KR_PUBLISH_INTENT_UNVERIFIED/);
      assert.equal((await j.observe('f')).state,'unverified');
    }
  });
  return {passed,failed};
}
module.exports=run;
if(require.main===module){
  const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
  let Service;
  vm.runInNewContext(fs.readFileSync('src/background/services/publish-intent-authorization-service.js','utf8'),{
    KRDeps:{register:(name,api)=>{Service=api;}}});
  run({Service,Journal:require('../src/background/services/auto-publish-intent-journal.js'),assert,URL})
    .then(r=>{console.log(JSON.stringify(r));if(r.failed)process.exitCode=1;})
    .catch(e=>{console.error(e);process.exitCode=1;});
}
