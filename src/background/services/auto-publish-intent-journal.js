// KAR-99 P6: immutable before-click publication intent and independent outcome.
// Never infer an outcome from navigation, local session state, or client claims.
(() => {
  'use strict';
  const PREFIX='karAutoPublishIntentV1_';
  const RESOLUTION_PREFIX='karAutoPublishVerifiedResolutionV1_';
  const SHARED_LOCK_NAME='kar-updater-global-admission-v1';
  const P8_START='karAtomicAdmissionStartV1_';
  const P8_FINISH='karAtomicAdmissionFinishV1_';
  const P8_ALLOWED=new Set([
    'AUTONOMOUS:renewal-publish-detection',
    'AUTONOMOUS:trash-publish-detection',
    'AUTONOMOUS:archive-postpublish-detached',
    'AUTHORIZE_AUTOMATIC_PUBLISH'
  ]);
  const denied=code=>Object.assign(new Error(code),{code});
  const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
  const id=v=>typeof v==='string'&&/^[A-Za-z0-9_-]{1,128}$/.test(v);
  const adId=v=>typeof v==='string'&&/^\d+$/.test(v);
  const same=(a,b)=>object(a)&&object(b)&&Object.keys(a).length===Object.keys(b).length
    &&Object.keys(a).every(k=>a[k]===b[k]);
  function validIntent(key,row){
    return object(row)&&row.schema===1&&row.state==='outcome-unverified'
      &&id(row.fillId)&&id(row.workflowId)&&id(row.attemptId)&&id(row.workerInstanceId)
      &&['renewal','archive'].includes(row.kind)
      &&typeof row.profileId==='string'&&Boolean(row.profileId.trim())&&row.profileId.length<=256
      &&Number.isSafeInteger(row.targetTabId)&&row.targetTabId>0
      &&(adId(row.sourceAdId)||(row.kind==='archive'&&row.sourceAdId===''))
      &&Number.isSafeInteger(row.createdAtMs)&&row.createdAtMs>=0
      &&(row.admissionToken===undefined||
        (id(row.admissionToken)&&row.admissionToken.length>=12))
      &&key===PREFIX+row.fillId+'_'+row.attemptId;
  }
  function validResolution(key,row,intent){
    return object(row)&&validIntent(PREFIX+intent?.fillId+'_'+intent?.attemptId,intent)
      &&row.schema===1&&row.state==='resolved-confirmed'
      &&row.fillId===intent.fillId&&row.workflowId===intent.workflowId
      &&row.attemptId===intent.attemptId&&row.kind===intent.kind
      &&row.profileId===intent.profileId&&row.sourceAdId===intent.sourceAdId
      &&row.targetTabId===intent.targetTabId&&adId(row.newAdId)
      &&row.newAdId!==intent.sourceAdId&&row.targetPresent===true
      &&row.targetEvidence==='found-in-my-ads-full-pagination-scan'
      &&Number.isSafeInteger(row.targetPagesScanned)&&row.targetPagesScanned>=1
      &&Number.isSafeInteger(row.targetFoundPage)&&row.targetFoundPage>=1
      &&Number.isSafeInteger(row.verifiedAtMs)&&row.verifiedAtMs>=intent.createdAtMs
      &&key===RESOLUTION_PREFIX+row.fillId+'_'+row.attemptId;
  }
  function create({storageLocal,lockManager,lockName,workerInstanceId,clock,newToken,
    verifyRemoteOutcome=null}={}){
    if(typeof storageLocal?.get!=='function'||typeof storageLocal?.set!=='function'
       ||typeof clock!=='function'||typeof newToken!=='function'||!id(workerInstanceId))
      throw denied('KR_PUBLISH_INTENT_STORAGE');
    async function read(keys){
      try{const v=await storageLocal.get(keys);if(!object(v))throw Error('invalid read');return v;}
      catch{throw denied('KR_PUBLISH_INTENT_STORAGE');}
    }
    function snapshot(rows,fillId){
      const attempts=new Map(),resolutions=new Map();
      for(const [key,row] of Object.entries(rows)){
        if(key.startsWith(PREFIX)){
          if(!validIntent(key,row))throw denied('KR_PUBLISH_INTENT_CORRUPT');
          attempts.set(key.slice(PREFIX.length),row);
        }else if(key.startsWith(RESOLUTION_PREFIX)){
          resolutions.set(key.slice(RESOLUTION_PREFIX.length),row);
        }
      }
      for(const [suffix,row] of resolutions){
        if(!validResolution(RESOLUTION_PREFIX+suffix,row,attempts.get(suffix)))
          throw denied('KR_PUBLISH_INTENT_CORRUPT');
      }
      const matching=[...attempts.values()].filter(v=>v.fillId===fillId);
      const resolved=[...resolutions.values()].filter(v=>v.fillId===fillId);
      if(matching.length>1||resolved.length>1)
        throw denied('KR_PUBLISH_INTENT_CORRUPT');
      return Object.freeze({
        state:matching.length?(resolved.length?'resolved':'unverified'):'missing',
        attempts:Object.freeze(matching.map(v=>Object.freeze({...v}))),
        resolutions:Object.freeze(resolved.map(v=>Object.freeze({...v})))
      });
    }
    async function observe(fillId){
      if(!id(fillId))throw denied('KR_PUBLISH_INTENT_IDENTITY');
      return snapshot(await read(null),fillId);
    }
    async function atomic(task){
      if(typeof lockManager?.request!=='function'||lockName!==SHARED_LOCK_NAME)
        throw denied('KR_PUBLISH_INTENT_ATOMIC_UNAVAILABLE');
      try{
        return await lockManager.request(SHARED_LOCK_NAME,{mode:'exclusive',ifAvailable:true},
          async lock=>{if(!lock)throw denied('KR_PUBLISH_INTENT_ATOMIC_BUSY');return task();});
      }catch(e){
        if(typeof e?.code==='string'&&e.code.startsWith('KR_PUBLISH_INTENT_'))throw e;
        throw denied('KR_PUBLISH_INTENT_ATOMIC_UNAVAILABLE');
      }
    }
    async function durable(key,entry){
      try{await storageLocal.set({[key]:entry});}
      catch{throw denied('KR_PUBLISH_INTENT_STORAGE');}
      if(!same((await read([key]))[key],entry))throw denied('KR_PUBLISH_INTENT_STORAGE');
    }
    async function verifiedAdmissionToken(reference,createdAtMs){
      if(!object(reference)||!Object.isFrozen(reference)
         ||reference.schema!==1||reference.state!=='admitted'
         ||!id(reference.token)||reference.token.length<12
         ||reference.workerInstanceId!==workerInstanceId
         ||!P8_ALLOWED.has(reference.operationType)
         ||!Number.isSafeInteger(reference.startedAtMs)
         ||reference.startedAtMs<0||reference.startedAtMs>createdAtMs)
        throw denied('KR_PUBLISH_INTENT_ADMISSION_UNVERIFIED');
      // Same origin lock as P8 start/finish; no user-supplied or stale
      // token can substitute for a storage-acknowledged live admission.
      const rows=await read([P8_START+reference.token,P8_FINISH+reference.token]);
      if(!same(rows[P8_START+reference.token],reference)
        ||rows[P8_FINISH+reference.token]!==undefined)
        throw denied('KR_PUBLISH_INTENT_ADMISSION_UNVERIFIED');
      return reference.token;
    }
    async function begin({fillId,workflowId,kind,profileId,sourceAdId,targetTabId,
      admissionReceipt=null}={}){
      if(!id(fillId)||!id(workflowId)||!['renewal','archive'].includes(kind)
         ||typeof profileId!=='string'||!profileId.trim()||profileId.length>256
         ||!Number.isSafeInteger(targetTabId)||targetTabId<=0
         ||!(adId(sourceAdId)||(kind==='archive'&&sourceAdId==='')))
        throw denied('KR_PUBLISH_INTENT_IDENTITY');
      return atomic(async()=>{
        const rows=await read(null);
        if(snapshot(rows,fillId).attempts.length)throw denied('KR_PUBLISH_INTENT_UNRESOLVED');
        let attemptId;
        try{attemptId=newToken();}catch{throw denied('KR_PUBLISH_INTENT_IDENTITY');}
        const createdAtMs=clock();
        if(!id(attemptId)||!Number.isSafeInteger(createdAtMs)||createdAtMs<0)
          throw denied('KR_PUBLISH_INTENT_IDENTITY');
        const key=PREFIX+fillId+'_'+attemptId;
        if(Object.hasOwn(rows,key))throw denied('KR_PUBLISH_INTENT_UNRESOLVED');
        const admissionToken=admissionReceipt===null?null
          :await verifiedAdmissionToken(admissionReceipt,createdAtMs);
        const entry=Object.freeze({schema:1,state:'outcome-unverified',fillId,workflowId,
          kind,profileId,sourceAdId,targetTabId,attemptId,workerInstanceId,createdAtMs,
          ...(admissionToken?{admissionToken}:{})});
        await durable(key,entry);
        const after=await observe(fillId);
        if(after.attempts.length!==1||!same(after.attempts[0],entry))
          throw denied('KR_PUBLISH_INTENT_STORAGE');
        return entry;
      });
    }
    async function resolveVerified({fillId,newAdId}={}){
      if(!id(fillId)||!adId(newAdId))throw denied('KR_PUBLISH_INTENT_IDENTITY');
      const intent=await atomic(async()=>{
        const state=await observe(fillId);
        if(state.attempts.length!==1)throw denied('KR_PUBLISH_INTENT_UNRESOLVED');
        if(state.attempts[0].sourceAdId===newAdId)throw denied('KR_PUBLISH_INTENT_IDENTITY');
        if(state.resolutions.length&&state.resolutions[0].newAdId!==newAdId)
          throw denied('KR_PUBLISH_INTENT_UNRESOLVED');
        return state.attempts[0];
      });
      if(typeof verifyRemoteOutcome!=='function')throw denied('KR_PUBLISH_INTENT_UNVERIFIED');
      let proof;
      try{proof=await verifyRemoteOutcome(Object.freeze({...intent}),newAdId);}
      catch{throw denied('KR_PUBLISH_INTENT_UNVERIFIED');}
      if(!object(proof)||proof.fillId!==intent.fillId||proof.workflowId!==intent.workflowId
        ||proof.kind!==intent.kind||proof.profileId!==intent.profileId
        ||proof.sourceAdId!==intent.sourceAdId||proof.newAdId!==newAdId
        ||proof.targetPresent!==true||proof.targetEvidence!=='found-in-my-ads-full-pagination-scan'
        ||!Number.isSafeInteger(proof.targetPagesScanned)||proof.targetPagesScanned<1
        ||!Number.isSafeInteger(proof.targetFoundPage)||proof.targetFoundPage<1)
        throw denied('KR_PUBLISH_INTENT_UNVERIFIED');
      return atomic(async()=>{
        const after=await observe(fillId);
        if(after.attempts.length!==1||!same(after.attempts[0],intent))
          throw denied('KR_PUBLISH_INTENT_UNRESOLVED');
        if(after.resolutions.length){
          if(after.resolutions[0].newAdId!==newAdId)
            throw denied('KR_PUBLISH_INTENT_UNRESOLVED');
          return after.resolutions[0]; // independently reverified, immutable.
        }
        const verifiedAtMs=clock();
        if(!Number.isSafeInteger(verifiedAtMs)||verifiedAtMs<intent.createdAtMs)
          throw denied('KR_PUBLISH_INTENT_IDENTITY');
        const result=Object.freeze({schema:1,state:'resolved-confirmed',
          fillId:intent.fillId,workflowId:intent.workflowId,kind:intent.kind,
          profileId:intent.profileId,sourceAdId:intent.sourceAdId,
          targetTabId:intent.targetTabId,attemptId:intent.attemptId,newAdId,
          targetPresent:true,targetEvidence:proof.targetEvidence,
          targetPagesScanned:proof.targetPagesScanned,targetFoundPage:proof.targetFoundPage,
          verifiedAtMs});
        const key=RESOLUTION_PREFIX+intent.fillId+'_'+intent.attemptId;
        if((await read([key]))[key]!==undefined)
          throw denied('KR_PUBLISH_INTENT_UNRESOLVED');
        await durable(key,result);
        if(!validResolution(key,result,intent)
          ||!same((await observe(fillId)).resolutions[0],result))
          throw denied('KR_PUBLISH_INTENT_STORAGE');
        return result;
      });
    }
    return Object.freeze({begin,observe,resolveVerified});
  }
  const API=Object.freeze({create,KEY_PREFIX:PREFIX,RESOLUTION_KEY_PREFIX:RESOLUTION_PREFIX});
  globalThis.KRDeps?.register?.('KRAutoPublishIntentJournal',API);
  if(typeof module!=='undefined'&&module?.exports)module.exports=API;
})();
