const { includesActivePatch } = require('./current-patch-policy.cjs');
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const cryptoNode = require('crypto');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const contentSource = fs.readFileSync(path.join(root, 'content.js'), 'utf8');
const background = fs.readFileSync(path.join(root, 'background.js'), 'utf8') + '\n' + fs.readFileSync(path.join(root, 'renewal-workflow-controller.js'), 'utf8') + '\n' + fs.readFileSync(path.join(root, 'archive-insertion-controller.js'), 'utf8') + '\n' + fs.readFileSync(path.join(root, 'src/background/services/archive-insertion-verification-service.js'), 'utf8') + '\n' + fs.readFileSync(path.join(root, 'src/background/services/archive-insertion-recovery-service.js'), 'utf8');

assert.ok(includesActivePatch(['1.13.2','1.13.3','1.13.4','1.13.5','1.13.6','1.13.7','1.13.8','1.14.0','1.14.1','1.14.2','1.14.3','1.14.4','1.14.5','1.15.0','1.15.1','1.15.2','1.15.3','1.15.4','1.15.5','1.15.6','1.15.7','1.16.0','1.16.1','1.16.2','1.16.3','1.16.4','1.16.5','1.16.6','1.16.7','1.16.8','1.16.9','1.17.0','1.17.1','1.17.2','1.17.3','1.17.4','1.17.5','1.17.6','1.17.7','1.17.8','1.17.9','1.17.10','1.18.0','1.18.1','1.18.2','1.18.3','1.18.4','1.19.0','1.19.1','1.19.2','1.19.3','1.19.4','1.19.5','1.19.6','1.19.7','1.19.8','1.20.0','1.20.1','1.20.2','1.20.3','1.20.4','1.20.5','1.20.7','1.20.8','1.20.9','1.20.10','1.20.11','1.20.12','1.20.13','1.20.14','1.20.15','1.20.16','1.20.17','1.20.18','1.20.19','1.20.20','1.20.21','1.20.22','1.21.0','1.21.1','1.21.2','1.21.3','1.21.4','1.21.5','1.21.6','1.21.7','1.21.8','1.21.9','1.21.10','1.21.11','1.21.12','1.21.13','1.21.14','1.21.15','1.22.0','1.22.1','1.22.2','1.22.3','1.22.4','1.22.5','1.22.6','1.22.7','1.22.8','1.22.9','1.22.10','1.22.11','1.22.12','1.22.13','1.22.14','1.22.15','1.22.16','1.22.17','1.22.18','1.22.19','1.22.20','1.22.21','1.22.22','1.22.23','1.22.24','1.22.25','1.22.26','1.22.27','1.22.28','1.22.29','1.22.30','1.23.0','1.23.1','1.23.2','1.23.3','1.23.4','1.23.5','1.23.6','1.23.7','1.23.8','1.23.9','1.23.10','1.23.11','1.23.12','1.23.13','1.23.14','1.23.15','1.23.16','1.23.17','1.23.18','1.23.19','1.23.20','1.23.22','1.23.23','1.23.24'], manifest.version));
assert.ok(includesActivePatch(['1.13.2','1.13.3','1.13.4','1.13.5','1.13.6','1.13.7','1.13.8','1.14.0','1.14.1','1.14.2','1.14.3','1.14.4','1.14.5','1.15.0','1.15.1','1.15.2','1.15.3','1.15.4','1.15.5','1.15.6','1.15.7','1.16.0','1.16.1','1.16.2','1.16.3','1.16.4','1.16.5','1.16.6','1.16.7','1.16.8','1.16.9','1.17.0','1.17.1','1.17.2','1.17.3','1.17.4','1.17.5','1.17.6','1.17.7','1.17.8','1.17.9','1.17.10','1.18.0','1.18.1','1.18.2','1.18.3','1.18.4','1.19.0','1.19.1','1.19.2','1.19.3','1.19.4','1.19.5','1.19.6','1.19.7','1.19.8','1.20.0','1.20.1','1.20.2','1.20.3','1.20.4','1.20.5','1.20.7','1.20.8','1.20.9','1.20.10','1.20.11','1.20.12','1.20.13','1.20.14','1.20.15','1.20.16','1.20.17','1.20.18','1.20.19','1.20.20','1.20.21','1.20.22','1.21.0','1.21.1','1.21.2','1.21.3','1.21.4','1.21.5','1.21.6','1.21.7','1.21.8','1.21.9','1.21.10','1.21.11','1.21.12','1.21.13','1.21.14','1.21.15','1.22.0','1.22.1','1.22.2','1.22.3','1.22.4','1.22.5','1.22.6','1.22.7','1.22.8','1.22.9','1.22.10','1.22.11','1.22.12','1.22.13','1.22.14','1.22.15','1.22.16','1.22.17','1.22.18','1.22.19','1.22.20','1.22.21','1.22.22','1.22.23','1.22.24','1.22.25','1.22.26','1.22.27','1.22.28','1.22.29','1.22.30','1.23.0','1.23.1','1.23.2','1.23.3','1.23.4','1.23.5','1.23.6','1.23.7','1.23.8','1.23.9','1.23.10','1.23.11','1.23.12','1.23.13','1.23.14','1.23.15','1.23.16','1.23.17','1.23.18','1.23.19','1.23.20','1.23.22','1.23.23','1.23.24'], packageJson.version));

function detectViaContent(url, sourceAdId) {
  let runtimeListener = null;
  const location = new URL(url);
  const document = {
    title: '',
    querySelector() { return null; },
    querySelectorAll() { return []; }
  };
  const context = {
    URL,
    console,
    location,
    document,
    chrome: {
      runtime: {
        lastError: null,
        sendMessage() {},
        onMessage: { addListener(listener) { runtimeListener = listener; } }
      }
    }
  };
  context.globalThis = context;
  vm.runInNewContext(contentSource, context, { filename: 'content.js' });
  assert.ok(runtimeListener, 'Content message listener wurde nicht registriert.');
  let response = null;
  runtimeListener({ type: 'DETECT_PUBLISHED_AD', sourceAdId }, {}, value => { response = value; });
  assert.ok(response?.ok, response?.error || 'DETECT_PUBLISHED_AD lieferte keine erfolgreiche Antwort.');
  return response.result;
}

const confirmation = detectViaContent(
  'https://www.kleinanzeigen.de/p-anzeige-aufgeben-bestaetigung.html?addId=3513234569&uuid=26a7f815-c904-499c-be63-854f0f03c399&tracking=example',
  '3509738343'
);
assert.strictEqual(confirmation.adId, '3513234569');
assert.strictEqual(confirmation.kind, undefined); // public API intentionally exposes only id/url/count
assert.strictEqual(confirmation.publicUrl, null);
assert.strictEqual(confirmation.candidateCount, 1);

const sameAsSource = detectViaContent(
  'https://www.kleinanzeigen.de/p-anzeige-aufgeben-bestaetigung.html?addId=3509738343',
  '3509738343'
);
assert.strictEqual(sameAsSource, null, 'Quell-ID darf nicht als neue Anzeigen-ID akzeptiert werden.');

const confirmationAdIdFallback = detectViaContent(
  'https://www.kleinanzeigen.de/p-anzeige-aufgeben-bestaetigung.html?adId=3513234570',
  '3509738343'
);
assert.strictEqual(confirmationAdIdFallback.adId, '3513234570');

assert.ok(background.includes('function detectPublishedAdFromKnownUrl'));
assert.ok(background.includes("url.searchParams.get('addId') || url.searchParams.get('adId')"));
assert.ok(background.includes('async function detectPublishedAdForFill'));
assert.ok(background.includes("detectionSource: 'tab-url'"));
assert.ok(background.includes('ARCHIVE_INSERT_NEW_ID_CONFIRMED'));
assert.ok(background.includes('detectPublishedAdForFill(session.targetTabId, session.sourceAdId)'));
assert.ok(background.includes('detectPublishedAdForFill(renewal.targetTabId, renewal.sourceAdId)'));
assert.ok(background.includes('detectPublishedAdForFill(tabId, fill.sourceAdId)'));

const helperStart = background.indexOf('function detectPublishedAdFromKnownUrl');
const helperEnd = background.indexOf('\n\nasync function detectPublishedAdForFill', helperStart);
assert.ok(helperStart >= 0 && helperEnd > helperStart, 'Background-URL-Parser konnte nicht isoliert werden.');
const helperContext = { URL };
helperContext.globalThis = helperContext;
vm.runInNewContext(`${background.slice(helperStart, helperEnd)}\nglobalThis.detectPublishedAdFromKnownUrlForTest = detectPublishedAdFromKnownUrl;`, helperContext);
const direct = helperContext.detectPublishedAdFromKnownUrlForTest(
  'https://www.kleinanzeigen.de/p-anzeige-aufgeben-bestaetigung.html?addId=3513234569&uuid=26a7f815-c904-499c-be63-854f0f03c399',
  '3509738343'
);
assert.strictEqual(direct.adId, '3513234569');
assert.strictEqual(direct.kind, 'confirmation');
assert.strictEqual(direct.detectionSource, 'tab-url');
assert.strictEqual(helperContext.detectPublishedAdFromKnownUrlForTest(
  'https://www.kleinanzeigen.de/p-anzeige-aufgeben-bestaetigung.html?addId=3509738343',
  '3509738343'
), null);

const digest = cryptoNode.createHash('sha256').update(Buffer.from(manifest.key, 'base64')).digest('hex');
assert.strictEqual(digest, '70507977688f3465a60227cd0261bd07d92fad620625cd7ebff8f0856d9c5ed3');
assert.deepStrictEqual(manifest.permissions, require('./current-patch-policy.cjs').expectedManifestPermissions(manifest.version));
assert.deepStrictEqual(manifest.host_permissions, [
  'https://www.kleinanzeigen.de/*',
  'https://kleinanzeigen.de/*',
  'https://img.kleinanzeigen.de/*'
]);

console.log('PASS v1.13.2 publish confirmation addId regression contract');
