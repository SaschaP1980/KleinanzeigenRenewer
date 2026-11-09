const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const source = fs.readFileSync('public-listing-evidence-service.js', 'utf8');

function extractFunction(name) {
  const start = source.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `${name} not found`);
  const signatureEnd = source.indexOf(') {', start);
  assert.ok(signatureEnd >= 0, `${name} signature end not found`);
  const brace = signatureEnd + 2;
  let depth = 0;
  for (let i = brace; i < source.length; i += 1) {
    const c = source[i];
    if (c === '{') depth += 1;
    else if (c === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  throw new Error(`unterminated ${name}`);
}

const context = {};
vm.createContext(context);
vm.runInContext([
  extractFunction('normalizedCalendarParts'),
  extractFunction('deriveListingDateFromEndDate'),
  extractFunction('mergeListingMetadata')
].join('\n'), context);

let passes = 0;
function check(label, fn) { fn(); passes += 1; console.log(`PASS ${label}`); }

check('60-day derivation matches observed 15.09.2026 -> 14.11.2026 relation', () => {
  const result = context.deriveListingDateFromEndDate('2026-11-14', '', 60);
  assert.equal(result.listingDateIso, '2026-09-15');
  assert.equal(result.listingDateDisplay, '15.09.2026');
  assert.equal(result.listingDateDerived, true);
  assert.equal(result.listingDateSource, 'derived-end-date-60d');
});
check('display-format end date can be derived without local-time DST drift', () => {
  const result = context.deriveListingDateFromEndDate('', '15.11.2026', 60);
  assert.equal(result.listingDateIso, '2026-09-16');
  assert.equal(result.listingDateDisplay, '16.09.2026');
});
check('invalid end date produces no heuristic', () => {
  assert.equal(context.deriveListingDateFromEndDate('', 'unbekannt', 60), null);
});
check('verified existing listing date survives a later heuristic fast inventory merge', () => {
  const merged = context.mergeListingMetadata({}, {
    listingDateDisplay: '14.09.2026', listingDateIso: '2026-09-14', listingDateDerived: false,
    listingDateSource: 'readonly-detail', readOnlyMetadataStatus: 'captured'
  }, null, {
    listingDateDisplay: '15.09.2026', listingDateIso: '2026-09-15', listingDateDerived: true,
    listingDateSource: 'derived-end-date-60d', listingDateDerivedDays: 60, readOnlyMetadataStatus: 'skipped-fast-mode'
  });
  assert.equal(merged.listingDateIso, '2026-09-14');
  assert.equal(merged.listingDateDerived, false);
  assert.equal(merged.listingDateSource, 'readonly-detail');
  assert.equal(merged.readOnlyMetadataStatus, 'captured');
});
check('direct readonly metadata replaces a heuristic and clears the derived marker', () => {
  const merged = context.mergeListingMetadata({}, {
    listingDateDisplay: '15.09.2026', listingDateIso: '2026-09-15', listingDateDerived: true,
    listingDateSource: 'derived-end-date-60d', readOnlyMetadataStatus: 'skipped-fast-mode'
  }, { ok: true, metadata: { listingDateDisplay: '16.09.2026', listingDateIso: '2026-09-16' } }, {});
  assert.equal(merged.listingDateIso, '2026-09-16');
  assert.equal(merged.listingDateDerived, false);
  assert.equal(merged.listingDateSource, 'readonly-detail');
  assert.equal(merged.readOnlyMetadataStatus, 'captured');
});
console.log(`${passes} v1.18.2 derived-date runtime groups passed`);

// KAR-143 manual inventory refresh: the public detail page can omit the
// expiration date, while the account-bound exact-ID own-ads card supplies it.
// These are read-only fixtures: no live account, deletion or publication.
const background = fs.readFileSync('background.js', 'utf8');
function extractAsyncBackgroundFunction(name) {
  const sig = 'async function ' + name + '(';
  const start = background.indexOf(sig);
  assert.ok(start >= 0, 'missing production function ' + name);
  const brace = background.indexOf('{', start);
  let depth = 0;
  for (let i = brace; i < background.length; i++) {
    if (background[i] === '{') depth++;
    if (background[i] === '}' && --depth === 0) return background.slice(start, i + 1);
  }
  throw new Error('unterminated production function ' + name);
}
function expiryFixture({
  profile = 'Account One', expectedProfile = 'Account One', afterProfile = profile,
  found = true, responseId = '3566991742',
  dateDisplay = '11.11.2026', dateIso = '2026-11-11', throwAt = ''
} = {}) {
  const events = [], calls = [];
  let statusCount = 0;
  const dependencies = {
    MY_ADS_PROJECTS_URL: 'https://www.kleinanzeigen.de/m-meine-anzeigen.html?tab=PROJECTS',
    TAB_LOAD_TIMEOUT_RENEWAL_MS: 1000,
    normalizeProfileName: value => String(value || '').trim(),
    createAutomationTab: async o => { calls.push(['create', o]); return { id: 717 }; },
    waitForTabComplete: async () => { calls.push(['wait']); },
    ensureContentConnection: async () => { calls.push(['connect']); },
    sendTabRequestWithBootstrap: async (_id, message) => {
      calls.push(['message', message.type, message.adId || null]);
      if (throwAt === message.type) throw new Error('read-only probe unavailable');
      if (message.type === 'MY_ADS_STATUS') return {
        isMyAdsPage: true, isProjectsTab: true,
        profileName: statusCount++ ? afterProfile : profile
      };
      if (message.type === 'FIND_OWN_AD_BY_ID') return {
        found, adId: responseId, page: 3, pagesScanned: 3,
        endDateDisplay: dateDisplay, endDateIso: dateIso
      };
      throw new Error('unexpected message');
    },
    closeRegistryTabs: async ids => { calls.push(['close', ...ids]); },
    logDiagnostic: async (level, event, details) => { events.push({ level, event, details }); }
  };
  const ctx = vm.createContext(dependencies);
  vm.runInContext(extractAsyncBackgroundFunction('readInventoryRefreshOwnAdsEndDate'), ctx);
  return { run: () => ctx.readInventoryRefreshOwnAdsEndDate('3566991742', expectedProfile, 6), calls, events };
}
(async () => {
  const ok = expiryFixture();
  const evidence = await ok.run();
  assert.equal(evidence.endDateDisplay, '11.11.2026');
  assert.equal(evidence.endDateIso, '2026-11-11');
  assert.equal(evidence.adId, '3566991742');
  assert.equal(evidence.pagesScanned, 3);
  assert.ok(ok.calls.some(x => x[0] === 'message' && x[1] === 'FIND_OWN_AD_BY_ID' && x[2] === '3566991742'));
  assert.equal(ok.calls.filter(x => x[0] === 'close').length, 1);
  assert.deepEqual(ok.calls.filter(x => x[0] === 'close')[0].slice(1), [717]);
  const merged = context.mergeListingMetadata({}, {}, {
    ok: true, metadata: { listingDateDisplay: '09.11.2026', listingDateIso: '2026-11-09', endDateDisplay: null, endDateIso: null }
  }, { endDateDisplay: evidence.endDateDisplay, endDateIso: evidence.endDateIso });
  assert.equal(merged.endDateDisplay, '11.11.2026');
  assert.equal(merged.listingDateDisplay, '09.11.2026');
  console.log('PASS KAR-143: exact-ID own-ads expiry fills missing public date, keeps listing date');

  for (const settings of [
    { profile: 'Different Account', expectedProfile: 'Account One' },
    { afterProfile: 'Different Account' },
    { responseId: '9999999999' },
    { found: false },
    { dateDisplay: '31.02.2026', dateIso: '2026-02-31' },
    { dateDisplay: '11.11.2026', dateIso: '2026-11-12' },
    { dateDisplay: '', dateIso: '' },
    { throwAt: 'FIND_OWN_AD_BY_ID' }
  ]) {
    const check = expiryFixture(settings);
    await assert.rejects(check.run(), /Konto|Anzeigen-ID|Anzeigenkarte|Ablaufdatum|Enddatum|nicht gefunden|unverfügbar|unavailable|erfasst|ungültig/i);
    assert.ok(check.calls.some(x => x[0] === 'close'), 'temporary own-ads tab must close even on failure');
    if (settings.profile !== settings.expectedProfile) assert.equal(check.calls.filter(x => x[1] === 'FIND_OWN_AD_BY_ID').length, 0);
  }
  console.log('PASS KAR-143: wrong account, drift, ad ID, absent and malformed expiry fail closed, close tab');
})().catch(error => { console.error(error); process.exitCode = 1; });

