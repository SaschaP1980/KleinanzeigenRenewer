'use strict';
// KAR-175 Wave 2: observable API tests, no Kleinanzeigen network/account.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {webcrypto} = require('node:crypto');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root,'src/background/services/inventory-refresh-service.js'),'utf8');
const background = fs.readFileSync(path.join(root,'src/background/background.js'),'utf8');
const packaging = fs.readFileSync(path.join(root,'scripts/package.py'),'utf8');
const registered = new Map();
vm.runInNewContext(source,{
  crypto: webcrypto, KRDeps:{register(name,api){assert.equal(name,'KRInventoryRefreshService');assert.equal(registered.has(name),false);registered.set(name,api);}}
});
const owner = registered.get('KRInventoryRefreshService');
assert.equal(typeof owner?.create,'function');
assert.throws(() => owner.create({}),/requires complete/);
assert.match(background,/InventoryRefreshService\.create\(/);
assert.match(background,/return requireInventoryRefreshService\(\)\.refreshInventoryRecord\(message\)/);
assert.match(background,/return requireInventoryRefreshService\(\)\.checkInventoryOnlineStatus\(message\)/);
assert.match(packaging,/src\/background\/services\/inventory-refresh-service\.js/);
const rows = new Map(), events=[], writes=[], broadcasts=[], probes=[], closures=[];
let gateFailure=null, bulkState={status:'idle'}, renewals={}, failWait=false;
const options={
  getInventory:async id=>rows.get(id)||null,
  assertSelectedProfileMatchesLiveAccount:async args=>{if(gateFailure)throw gateFailure;assert.ok(args.expectedProfileId);},
  publicAvailabilityPending:row=>row.pending===true,
  getBulkRunState:async()=>bulkState,
  normalizeKnownPublicAdUrl:url=>String(url||''),
  publicUrlForInventoryRecord:row=>row.publicUrl||'',
  directPublicUrlForAdId:adId=>'https://www.kleinanzeigen.de/s-anzeige/dummy/'+adId,
  logDiagnostic:async (_level,event)=>{events.push(event);},
  probeFreshRenewalPublicUrl:async (url,adId,variant)=>{probes.push(variant);return {ok:variant==='canonical',resolvedUrl:url,publicUrlVariant:variant,metadata:{endDateDisplay:'01.01.2027'}};},
  mergeListingMetadata:(_row,existing)=>({...existing,mergedFromReadOnly:true}),
  publicAvailabilitySnapshot:obj=>({...obj}),
  putInventoryRecordOnly:async row=>{writes.push(row);},
  broadcastInventoryChanged:(...args)=>{broadcasts.push(args);},
  renewalEvidenceFailureClass:()=> 'temporarily-unavailable',
  readRenewalSessions:async()=>renewals,
  normalBrowserWindowId:async()=>77,
  createAutomationTab:async opts=>({id:opts.url.includes('bearbeiten')?101:102}),
  extractReadOnlyMetadata:async()=>({ok:true,metadata:{endDateDisplay:'01.01.2027'},durationMs:2}),
  waitForTabComplete:async()=>{if(failWait)throw Error('fixture worker timeout');},
  ensureContentConnection:async()=>{},
  sendTabRequestWithBootstrap:async()=>({adId:'123',images:[],title:'Existing'}),
  delay:async()=>{},
  requirePublicListingEvidenceService:()=>({readInventoryRefreshOwnAdsEndDate:async()=>null}),
  saveInventory:async (row,options)=>({...row,inventoryId:options.inventoryIdOverride,imageSummary:{discovered:0}}),
  normalizeRenewalMode:v=>v,
  compareRenewalRecords:async()=>({status:'match',mismatches:[],uncertainties:[]}),
  renewalOutcomeForComparison:()=>({status:'verified',stage:'replacement-ready'}),
  persistRenewalSession:async()=>{},
  sessionCorrelationContext:()=>({}),
  closeRegistryTabs:async (ids,why)=>{closures.push({ids,why});},
  RENEWAL_DIRECT_READONLY_TIMEOUT_MS:3500,
  READONLY_METADATA_TIMEOUT_MS:15000,
  TAB_LOAD_TIMEOUT_RENEWAL_MS:45000,
  BULK_RETRY_TIMEOUT_MS:90000,
  BULK_RETRY_POLL_MS:500,
  RENEWAL_MODE_SAFE:'safe'
};
const svc=owner.create(options);
assert.deepEqual(Object.keys(svc).sort(),['checkInventoryOnlineStatus','refreshInventoryRecord']);
(async()=>{
  await assert.rejects(svc.checkInventoryOnlineStatus({inventoryId:'absent'}),/nicht gefunden/);
  await assert.rejects(svc.refreshInventoryRecord({inventoryId:'absent'}),/nicht gefunden/);
  rows.set('bad',{adId:'wrong',profileId:'bound',pending:true});
  await assert.rejects(svc.checkInventoryOnlineStatus({inventoryId:'bad'}),/gültige Anzeigen-ID/);
  await assert.rejects(svc.refreshInventoryRecord({inventoryId:'bad'}),/gültige Anzeigen-ID/);
  rows.set('simple',{adId:'123',pending:false});
  const resolved=await svc.checkInventoryOnlineStatus({inventoryId:'simple'});
  assert.equal(resolved.alreadyResolved,true);
  rows.set('online',{adId:'123',profileId:'bound',profileName:'account@example.test',pending:true,publicUrl:'https://www.kleinanzeigen.de/s-anzeige/dummy/123',listingMeta:{}});
  gateFailure=Error('fixture account mismatch');
  await assert.rejects(svc.checkInventoryOnlineStatus({inventoryId:'online'}),/account mismatch/);
  gateFailure=null;
  bulkState={status:'running'};
  await assert.rejects(svc.checkInventoryOnlineStatus({inventoryId:'online'}),/laufenden Erfassung/);
  await assert.rejects(svc.refreshInventoryRecord({inventoryId:'online'}),/laufenden Erfassung/);
  bulkState={status:'idle'};
  let online=await svc.checkInventoryOnlineStatus({inventoryId:'online'});
  assert.equal(online.online,true); assert.equal(online.record.listingMeta.publicAvailability.status,'online');
  assert.ok(events.includes('INVENTORY_ONLINE_STATUS_CONFIRMED')); assert.deepEqual(probes.slice(-1),['canonical']);
  assert.equal(broadcasts.at(-1)[0],'inventory-online-status-confirmed');
  options.probeFreshRenewalPublicUrl=async()=>({ok:false,publicUrlVariant:'canonical'});
  const pendingSvc=owner.create(options);
  rows.set('pending',{adId:'123',pending:true,publicUrl:'https://www.kleinanzeigen.de/s-anzeige/dummy/123',listingMeta:{}});
  const pending=await pendingSvc.checkInventoryOnlineStatus({inventoryId:'pending'});
  assert.equal(pending.pending,true); assert.equal(pending.verificationClass,'temporarily-unavailable');
  assert.equal(pending.record.listingMeta.publicAvailability.status,'pending');
  assert.equal(broadcasts.at(-1)[0],'inventory-online-status-pending');

  renewals={one:{sourceInventoryId:'online',status:'running'}};
  await assert.rejects(svc.refreshInventoryRecord({inventoryId:'online'}),/Renewal-Vorgangs gesperrt/);
  renewals={};
  let refreshed=await svc.refreshInventoryRecord({inventoryId:'online'});
  assert.equal(refreshed.inventoryId,'online');assert.equal(refreshed.profileId,'bound');
  assert.equal(refreshed.listingMeta.mergedFromReadOnly,true);
  assert.ok(closures.some(x=>x.why==='inventory-refresh-worker-finished'));
  assert.ok(events.includes('INVENTORY_REFRESH_SUCCEEDED'));
  failWait=true;
  await assert.rejects(svc.refreshInventoryRecord({inventoryId:'online'}),/fixture worker timeout/);
  assert.equal(closures.at(-1).why,'inventory-refresh-worker-failed');
  assert.ok(events.includes('INVENTORY_REFRESH_FAILED'));
  console.log('PASS KAR-175 Wave 2: account/ID/lock gates, read-only online confirmed/pending, refresh and fail-safe tab cleanup');
})().catch(error=>{console.error(error);process.exitCode=1;});
