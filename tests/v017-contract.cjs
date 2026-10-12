const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.join(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
const form = fs.readFileSync(path.join(root, 'form-extractor.js'), 'utf8');
const image = fs.readFileSync(path.join(root, 'image-extractor.js'), 'utf8');
const content = fs.readFileSync(path.join(root, 'content.js'), 'utf8');
const background = fs.readFileSync(path.join(root, 'background.js'), 'utf8');
let n = 0; const pass = name => { n += 1; console.log('PASS ' + name); };

assert.ok(['0.1.7','1.1.0','1.1.1','1.1.2','1.1.3','1.1.4','1.1.5','1.1.6','1.2.0','1.3.0','1.4.0','1.5.0','1.5.1','1.6.0','1.6.1','1.6.2','1.7.0','1.7.1','1.8.0','1.8.1','1.8.2','1.8.3','1.8.4','1.8.5','1.8.6','1.8.7','1.8.8','1.8.9','1.8.10','1.8.11','1.8.12','1.8.13','1.8.14','1.9.0','1.10.0','1.10.1','1.10.2','1.10.3','1.10.4','1.11.0','1.11.1','1.11.2','1.11.3','1.11.4','1.11.5','1.12.0','1.12.1','1.13.0','1.13.1','1.13.2','1.13.3','1.13.4','1.13.5','1.13.6','1.13.7','1.13.8','1.14.0','1.14.1','1.14.2','1.14.3','1.14.4','1.14.5','1.15.0','1.15.1','1.15.2','1.15.3','1.15.4','1.15.5','1.15.6','1.15.7','1.16.0','1.16.1','1.16.2','1.16.3','1.16.4','1.16.5','1.16.6','1.16.7','1.16.8','1.16.9','1.17.0','1.17.1','1.17.2','1.17.3','1.17.4','1.17.5','1.17.6','1.17.7','1.17.8','1.17.9','1.17.10','1.18.0','1.18.1','1.18.2','1.18.3','1.18.4','1.19.0','1.19.1','1.19.2','1.19.3','1.19.4','1.19.5','1.19.6','1.19.7','1.19.8','1.20.0','1.20.1','1.20.2','1.20.3','1.20.4','1.20.5','1.20.7','1.20.8','1.20.9','1.20.10','1.20.11','1.20.12','1.20.13','1.20.14','1.20.15','1.20.16','1.20.17','1.20.18','1.20.19','1.20.20','1.20.21','1.20.22','1.21.0','1.21.1','1.21.2','1.21.3','1.21.4','1.21.5','1.21.6','1.21.7','1.21.8','1.21.9','1.21.10','1.21.11','1.21.12','1.21.13','1.21.14','1.21.15','1.22.0','1.22.1','1.22.2','1.22.3','1.22.4','1.22.5','1.22.6','1.22.7','1.22.8','1.22.9','1.22.10','1.22.11','1.22.12','1.22.13','1.22.14','1.22.15','1.22.16','1.22.17','1.22.18','1.22.19','1.22.20','1.22.21','1.22.22','1.22.23','1.22.24','1.22.25','1.22.26','1.22.27','1.22.28','1.22.29','1.22.30','1.23.0','1.23.1','1.23.2','1.23.3','1.23.4','1.23.5','1.23.6','1.23.7','1.23.8','1.23.9','1.23.10','1.23.11','1.23.12','1.23.13','1.23.14','1.23.15','1.23.16','1.23.17','1.23.18','1.23.19','1.23.20','1.23.22','1.23.23','1.23.24'].includes(manifest.version));
pass('v0.1.7 structured-inventory contract retained');

assert.match(form, /PostListingForm/);
assert.match(form, /decodeAstroProps/);
assert.match(form, /structuredPostListing/);
assert.match(form, /dynamicAttributeDefinitionCount/);
pass('structured PostListingForm props are parsed as a bounded technical source');

assert.match(form, /role'\) === 'radiogroup'.*input\[type="radio"\]/s);
assert.match(form, /\.sr-only,\[aria-hidden="true"\],\[hidden\]/);
pass('native radiogroup wrappers are ignored and screenreader-only text is excluded from visible values');

assert.match(form, /structuredOptionLabel\(definition, technicalValue\)/);
assert.match(form, /optionCount:/);
assert.match(form, /source: 'post-listing-props\+dom'/);
pass('dynamic category metadata merges structured technical values with rendered controls without persisting full option lists');

assert.match(image, /post-listing-props-xxlarge/);
assert.match(image, /preferExactDownloadUrl/);
assert.match(image, /structuredImageSourcesMatched/);
assert.match(content, /extractEdit\(edit\.form,location\.href,edit\.structuredImages\)/);
pass('explicit dynamicRuleXXLargeUrl is paired by UUID and forwarded as preferred large JPEG source');

assert.match(background, /source\?\.preferExactDownloadUrl === true/);
assert.match(background, /\[rawUrl, \.\.\.jpegCandidates\(rawUrl\)/);
assert.match(background, /JPEG ist nur Thumbnail-Größe/);
pass('verified XXLarge URL is attempted exactly first while strict JPEG and thumbnail rejection remain active');

console.log(`${n} v0.1.7 contract tests passed`);
