const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.join(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
const background = require('./v12216-source-surface.cjs');
const filler = fs.readFileSync(path.join(root, 'template-filler.js'), 'utf8');
const popup = require('./v12210-source-surface.cjs');
const content = fs.readFileSync(path.join(root, 'content.js'), 'utf8');
const packager = fs.readFileSync(path.join(root, 'scripts/package.py'), 'utf8');
const platformSafety = fs.readFileSync(path.join(root, 'platform-safety-controller.js'), 'utf8');
let n = 0;
const pass = name => { n += 1; console.log('PASS ' + name); };

assert.ok(/^1\.(?:1|2|3|4|5|6|7|8|9|10|11|12|13|14|15|16|17|18|19|20|21|22|23)\./.test(manifest.version));
assert.ok(manifest.content_scripts[0].js.includes('src/content/template-filler.js'));
assert.match(packager, /template-filler\.js/);
pass('v1.1.0 packages the template filler as a content script');

assert.match(popup, /(?:Als neue Anzeige verwenden|Neu inserieren)/);
assert.match(popup, /START_TEMPLATE_FILL/);
assert.match(background, /https:\/\/www\.kleinanzeigen\.de\/p-anzeige-aufgeben-schritt2\.html/);
assert.match(background, /createAutomationTab/);
assert.match(platformSafety, /options\.chromeTabs\.create\(tabOptions\)/);
pass('inventory action opens the exact requested new-ad URL through a bound fill session');

assert.match(background, /templatePayload\(record\)/);
assert.match(background, /GET_TEMPLATE_IMAGE_CHUNK/);
assert.match(background, /(?:image|transfer)\.blob\.slice/);
assert.match(filler, /new DataTransfer\(\)/);
assert.match(filler, /new File\(\[blob\]/);
assert.match(filler, /input\.dispatchEvent\(new Event\('change'/);
pass('locally stored JPEG blobs are streamed in bounded chunks and re-uploaded as real files');

assert.match(filler, /setCategory\(template(?:,\s*fillId)?(?:,\s*session\?\.maxPhaseAttempts)?\)/);
assert.match(filler, /Wähle deine Kategorie/i);
assert.match(filler, /attributeMap\[/);
assert.match(filler, /technicalValue/);
assert.match(filler, /chooseExactOption/);
pass('category is selected first and category-dependent attributes are filled by technical identity plus visible option');

assert.match(filler, /inferShippingPackageSize/);
assert.match(filler, /priceType/);
assert.match(filler, /buyNow/);
assert.match(filler, /addressVisibility/);
pass('shipping, price type, buy-now and location visibility are carried through explicitly');

assert.match(filler, /function verify\(template(?:,\s*root\s*=\s*document)?\)/);
assert.match(filler, /Nicht veröffentlicht/);
assert.doesNotMatch(filler, /requestSubmit\s*\(/);
assert.doesNotMatch(filler, /\.submit\s*\(/);
assert.doesNotMatch(filler, /findExactInteractive\(['"]Anzeige aufgeben/i);
pass('prefill is verified in-page and never submits or publishes automatically');

assert.match(content, /TemplateFill\?\.runPendingFill/);
assert.match(background, /TEMPLATE_FILL_FINISHED/);
pass('new tab automatically claims its session and completion is diagnosable');

console.log(`${n} v1.1.0 contract tests passed`);
