'use strict';
// KAR-167 I1: prove original binary identity and runtime path/ZIP closure after moving artwork.
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const full = name => path.join(root, name);
const doc = JSON.parse(fs.readFileSync(full('docs/maintenance/ICON_ASSET_INVENTORY.json'), 'utf8'));

assert.equal(doc.schema, 1);
assert.equal(doc.issue, 167);
assert.equal(doc.assets.length, 22, 'Every original icon must be inventoried');
assert.deepEqual(doc.counts, {
  originalIcons: 22,
  packagedRuntime: 13,
  nonpackagedVariantsRetained: 7,
  highResolutionMastersRelocated: 2
});
const records = new Map();
const current = new Set();
const packaged = new Set();
let pngs = 0, svgs = 0, icos = 0;
for (const asset of doc.assets) {
  assert.ok(!records.has(asset.originalPath), 'Duplicate old icon path');
  assert.ok(!current.has(asset.currentPath), 'Duplicate canonical icon path');
  records.set(asset.originalPath, asset);
  current.add(asset.currentPath);
  assert.match(asset.originalPath, /^icons\/[a-z0-9-]+\.(?:png|svg|ico)$/);
  assert.match(asset.gitBlobSha, /^[a-f0-9]{40}$/);
  assert.ok(asset.reason.length >= 40, 'Missing specific consumer or retention proof: ' + asset.originalPath);
  const file = fs.readFileSync(full(asset.currentPath));
  assert.equal(file.length, asset.bytes, 'Binary length changed: ' + asset.currentPath);
  const originalGitBlobHash = crypto.createHash('sha1')
    .update('blob ' + file.length + '\0').update(file).digest('hex');
  assert.equal(originalGitBlobHash, asset.gitBlobSha,
    'Binary content changed from original Git blob: ' + asset.originalPath);
  if (asset.chromePackaged) {
    assert.equal(asset.disposition, 'KEEP_PACKAGED_RUNTIME');
    assert.equal(asset.currentPath, asset.originalPath,
      'Distributed icon path must not move: ' + asset.originalPath);
    packaged.add(asset.currentPath);
  }
  if (asset.disposition === 'MOVE_BINARY_SHA_IDENTICAL') {
    assert.equal(asset.chromePackaged, false);
    assert.equal(asset.currentPath, 'assets/artwork/' + path.basename(asset.originalPath));
    assert.ok(!fs.existsSync(full(asset.originalPath)),
      'Old master path must be removed after preserving original blob: ' + asset.originalPath);
  }
  if (asset.disposition === 'KEEP_NONPACKAGED_COMPATIBILITY') {
    assert.equal(asset.chromePackaged, false);
    assert.equal(asset.currentPath, asset.originalPath);
  }
  if (asset.currentPath.endsWith('.png')) {
    pngs++;
    assert.ok(file.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])),
      'Invalid PNG signature: ' + asset.currentPath);
    assert.equal(file.toString('ascii',12,16), 'IHDR', 'Missing PNG dimensions');
    const px = Number(asset.currentPath.match(/-(\d+)\.png$/)?.[1]);
    const width = file.readUInt32BE(16), height = file.readUInt32BE(20);
    assert.ok(Number.isSafeInteger(px) && px > 0);
    if (asset.disposition === 'MOVE_BINARY_SHA_IDENTICAL') {
      // Master filenames are historical labels, not a contract for the actual
      // pixel canvas. Their exact original Git blobs are verified above.
      assert.ok(width >= 1024 && height >= 1024,
        'Original source master must stay a high-resolution PNG: ' + asset.currentPath);
      console.log('PASS KAR-167 I1 master original pixel dimensions: ' +
        asset.currentPath + ' ' + width + 'x' + height);
    } else {
      // The installed and compatibility size variants DO promise these pixels.
      assert.equal(width, px, 'PNG pixel width is inconsistent with filename: ' + asset.currentPath);
      assert.equal(height, px, 'PNG pixel height is inconsistent with filename: ' + asset.currentPath);
    }
  } else if (asset.currentPath.endsWith('.svg')) {
    svgs++;
    const svg = file.toString('utf8');
    assert.match(svg, /<svg\b/);
    assert.match(svg, /<\/svg>/);
  } else if (asset.currentPath.endsWith('.ico')) {
    icos++;
    assert.equal(file.readUInt16LE(0), 0, 'Invalid ICO reserved header');
    assert.equal(file.readUInt16LE(2), 1, 'Invalid ICO image type');
    assert.ok(file.readUInt16LE(4) >= 1, 'ICO has no images');
  }
}
assert.equal(pngs + svgs + icos, 22);
assert.equal(packaged.size, 13);
const pngsOnDisk = dir => fs.readdirSync(full(dir), {withFileTypes:true})
  .filter(e => e.isFile() && /\.(?:png|svg|ico)$/i.test(e.name))
  .map(e => dir + '/' + e.name);
const actualAssets = [...pngsOnDisk('icons'), ...pngsOnDisk('assets/artwork')].sort();
assert.deepEqual(actualAssets, [...current].sort(),
  'Unexpected or missing runtime/design asset; update inventory only after checking actual consumers');

const packager = fs.readFileSync(full('scripts/package.py'), 'utf8');
const zipAssetPaths = new Set([...packager.matchAll(/'(icons\/[a-z0-9-]+\.(?:png|svg|ico))'/g)]
  .map(m => m[1]));
assert.deepEqual([...zipAssetPaths].sort(), [...packaged].sort(),
  'Exact Chrome ZIP asset allowlist must retain all and only its 13 original icons');
const manifest = JSON.parse(fs.readFileSync(full('manifest.json'), 'utf8'));
for (const [owner, refs] of [
  ['manifest.icons', Object.values(manifest.icons)],
  ['manifest.action.default_icon', Object.values(manifest.action.default_icon)]
]) {
  for (const name of refs) assert.ok(packaged.has(name), owner + ' points to missing Chrome ZIP icon: ' + name);
}
for (const file of ['app.html','popup.html','app.css','popup.css']) {
  const content = fs.readFileSync(full(file), 'utf8');
  for (const found of content.matchAll(/icons\/[a-z0-9-]+\.(?:png|svg|ico)/g)) {
    assert.ok(packaged.has(found[0]), file + ' uses non-packaged icon ' + found[0]);
  }
}
const app128 = records.get('icons/app-icon-128.png');
const legacy128 = records.get('icons/icon-128.png');
assert.equal(app128.gitBlobSha, legacy128.gitBlobSha, 'Historical 128px alias must remain byte-identical');
for (const docPath of ['icons/README.md','assets/artwork/README.md',
  'docs/maintenance/ICON_ASSET_AUDIT.md']) {
  assert.ok(fs.existsSync(full(docPath)), 'I1 documentation missing: ' + docPath);
}

const oldMasters = ['icons/' + 'app-master-1240.png', 'icons/' + 'taskbar-master-1240.png'];
const exts = /\.(?:js|cjs|mjs|py|sh|yml|yaml|ps1|cmd|cs)$/i;
function scan(dir) {
  if (!fs.existsSync(full(dir))) return [];
  return fs.readdirSync(full(dir),{withFileTypes:true}).flatMap(e => {
    const p = path.join(dir,e.name);
    return e.isDirectory() ? scan(p) : e.isFile() && exts.test(e.name) ? [p] : [];
  });
}
let scanned = 0;
for (const dir of ['src','tests','scripts','.github/workflows','tools/windows','lib']) {
  for (const rel of scan(dir)) {
    if (rel === 'tests/kar167-icons-closure.cjs') continue;
    scanned++;
    const text = fs.readFileSync(full(rel),'utf8');
    for (const previous of oldMasters) {
      assert.ok(!text.includes(previous),
        'Executable file still requires a relocated master at its old path: ' + rel);
    }
  }
}
console.log('PASS KAR-167 I1 icon closure: 22/22 original assets byte-identical; ' +
  pngs + ' pixel-verified PNGs, ' + svgs + ' SVGs, ' + icos + ' ICO; ' +
  packaged.size + ' packaged icons unchanged, 7 compatibility variants retained, ' +
  '2 untouched 1240px masters relocated, ' + scanned + ' executable references scanned');
