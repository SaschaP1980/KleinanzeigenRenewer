const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

const filler = fs.readFileSync(path.join(__dirname, '../src/content/template-image-upload.js'), 'utf8');
let n = 0;
const pass = name => { n += 1; console.log('PASS ' + name); };

const uploadStart = filler.indexOf('async function uploadImages');
const uploadEnd = filler.indexOf('\n    return Object.freeze({', uploadStart);
assert.ok(uploadStart >= 0 && uploadEnd > uploadStart);
const upload = filler.slice(uploadStart, uploadEnd);

assert.match(upload, /const previewTasks = \[\]/);
pass('uploadImages keeps explicit pending preview stabilization tasks');

assert.match(upload, /previewTasks\.push\(/);
assert.doesNotMatch(upload, /await\s+stabilizePreviewForFile\(input, file, index, images\.length\)/);
pass('per-image preview stabilization no longer blocks the upload loop');

const serverWait = upload.indexOf('serverImageInputs().length >= index + 1');
const taskPush = upload.indexOf('previewTasks.push(');
assert.ok(serverWait >= 0 && taskPush > serverWait);
pass('preview stabilization is queued only after server-side image creation is confirmed');

const awaitAll = upload.indexOf('await Promise.all(previewTasks)');
const aggregateGuard = upload.indexOf('const expectedFinal = images.length');
assert.ok(awaitAll >= 0 && aggregateGuard > awaitAll);
pass('all queued preview stabilizations finish before aggregate/final image verification');

assert.match(upload, /states\.every\(state => \['cdn-loaded', 'blob-fallback'\]\.includes\(state\.status\)\)/);
assert.match(upload, /waitForAllImagePreviewsStable\(input, expectedFinal\)/);
pass('final success still requires every image to be terminal and globally stable');

assert.match(upload, /const transfer = new DataTransfer\(\)/);
assert.match(upload, /await waitFor\(\(\) => serverImageInputs\(\)\.length >= index \+ 1/);
pass('actual image upload dispatch remains strictly sequential');

console.log(`${n} v1.19.0 PERFORMANCE-5 image-overlap tests passed`);
