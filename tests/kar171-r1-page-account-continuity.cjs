// KAR-171 R1: an authenticated My Ads result must not cross account changes between pages.
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
let moduleApi = null;
const previous = globalThis.KRDeps;
globalThis.KRDeps = {register(name, api) {
  if (name === 'KRInventoryDeleteOperations') moduleApi = api;
}};
require('../src/content/inventory-delete-operations.js');
globalThis.KRDeps = previous;
assert.ok(moduleApi?.create, 'real content-script implementation is available');

const background = fs.readFileSync('src/background/services/remote-delete-replacement-service.js', 'utf8');
const publisher = fs.readFileSync('src/background/services/publish-intent-authorization-service.js', 'utf8');
const runner = fs.readFileSync('src/content/inventory-runner.js', 'utf8');
let count = 0;
const ok = (condition, description) => {assert.ok(condition, description);count++;};
function fixture({changedAt='',missingName=false,absent=false,reportedOnline=2,
  missingHeader=false,onlineCountDrift=false,missingNext=false,duplicate=false,zero=false}={}) {
  let page = 1, profile = missingName ? '' : 'Real Profile', mutations = 0, log = [];
  // Mimic the actual My Ads header at each pagination boundary. A temporary
  // disappearance of the next-page control must not prove full exhaustion.
  globalThis.document = {body:{get innerText() {
    if (missingHeader) return '';
    const online = onlineCountDrift && page === 2 ? reportedOnline + 1 : reportedOnline;
    return online + ' Anzeigen online';
  }}};
  const ops = moduleApi.create({
    MAX_PHASE4_PAGES: 3,
    sleep: async () => {},
    normalize: value => String(value || '').trim(),
    normalizeKey: value => String(value || '').trim().toLocaleLowerCase('de-DE'),
    diagnostic: () => {},
    isMyAdsProjectsUrl: () => true,
    currentPageNumber: () => page,
    pageFingerprint: () => 'page-' + page,
    nextPageButton: () => missingNext && page === 1 ? null : ({click() {page++; if (changedAt === 'navigation') profile = 'Other Account';}}),
    isDisabledControl: next => !next || (zero ? page >= 1 : page >= 2),
    waitForPageChange: async () => true,
    waitForListings: async () => {
      if (changedAt === 'wait-page-1' && page === 1) profile = 'Other Account';
      if (changedAt === 'wait-page-2' && page === 2) profile = 'Other Account';
      log.push({page,profile});
      if (zero) return [];
      if (duplicate) return [{adId:'1234',root:{}}];
      if (page === 1) return [{adId:'1234',root:{}}];
      if (page === 2) return [{adId:absent ? '2222' : '5678',root:{}}];
      return [];
    },
    detectedProfileName: () => profile,
    parseOnlineCount: () => ({online:1})
  });
  return {
    ops,log,
    get mutations() {return mutations;},
    async find(expectedProfileName='Real Profile') {
      return ops.findOwnAdById('5678',{}, {expectedProfileName});
    },
    async absent(expectedProfileName='Real Profile') {
      return ops.verifyOwnAdAbsentById('5678',{}, {expectedProfileName});
    }
  };
}
(async () => {
  const oldLocation = globalThis.location, oldDocument = globalThis.document;
  globalThis.document = {};
  globalThis.location = {href:'https://www.kleinanzeigen.de/m-meine-anzeigen.html?tab=PROJECTS'};
  try {
    const valid=fixture();
    const found=await valid.find();
    ok(found.found===true&&found.page===2&&found.pagesScanned===2,
      'read-only, exact-Ad-ID full-pagination result on a stable account');
    const absent=fixture({absent:true});
    const verified=await absent.absent();
    ok(verified.verified===true&&verified.pagesScanned===2,
      'read-only full-pagination absence on a stable account');
    ok((await fixture({zero:true,reportedOnline:0}).absent()).verified===true,
      'genuine zero-online roster allows verified absence only after stable exhaustion');
    for (const [description, settings] of [
      ['truncated roster against My Ads online count', {absent:true,reportedOnline:3}],
      ['missing My Ads online count', {absent:true,missingHeader:true}],
      ['pagination header count drifts', {absent:true,onlineCountDrift:true}],
      ['lost next-page control while online ads remain', {missingNext:true}],
      ['repeated ad IDs across separate pages', {absent:true,duplicate:true}]
    ]) {
      await assert.rejects(fixture(settings).absent(),
        /KR_MY_ADS_ROSTER_INCOMPLETE/,
        description+' must never become positive source absence');
      ok(true,'fail-closed R1 source absence: '+description);
    }
    for (const changedAt of ['navigation','wait-page-1','wait-page-2']) {
      const invalid=fixture({changedAt});
      await assert.rejects(invalid.find(), /KR_MY_ADS_ACCOUNT_CHANGED_DURING_SCAN/,
        'account drift '+changedAt+' must not provide a positive listing');
      ok(true,'account drift '+changedAt+' denied during pagination');
      const negative=fixture({changedAt});
      await assert.rejects(negative.absent(), /KR_MY_ADS_ACCOUNT_CHANGED_DURING_SCAN/,
        'account drift '+changedAt+' must not provide a source-absence receipt');
      ok(true,'account drift '+changedAt+' denied for source absence');
    }
    await assert.rejects(fixture({missingName:true}).find(),
      /KR_MY_ADS_ACCOUNT_CHANGED_DURING_SCAN/);
    ok(true,'missing authenticated account label fails closed');
    // The existing generic browsing API is preserved. Only evidence bearing
    // an explicit trusted expected profile can satisfy R1.
    ok((await fixture().find('')).found===true,
      'legacy generic read-only lookup remains available without authoritative claim');
    ok(background.includes('expectedProfileName:expected'),
      'trusted Phase-4 remote service propagates original expected account to content pages');
    ok(publisher.includes('expectedProfileName:expectedName'),
      'trusted publication verification propagates current independently authenticated account');
    ok(runner.includes('expectedProfileName:message.expectedProfileName'),
      'content router passes read-only authenticated scan requirement');
    ok(valid.mutations===0&&absent.mutations===0,
      'account-continuity acceptance never invokes listing mutations');
  } finally {globalThis.location = oldLocation;globalThis.document = oldDocument;}
  console.log('PASS KAR171 R1 per-page account-continuity '+count+' assertions');
})().catch(error => {console.error(error);process.exitCode=1;});
