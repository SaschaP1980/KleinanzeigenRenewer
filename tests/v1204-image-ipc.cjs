const fs = require('node:fs');
const assert = require('node:assert/strict');
const filler = fs.readFileSync('template-filler.js', 'utf8');
const bg = fs.readFileSync('background.js', 'utf8');
const logicalBg = bg + '\n' + fs.readFileSync('template-fill-controller.js', 'utf8');
const templateFill = fs.readFileSync('template-fill-service.js', 'utf8');
const imageStore = fs.readFileSync('inventory-image-store.js', 'utf8');
let n = 0; const pass = label => { n += 1; console.log(`PASS ${n}: ${label}`); };

assert.match(filler, /const CHUNK_SIZE\s*=\s*512\s*\*\s*1024\s*;/);
pass('template image IPC uses 512 KiB chunks');
assert.match(templateFill, /const imageTransferCache\s*=\s*new Map\(\)/);
assert.match(templateFill, /TEMPLATE_IMAGE_TRANSFER_CACHE_MAX_ENTRIES/);
assert.match(templateFill, /TEMPLATE_IMAGE_TRANSFER_CACHE_TTL_MS/);
pass('background maintains a bounded short-lived image transfer cache');

const start = templateFill.indexOf('async function templateImageChunk');
const end = templateFill.indexOf('\n      function isTransientTemplateFillProgress', start);
assert.ok(start >= 0 && end > start);
const body = templateFill.slice(start, end);
assert.match(body, /resolveTemplateImageTransfer\(/);
assert.doesNotMatch(body, /await readFillSessions\(\)/);
assert.doesNotMatch(body, /await getInventoryImage\(message\.imageKey\)/);
assert.match(body, /evictTemplateImageTransfer/);
pass('chunk hot path reuses one validated image instead of re-reading session and IndexedDB per chunk');

const getStart = bg.indexOf('async function getInventoryImage');
const getEnd = bg.indexOf('\nasync function readFillSessions', getStart);
assert.ok(getStart >= 0 && getEnd > getStart);
const getBody = bg.slice(getStart, getEnd);
assert.match(getBody, /requireInventoryImageStore\(\)\.get\(imageKey\)/);
assert.match(imageStore, /async function get\(imageKey\)[\s\S]*?openSharedDatabase\(\)/);
assert.doesNotMatch(getBody, /db\.close\(\)/);
pass('image reads reuse the shared IndexedDB connection');

assert.match(logicalBg, /evictTemplateImageTransfersForFill\(session\.fillId\)/);
assert.match(logicalBg, /evictTemplateImageTransfersForTab/);
assert.match(templateFill, /function evictTemplateImageTransfersForTab\(tabId\)/);
pass('terminal fill and tab-close paths release cached image blobs');
console.log(`${n}/5 PASS`);
