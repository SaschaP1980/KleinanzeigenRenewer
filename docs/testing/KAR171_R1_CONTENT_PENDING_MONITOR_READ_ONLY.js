// KAR-171 R1 — passive, independent observer for the PRIVATE v1.25.22
// content-script receipt. This is a NONPACKAGED developer diagnostic; DO NOT
// execute on the owner's Chrome without a separately approved native protocol.
// Open only in DevTools of the installed extension's APP WINDOW, NOT the MV3
// service worker, content page, another extension, or a browser-wide console.
// Start BEFORE the owner-controlled private scan (separate worker DevTools).
//
// LIMITS: An observed, recent nonterminal receipt means an *unsettled
// candidate at the instant this independent listener last saw it*.
// It cannot prove a pending request at the precise later worker STOP instant.
// No Stop/Start/Reload, website request, P8 decision or updater authority.
// Nothing here reads stored personal data, logs IDs/nonces, or writes storage.
(() => {
  'use strict';
  const TAG='KAR171_R1_CONTENT_PENDING_MONITOR_V1';
  const EXT='hafahjhhgiipdegfkgacchmnacgblnah';
  const VERSION='1.25.23';
  const KEY='kar171R1ContentWitnessV1';
  const GLOBAL='__KAR171_R1_PENDING_MONITOR__';
  const MAX_AGE_MS=1200;
  const MAX_EVENT_AGE_MS=30000;
  const MAX_FUTURE_MS=5000;
  const MAX_LIFETIME_MS=180000;
  const STATES=new Set(['received','page-confirmed','held-pending','settled','failed']);
  const KINDS=new Set(['source','target']);
  const FIELDS=[
    'expectedOnline','kind','nonce','observedAtMs','pagesScanned',
    'schema','state','uniqueCards','workerId'
  ].join(',');
  const HOLD_FIELDS=[
    'expectedOnline','holdUntilMs','kind','nonce','observedAtMs',
    'pagesScanned','schema','state','uniqueCards','workerId'
  ].join(',');
  const output=(status,kind=null,pagesScanned=null)=>console.info(TAG,JSON.stringify({
    status,
    kind:KINDS.has(kind)?kind:null,
    pagesScanned:Number.isSafeInteger(pagesScanned)?pagesScanned:null,
    observerOnly:true,ownerNativeScan:false,
    r1Accepted:false,eligibleForLease:false
  }));
  const correctContext=typeof chrome!=='undefined'
    && chrome?.runtime?.id===EXT
    && chrome?.runtime?.getManifest?.()?.version===VERSION
    && typeof location!=='undefined'
    && location.protocol==='chrome-extension:'
    && location.hostname===EXT
    && location.pathname==='/src/app/app.html'
    && typeof document!=='undefined'
    && typeof chrome?.storage?.onChanged?.addListener==='function'
    && typeof chrome?.storage?.onChanged?.removeListener==='function';
  if(!correctContext){output('WRONG_CONTEXT_OR_VERSION');return;}
  if(globalThis[GLOBAL]){output('MONITOR_ALREADY_ARMED');return;}

  let last=null,ambiguous=false,closed=false,expiry=null;
  const isTerminal=x=>x?.state==='settled'||x?.state==='failed';
  const valid=row=>{
    if(!row||typeof row!=='object'||Array.isArray(row)
       ||Object.keys(row).sort().join(',')!==(row.state==='held-pending'
         ? HOLD_FIELDS : FIELDS)
       ||row.schema!==(row.state==='held-pending' ? 2 : 1)
       ||!KINDS.has(row.kind)||!STATES.has(row.state)
       ||typeof row.nonce!=='string'||!/^[0-9a-f]{32}$/.test(row.nonce)
       ||typeof row.workerId!=='string'
       ||!/^[A-Za-z0-9_-]{1,128}$/.test(row.workerId)
       ||!Number.isSafeInteger(row.observedAtMs)
       ||!Number.isSafeInteger(row.pagesScanned)||row.pagesScanned<0
       ||!Number.isSafeInteger(row.uniqueCards)||row.uniqueCards<0
       ||!(row.expectedOnline===null
         ||(Number.isSafeInteger(row.expectedOnline)
           &&row.expectedOnline>=row.uniqueCards))
       ||row.observedAtMs<Date.now()-MAX_EVENT_AGE_MS
       ||row.observedAtMs>Date.now()+MAX_FUTURE_MS)
      return false;
    if(row.state==='received' && (row.pagesScanned!==0
       ||row.uniqueCards!==0 ||row.expectedOnline!==null))return false;
    if(row.state==='page-confirmed' && (row.pagesScanned<1
       ||!Number.isSafeInteger(row.expectedOnline)))return false;
    if(row.state==='held-pending' && (
       row.pagesScanned!==1
       ||!Number.isSafeInteger(row.expectedOnline)
       ||!Number.isSafeInteger(row.holdUntilMs)
       ||row.holdUntilMs-row.observedAtMs<43000
       ||row.holdUntilMs-row.observedAtMs>46000))return false;
    return true;
  };
  const invalidate=status=>{ambiguous=true;output(status);};
  const onChanged=(changes,areaName)=>{
    if(closed||areaName!=='local'
       ||!changes||!Object.hasOwn(changes,KEY))return;
    const row=changes[KEY]?.newValue;
    if(!valid(row)){invalidate('UNVERIFIED_MALFORMED_OR_STALE_CONTENT');return;}
    if(ambiguous)return;
    if(row.state==='received'){
      if(last&&!isTerminal(last)){
        invalidate('UNVERIFIED_CONCURRENT_OR_MISSING_TERMINAL');
        return;
      }
      last=row;
      output('CONTENT_RECEIVED_UNSETTLED',row.kind,row.pagesScanned);
      return;
    }
    if(!last || last.nonce!==row.nonce
       ||last.workerId!==row.workerId||last.kind!==row.kind
       ||isTerminal(last)||row.observedAtMs<last.observedAtMs
       ||row.pagesScanned<last.pagesScanned
       ||row.uniqueCards<last.uniqueCards
       ||(last.expectedOnline!==null
          &&row.expectedOnline!==last.expectedOnline)){
      invalidate('UNVERIFIED_NONMONOTONIC_CONTENT');
      return;
    }
    if(last.state==='held-pending' && row.state!=='failed'){
      invalidate('UNVERIFIED_NONMONOTONIC_CONTENT');return;
    }
    if(row.state==='held-pending'){
      if(last.state!=='page-confirmed'
         ||row.pagesScanned!==last.pagesScanned
         ||row.uniqueCards!==last.uniqueCards
         ||row.expectedOnline!==last.expectedOnline
         ||row.holdUntilMs<=Date.now()+1000){
        invalidate('UNVERIFIED_NONMONOTONIC_CONTENT');return;
      }
      last=row;
      output('CONTROLLED_HOLD_ARMED',row.kind,row.pagesScanned);
      return;
    }
    if(row.state==='page-confirmed'){
      if(row.pagesScanned<=last.pagesScanned){
        invalidate('UNVERIFIED_NONMONOTONIC_CONTENT');return;
      }
      last=row;
      output('PAGE_CONFIRMED_UNSETTLED',row.kind,row.pagesScanned);
      return;
    }
    if(row.pagesScanned!==last.pagesScanned
       ||row.uniqueCards!==last.uniqueCards
       ||row.expectedOnline!==last.expectedOnline
       ||(row.state==='settled' && last.state!=='page-confirmed')){
      invalidate('UNVERIFIED_NONMONOTONIC_CONTENT');
      return;
    }
    last=row;
    output(row.state==='settled'?'CONTENT_SETTLED':'CONTENT_FAILED',
      row.kind,row.pagesScanned);
  };
  const snapshot=()=>{
    const recent=last&&!isTerminal(last)
      &&Date.now()-last.observedAtMs>=0
      &&Date.now()-last.observedAtMs<=MAX_AGE_MS;
    const controlled=last?.state==='held-pending'
      &&Date.now()-last.observedAtMs>=0
      &&Date.now()-last.observedAtMs<=MAX_EVENT_AGE_MS
      &&Date.now()+1000<last.holdUntilMs;
    const status=ambiguous?'AMBIGUOUS_EVIDENCE'
      :controlled?'CONTROLLED_HOLD_WINDOW_CANDIDATE_ONLY'
      :recent?'RECENT_UNSETTLED_CANDIDATE_ONLY'
      :'NO_LIVE_PENDING_WINDOW';
    output(status,last?.kind||null,last?.pagesScanned??null);
    return Object.freeze({
      status,
      observerOnly:true,ownerNativeScan:false,
      r1Accepted:false,eligibleForLease:false
    });
  };
  const stop=(reason='MONITOR_STOPPED')=>{
    if(closed)return;
    closed=true;
    if(expiry!==null)clearTimeout(expiry);
    chrome.storage.onChanged.removeListener(onChanged);
    delete globalThis[GLOBAL];
    output(reason);
  };
  // No storage.get(null), no storage writes, no runtime.sendMessage and
  // no automatic user-application or Chrome-worker intervention.
  chrome.storage.onChanged.addListener(onChanged);
  globalThis[GLOBAL]=Object.freeze({snapshot,stop:()=>stop()});
  expiry=setTimeout(()=>stop('MONITOR_EXPIRED'),MAX_LIFETIME_MS);
  output('MONITOR_ARMED');
})();
// Monitor use (after separate approval only):
// globalThis.__KAR171_R1_PENDING_MONITOR__?.snapshot();
// globalThis.__KAR171_R1_PENDING_MONITOR__?.stop();
