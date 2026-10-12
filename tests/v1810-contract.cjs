const { includesActivePatch } = require('./current-patch-policy.cjs');
const fs = require('fs');
const path = require('path');
const assert = require('assert');
let n = 0;
const pass = name => { n += 1; console.log(`PASS ${n}: ${name}`); };
const root = path.join(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const background = require('./v12215-source-surface.cjs');
const runner = fs.readFileSync(path.join(root, 'inventory-runner.js'), 'utf8');
const publicEvidence = fs.readFileSync(path.join(root, 'public-listing-evidence-service.js'), 'utf8');

assert.ok(includesActivePatch(['1.8.10','1.8.11','1.8.12','1.8.13','1.8.14','1.9.0','1.10.0','1.10.1','1.10.2','1.10.3','1.10.4','1.11.0','1.11.1','1.11.2','1.11.3','1.11.4','1.11.5','1.12.0','1.12.1','1.13.0','1.13.1','1.13.2','1.13.3','1.13.4','1.13.5','1.13.6','1.13.7','1.13.8','1.14.0','1.14.1','1.14.2','1.14.3','1.14.4','1.14.5','1.15.0','1.15.1','1.15.2','1.15.3','1.15.4','1.15.5','1.15.6','1.15.7','1.16.0','1.16.1','1.16.2','1.16.3','1.16.4','1.16.5','1.16.6','1.16.7','1.16.8','1.16.9','1.17.0','1.17.1','1.17.2','1.17.3','1.17.4','1.17.5','1.17.6','1.17.7','1.17.8','1.17.9','1.17.10','1.18.0','1.18.1','1.18.2','1.18.3','1.18.4','1.19.0','1.19.1','1.19.2','1.19.3','1.19.4','1.19.5','1.19.6','1.19.7','1.19.8','1.20.0','1.20.1','1.20.2','1.20.3','1.20.4','1.20.5','1.20.7','1.20.8','1.20.9','1.20.10','1.20.11','1.20.12','1.20.13','1.20.14','1.20.15','1.20.16','1.20.17','1.20.18','1.20.19','1.20.20','1.20.21','1.20.22','1.21.0','1.21.1','1.21.2','1.21.3','1.21.4','1.21.5','1.21.6','1.21.7','1.21.8','1.21.9','1.21.10','1.21.11','1.21.12','1.21.13','1.21.14','1.21.15','1.22.0','1.22.1','1.22.2','1.22.3','1.22.4','1.22.5','1.22.6','1.22.7','1.22.8','1.22.9','1.22.10','1.22.11','1.22.12','1.22.13','1.22.14','1.22.15','1.22.16','1.22.17','1.22.18','1.22.19','1.22.20','1.22.21','1.22.22','1.22.23','1.22.24','1.22.25','1.22.26','1.22.27','1.22.28','1.22.29','1.22.30','1.23.0','1.23.1','1.23.2','1.23.3','1.23.4','1.23.5','1.23.6','1.23.7','1.23.8','1.23.9','1.23.10','1.23.11','1.23.12','1.23.13','1.23.14','1.23.15','1.23.16','1.23.17','1.23.18','1.23.19','1.23.20','1.23.22','1.23.23','1.23.24'], manifest.version));
assert.ok(includesActivePatch(['1.8.10','1.8.11','1.8.12','1.8.13','1.8.14','1.9.0','1.10.0','1.10.1','1.10.2','1.10.3','1.10.4','1.11.0','1.11.1','1.11.2','1.11.3','1.11.4','1.11.5','1.12.0','1.12.1','1.13.0','1.13.1','1.13.2','1.13.3','1.13.4','1.13.5','1.13.6','1.13.7','1.13.8','1.14.0','1.14.1','1.14.2','1.14.3','1.14.4','1.14.5','1.15.0','1.15.1','1.15.2','1.15.3','1.15.4','1.15.5','1.15.6','1.15.7','1.16.0','1.16.1','1.16.2','1.16.3','1.16.4','1.16.5','1.16.6','1.16.7','1.16.8','1.16.9','1.17.0','1.17.1','1.17.2','1.17.3','1.17.4','1.17.5','1.17.6','1.17.7','1.17.8','1.17.9','1.17.10','1.18.0','1.18.1','1.18.2','1.18.3','1.18.4','1.19.0','1.19.1','1.19.2','1.19.3','1.19.4','1.19.5','1.19.6','1.19.7','1.19.8','1.20.0','1.20.1','1.20.2','1.20.3','1.20.4','1.20.5','1.20.7','1.20.8','1.20.9','1.20.10','1.20.11','1.20.12','1.20.13','1.20.14','1.20.15','1.20.16','1.20.17','1.20.18','1.20.19','1.20.20','1.20.21','1.20.22','1.21.0','1.21.1','1.21.2','1.21.3','1.21.4','1.21.5','1.21.6','1.21.7','1.21.8','1.21.9','1.21.10','1.21.11','1.21.12','1.21.13','1.21.14','1.21.15','1.22.0','1.22.1','1.22.2','1.22.3','1.22.4','1.22.5','1.22.6','1.22.7','1.22.8','1.22.9','1.22.10','1.22.11','1.22.12','1.22.13','1.22.14','1.22.15','1.22.16','1.22.17','1.22.18','1.22.19','1.22.20','1.22.21','1.22.22','1.22.23','1.22.24','1.22.25','1.22.26','1.22.27','1.22.28','1.22.29','1.22.30','1.23.0','1.23.1','1.23.2','1.23.3','1.23.4','1.23.5','1.23.6','1.23.7','1.23.8','1.23.9','1.23.10','1.23.11','1.23.12','1.23.13','1.23.14','1.23.15','1.23.16','1.23.17','1.23.18','1.23.19','1.23.20','1.23.22','1.23.23','1.23.24'], pkg.version));
pass('v1.8.10 version aligned');

function functionBlock(source, name) {
  const m = new RegExp(`(?:async\\s+)?function\\s+${name}\\s*\\(`).exec(source);
  if (!m) return '';
  const brace = source.indexOf('{', m.index);
  let depth = 0;
  for (let i = brace; i < source.length; i += 1) {
    if (source[i] === '{') depth += 1;
    else if (source[i] === '}') { depth -= 1; if (depth === 0) return source.slice(m.index, i + 1); }
  }
  return '';
}
const direct = functionBlock(publicEvidence, 'directPublicUrlForAdId');
assert.match(direct, /https:\/\/www\.kleinanzeigen\.de\/s-anzeige\/\$\{encodeURIComponent\(value\)\}/);
assert.doesNotMatch(direct, /slugifyListingTitle|categoryId|locationId/);
pass('legacy id-only public URL helper remains deterministic without slug/category guessing');

const retry = background.match(/async function retryRenewalVerification\(message\) \{[\s\S]*?\n\}\n\nasync function markRenewalPublishClicked/)?.[0] || '';
assert.ok(retry, 'retryRenewalVerification must exist');
assert.match(retry, /runRenewalReinventory\(renewalId\)/);
assert.match(retry, /\['edit', 'fresh-canonical-public', 'fresh-id-direct-public', 'fresh-my-ads'\]/);
if (includesActivePatch(['1.12.0','1.12.1','1.13.0','1.13.1','1.13.2','1.13.3','1.13.4','1.13.5','1.13.6','1.13.7','1.13.8','1.14.0','1.14.1','1.14.2','1.14.3','1.14.4','1.14.5','1.15.0','1.15.1','1.15.2','1.15.3','1.15.4','1.15.5','1.15.6','1.15.7','1.16.0','1.16.1','1.16.2','1.16.3','1.16.4','1.16.5','1.16.6','1.16.7','1.16.8','1.16.9','1.17.0','1.17.1','1.17.2','1.17.3','1.17.4','1.17.5','1.17.6','1.17.7','1.17.8','1.17.9','1.17.10','1.18.0','1.18.1','1.18.2','1.18.3','1.18.4','1.19.0','1.19.1','1.19.2','1.19.3','1.19.4','1.19.5','1.19.6','1.19.7','1.19.8','1.20.0','1.20.1','1.20.2','1.20.3','1.20.4','1.20.5','1.20.7','1.20.8','1.20.9','1.20.10','1.20.11','1.20.12','1.20.13','1.20.14','1.20.15','1.20.16','1.20.17','1.20.18','1.20.19','1.20.20','1.20.21','1.20.22','1.21.0','1.21.1','1.21.2','1.21.3','1.21.4','1.21.5','1.21.6','1.21.7','1.21.8','1.21.9','1.21.10','1.21.11','1.21.12','1.21.13','1.21.14','1.21.15','1.22.0','1.22.1','1.22.2','1.22.3','1.22.4','1.22.5','1.22.6','1.22.7','1.22.8','1.22.9','1.22.10','1.22.11','1.22.12','1.22.13','1.22.14','1.22.15','1.22.16','1.22.17','1.22.18','1.22.19','1.22.20','1.22.21','1.22.22','1.22.23','1.22.24','1.22.25','1.22.26','1.22.27','1.22.28','1.22.29','1.22.30','1.23.0','1.23.1','1.23.2','1.23.3','1.23.4','1.23.5','1.23.6','1.23.7','1.23.8','1.23.9','1.23.10','1.23.11','1.23.12','1.23.13','1.23.14','1.23.15','1.23.16','1.23.17','1.23.18','1.23.19','1.23.20','1.23.22','1.23.23','1.23.24'], manifest.version)) {
  assert.match(retry, /renewalMode === RENEWAL_MODE_FAST/);
  assert.match(retry, /\['my-ads-presence'\]/);
}
assert.doesNotMatch(retry, /publicUrlForInventoryRecord\(candidate\)/);
pass('retry preserves deterministic Safe-Mode verification and supports Fast-Mode My-Ads-only verification');

const reinventory = fs.readFileSync(path.join(root, 'src/background/services/renewal-reinventory-flow.js'), 'utf8'); // v1.23.15: ownership moved, assertions unchanged
assert.match(reinventory, /p-anzeige-bearbeiten\.html\?adId=\$\{encodeURIComponent\(newAdId\)\}/);
assert.match(reinventory, /EXTRACT_CURRENT_AD/);
assert.match(reinventory, /resolveRenewalPublicEvidence\(newAdId,[\s\S]*session\)/);
assert.match(reinventory, /compareRenewalRecords\(source, candidate/);
pass('retry first re-inventories the saved new ad through its edit page before final comparison');

const resolverStart = background.indexOf('async function resolveRenewalPublicEvidence');
const resolverEnd = background.indexOf('\nasync function extractReadOnlyMetadata', resolverStart);
const resolver = background.slice(resolverStart, resolverEnd);
assert.match(resolver, /normalizeKnownPublicAdUrl\(knownPublicUrl, newAdId\)/);
assert.match(resolver, /directPublicUrlForAdId\(newAdId\)/);
assert.match(resolver, /probeFreshRenewalPublicUrl\(canonicalKnownUrl, newAdId, 'canonical'/);
assert.match(resolver, /probeFreshRenewalPublicUrl\(directIdUrl, newAdId, 'id-direct'/);
assert.match(resolver, /findRenewalAdInMyAdsFresh\(newAdId, expectedProfileName, correlation\)/);
assert.doesNotMatch(resolver, /reusedWorker/);
pass('Safe-Mode public verification is ID-centered and uses fresh isolated workers rather than a recycled verification tab');

const myAdsHelper = background.match(/async function findRenewalAdInMyAdsFresh\(adId, expectedProfileName,[\s\S]*?\n\}/)?.[0] || '';
assert.match(myAdsHelper, /MY_ADS_PROJECTS_URL/);
assert.match(myAdsHelper, /MY_ADS_STATUS/);
assert.match(myAdsHelper, /FIND_OWN_AD_BY_ID/);
assert.match(myAdsHelper, /anderen Kleinanzeigen-Konto/);
assert.match(myAdsHelper, /createFreshRenewalVerificationTab\(MY_ADS_PROJECTS_URL/);
assert.match(myAdsHelper, /finally \{[\s\S]*closeFreshRenewalVerificationTab/);
pass('My Ads fallback stays profile-aware and now owns a fresh isolated worker that is closed after verification');

const findRunner = runner.match(/async function findOwnAdById\(adId(?:, correlation = \{\})?(?:, \{ notFoundSeverity = 'warning', expectedAbsent = false \} = \{\})?\) \{[\s\S]*?\n\}/)?.[0] || '';
assert.match(findRunner, /scanOwnAdsAcrossPages\(wanted\)/);
assert.match(findRunner, /pagesScanned/);
assert.match(findRunner, /publicUrl/);
assert.match(runner, /message\?\.type === 'FIND_OWN_AD_BY_ID'/);
pass('My Ads fallback scans all pages and returns serializable card evidence');

const compare = background.match(/async function compareRenewalRecords\(source, candidate,[\s\S]*?\n\}/)?.[0] || '';
assert.match(compare, /field: 'ownAdsPresence'/);
assert.match(compare, /ownAdsPresence !== true/);
assert.match(compare, /Neue Anzeige wurde auch in „Meine Anzeigen“ nicht gefunden/);
pass('unclear Read-only plus missing My Ads presence becomes a real verification uncertainty');

const waitClassifier = background.match(/function renewalComparisonWaitsOnlyForOnline\(comparison\) \{[\s\S]*?\n\}/)?.[0] || '';
assert.match(waitClassifier, /uncertainties\.length === 1/);
assert.match(waitClassifier, /field \|\| ''\) === 'online'/);
pass('WARTET AUF ONLINE is retained only when My Ads presence is confirmed and online is the sole uncertainty');

assert.doesNotMatch(background, /requestSubmit\(|\.submit\(/);
pass('no direct publish-submit path introduced');

console.log(`${n} v1.8.10 contract groups passed`);
