'use strict';
async function run({Journal,Dialog,assert,AbortController}){
  let passed=0,failed=0;
  async function check(name,fn){try{await fn();passed++;console.log('PASS '+name);}catch(e){failed++;console.log('FAIL '+name+': '+e.message);}}
  const LOCK='kar-updater-global-admission-v1';
  const intent={fillId:'f',workflowId:'r',kind:'renewal',profileId:'P',sourceAdId:'123',targetTabId:42};
  function fixture(opts={}){
    let rows={},writes=0,closed=0,remoteReads=0,commitReads=0,queued=0,requests=0;
    const events=[];
    const api=Journal.create({
      storageLocal:{get:async keys=>Object.fromEntries((keys===null?Object.keys(rows):keys).filter(k=>Object.hasOwn(rows,k)).map(k=>[k,{...rows[k]}])),set:async v=>{writes++;Object.assign(rows,v);}},
      lockName:LOCK,workerInstanceId:'worker',clock:()=>2000,newToken:()=>'attempt',
      resolveLockWaitMs:40,
      lockManager:{request:async(name,options,fn)=>{
        requests++;assert.equal(name,LOCK);assert.equal(options.mode,'exclusive');
        if(requests===1){assert.equal(options.ifAvailable,true);return fn({name,mode:'exclusive'});}
        assert.equal(options.ifAvailable,undefined);assert.ok(options.signal);
        queued++;
        if(opts.timeout&&queued===2)return new Promise((resolve,reject)=>{
          options.signal.addEventListener('abort',()=>reject(Object.assign(Error('aborted'),{name:'AbortError'})),{once:true});
        });
        if(opts.late&&queued===2){
          return new Promise((resolve,reject)=>{
            options.signal.addEventListener('abort',()=>Promise.resolve(fn({name,mode:'exclusive'})).then(resolve,reject),{once:true});
          });
        }
        if(opts.changed&&queued===2)opts.accountValid=false;
        return fn({name,mode:'exclusive'});
      }},
      verifyRemoteOutcome:async(row,id)=>{remoteReads++;return {fillId:row.fillId,workflowId:row.workflowId,kind:row.kind,profileId:row.profileId,sourceAdId:row.sourceAdId,newAdId:id,targetPresent:true,targetEvidence:'verified-edit-and-public-listing',targetEditAdId:id,targetPublicAdId:id};},
      requireCommitContext:true,prepareCommitContext:async()=>({tabId:21,close:async()=>{closed++;}}),
      verifyCommitContext:async()=>{commitReads++;return opts.accountValid!==false;},
      onSample:x=>events.push(x)
    });
    return {api,events,get writes(){return writes;},get closed(){return closed;},get queued(){return queued;},get commitReads(){return commitReads;},get remoteReads(){return remoteReads;}};
  }
  async function begin(f){await f.api.begin(intent);return f;}
  const resolve=f=>f.api.resolveVerified({fillId:'f',newAdId:'456'});
  await check('queued resolution uses same lock, commits exactly once, and closes witness',async()=>{
    const f=await begin(fixture());const r=await resolve(f);
    assert.equal(r.newAdId,'456');assert.equal(f.queued,2);assert.equal(f.writes,2);assert.equal(f.closed,1);assert.equal(f.commitReads,1);assert.equal(f.remoteReads,1);
    assert.equal((await f.api.observe('f')).state,'resolved');
  });
  await check('queued write deadline is fail closed, no callback or positive receipt',async()=>{
    const f=await begin(fixture({timeout:true}));await assert.rejects(resolve(f),/KR_PUBLISH_INTENT_ATOMIC_BUSY/);
    assert.equal(f.writes,1);assert.equal(f.closed,1);assert.equal(f.commitReads,0);
    assert.equal((await f.api.observe('f')).state,'unverified');
  });
  await check('late callback after deadline cannot enter critical section',async()=>{
    const f=await begin(fixture({late:true}));await assert.rejects(resolve(f),/KR_PUBLISH_INTENT_ATOMIC_BUSY/);
    assert.equal(f.writes,1);assert.equal(f.closed,1);assert.equal(f.commitReads,0);
  });
  await check('changed account after queue wait is denied by real final witness',async()=>{
    const f=await begin(fixture({changed:true}));await assert.rejects(resolve(f),/KR_PUBLISH_INTENT_UNVERIFIED/);
    assert.equal(f.writes,1);assert.equal(f.closed,1);assert.equal(f.commitReads,1);
  });
  function beginFixture(mode,kind='renewal'){
    const rows={},events=[];let writes=0,requests=0,late=null;
    const reference=Object.freeze({schema:1,state:'admitted',token:'fixture-p8-token-long',workerInstanceId:'worker',operationType:'AUTHORIZE_AUTOMATIC_PUBLISH',startedAtMs:1000});
    rows['karAtomicAdmissionStartV1_'+reference.token]=reference;
    const api=Journal.create({storageLocal:{get:async keys=>Object.fromEntries((keys===null?Object.keys(rows):keys).filter(k=>Object.hasOwn(rows,k)).map(k=>[k,rows[k]])),set:async v=>{writes++;Object.assign(rows,v);}},
      lockName:LOCK,workerInstanceId:'worker',clock:()=>2000,newToken:()=>'queued-begin',
      beginLockWaitMs:35,resolveLockWaitMs:40,onSample:e=>events.push(e),
      lockManager:{request:async(name,options,fn)=>{
        requests++;if(options.ifAvailable)return fn(null);
        assert.equal(name,LOCK);assert.equal(options.mode,'exclusive');assert.ok(options.signal);
        if(mode==='timeout'){late=()=>fn({name,mode:'exclusive'});return new Promise((_,reject)=>options.signal.addEventListener('abort',()=>reject(Error('abort')),{once:true}));}
        if(mode==='finished')rows['karAtomicAdmissionFinishV1_'+reference.token]={state:'completed'};
        return fn({name,mode:'exclusive'});
      }}});
    return {api,begin:()=>api.begin({...intent,kind,sourceAdId:kind==='archive'?'':intent.sourceAdId,admissionReceipt:reference}),get writes(){return writes;},get requests(){return requests;},get late(){return late;},events};
  }
  await check('queued pre-click acquisition preserves one durable P8 intent for single/mass renewal and ZIP archive',async()=>{
    for(const kind of ['renewal','archive']){
      const f=beginFixture('available',kind);assert.equal((await f.begin()).admissionToken,'fixture-p8-token-long');
      assert.equal(f.requests,1);assert.equal(f.writes,1);
      await assert.rejects(f.begin(),/KR_PUBLISH_INTENT_UNRESOLVED/);assert.equal(f.writes,1);
    }
  });
  await check('pre-click queue timeout and late callback cannot write or authorize',async()=>{
    const f=beginFixture('timeout');await assert.rejects(f.begin(),/KR_PUBLISH_INTENT_ATOMIC_BUSY/);
    assert.equal(f.requests,1);assert.equal(f.writes,0);assert.equal(typeof f.late,'function');
    await assert.rejects(f.late(),/KR_PUBLISH_INTENT_ATOMIC_BUSY/);assert.equal((await f.api.observe('f')).state,'missing');
  });
  await check('pre-click queue rechecks original P8 admission after waiting',async()=>{
    const f=beginFixture('finished');await assert.rejects(f.begin(),/KR_PUBLISH_INTENT_ADMISSION_UNVERIFIED/);assert.equal(f.writes,0);
  });
  function ui(){
    function el(){const classes=new Set();return {textContent:'',dataset:{},classList:{add:(...xs)=>xs.forEach(x=>classes.add(x)),remove:(...xs)=>xs.forEach(x=>classes.delete(x)),toggle:(x,v)=>v?classes.add(x):classes.delete(x),contains:x=>classes.has(x)}};}
    const phases=[1,2,3,4].map(n=>{const e=el();e.dataset.phase=n;return e;});
    const elements=Object.fromEntries(['renewalStartDialogTitle','renewalProgressMessage','renewalProgressMessageTitle','renewalProgressMessageText','renewalBackgroundHint','renewalProgressShortcut','renewalProgressShortcutTitle','renewalProgressShortcutText'].map(k=>[k,el()]));
    elements.renewalStartSteps={querySelectorAll:()=>phases};
    const activities=[];
    const dialog=Dialog.create({elements,publishUiActivity:x=>activities.push(x)});
    const show=(state,reason,mode='fast',status='submitted',stage='publish-submitted')=>dialog.showProgress({adId:null,renewal:{renewalId:'r',status,stage,renewalMode:mode,publishResolutionState:state,publishResolutionReason:reason}});
    return {elements,phases,activities,show};
  }
  await check('blocked lock state is red in phase 1 and hides running hint in both modes',()=>{
    for(const mode of ['fast','safe']){
      const f=ui();f.show('blocked','lock-busy',mode);
      assert.ok(f.phases[0].classList.contains('phase-error'));
      assert.ok(f.elements.renewalProgressMessage.classList.contains('error'));
      assert.ok(f.elements.renewalBackgroundHint.classList.contains('hidden'));
      assert.ok(f.elements.renewalProgressMessageText.textContent.includes('nicht erneut'));
      assert.equal(f.activities.at(-1).active,false);
      assert.ok(f.phases[2].classList.contains('phase-pending'));
      assert.ok(f.phases[3].classList.contains('phase-pending'));
    }
  });
  await check('retrying is visibly waiting, not a false publication success',()=>{
    const f=ui();f.show('retrying','lock-busy');
    assert.ok(f.phases[0].classList.contains('phase-waiting'));
    assert.ok(f.elements.renewalProgressMessage.classList.contains('waiting'));
    assert.equal(f.activities.at(-1).active,true);
  });
  await check('failed verification is not reported as ongoing publication',()=>{
    const f=ui();f.show('blocked','verification-failed');
    assert.ok(f.elements.renewalProgressMessage.classList.contains('error'));
    assert.ok(f.elements.renewalProgressMessageTitle.textContent.includes('blockiert'));
  });
  await check('normal submitted state and subsequent verified phase remain intact',()=>{
    const f=ui();f.show(null,null);assert.ok(f.phases[0].classList.contains('phase-active'));
    f.show('blocked','lock-busy','fast','verifying','fast-my-ads-checking');
    assert.ok(f.phases[0].classList.contains('phase-success'));assert.ok(f.phases[2].classList.contains('phase-active'));
  });
  return {passed,failed};
}
module.exports=run;
if(require.main===module)run({Journal:require('../src/background/services/auto-publish-intent-journal.js'),Dialog:require('../src/app/renewal-dialog-controller.js'),assert:require('node:assert/strict'),AbortController}).then(r=>{console.log(JSON.stringify(r));if(r.failed)process.exitCode=1;}).catch(e=>{console.error(e);process.exitCode=1;});
