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
