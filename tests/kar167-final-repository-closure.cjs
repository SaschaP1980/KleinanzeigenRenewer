'use strict';
// KAR-167 R1 final source-only file hygiene contract. No remote/publish actions.
// The pinned pre-R1 file inventory preserves historical path/sha/byte evidence
// but does NOT freeze active runtime or test implementations against later changes.
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const ROOT = path.resolve(__dirname,'..');
const abs = p => path.join(ROOT,p);
const read = p => fs.readFileSync(abs(p),'utf8');
const sha1blob = p => {
  const buf=fs.readFileSync(abs(p));
  return crypto.createHash('sha1').update('blob '+buf.length+'\0').update(buf).digest('hex');
};
const sha256 = p => crypto.createHash('sha256').update(fs.readFileSync(abs(p))).digest('hex');
const inv=JSON.parse(read('docs/maintenance/REPOSITORY_FINAL_INVENTORY.json'));
assert.equal(inv.schema,1);
assert.equal(inv.issue,167);
assert.equal(inv.stats.workPreR1.files,798);
assert.equal(inv.files.length,798,'R1 file-level inventory must list every pre-R1 tracked path');
assert.equal(inv.stats.changesSinceBaseline.movedSourcePaths,30);
assert.equal(inv.stats.changesSinceBaseline.retiredOriginalPaths,3);
assert.equal(inv.stats.changesSinceBaseline.retiredWorkingTreeBytes,11889);
assert.equal(inv.stats.baseline.rootFiles,40);
assert.equal(inv.stats.workPreR1.rootFiles,12);
assert.equal(inv.stats.archive.trackedFiles,41);
assert.equal(inv.stats.archive.chromeZipCount,37);
assert.equal(inv.stats.archive.zipCount,38);
assert.equal(inv.stats.runtimeModules,103);
assert.equal(inv.stats.windowsTools,7);
assert.equal(inv.stats.libFiles,1);
const current=new Map(),groups={};
for(const file of inv.files) {
  assert.match(file.path,/^[A-Za-z0-9_.\/-]+$/,'Invalid tracked path');
  assert.match(file.blobSha,/^[a-f0-9]{40}$/,'Missing Git source provenance: '+file.path);
  assert.ok(!current.has(file.path),'Duplicate R1 inventory path: '+file.path);
  current.set(file.path,file);
  assert.ok(inv.dispositions[file.disposition],'Undocumented R1 KEEP reason: '+file.path);
  assert.equal(file.reason,inv.dispositions[file.disposition],
    'R1 disposition and individual reason disagree: '+file.path);
  assert.ok(fs.existsSync(abs(file.path)) && fs.statSync(abs(file.path)).isFile(),
    'Previously tracked path disappeared without independently verified retirement: '+file.path);
  groups[file.disposition]=(groups[file.disposition]||0)+1;
}
const oldPaths=new Set();
for(const m of inv.historicalMoves) {
  assert.ok(!oldPaths.has(m.oldPath));
  oldPaths.add(m.oldPath);
  assert.ok(!fs.existsSync(abs(m.oldPath)),'Old moved path resurrected: '+m.oldPath);
  assert.ok(current.has(m.newPath),'Moved source target missing: '+m.newPath);
  assert.equal(current.get(m.newPath).blobSha,m.originalGitBlobSha,
    'Original moved evidence changed unexpectedly: '+m.oldPath);
  if(m.oldPath.startsWith('architecture-')||m.oldPath.startsWith('icons/')) {
    assert.equal(sha1blob(m.newPath),m.originalGitBlobSha,
      'Immutable historical source content was not preserved: '+m.oldPath);
  }
}
for(const r of inv.historicalRetirements) {
  assert.ok(!oldPaths.has(r.oldPath));
  oldPaths.add(r.oldPath);
  assert.ok(!fs.existsSync(abs(r.oldPath)),
    'Proven-retired one-shot legacy tool was reintroduced: '+r.oldPath);
}
assert.equal(inv.historicalMoves.length,30);
assert.equal(inv.historicalRetirements.length,3);
const baselineSrcPaths=[...current.keys()].filter(p=>p.startsWith('src/')).sort();
assert.equal(baselineSrcPaths.length,103);
function listJs(dir) {
  return fs.readdirSync(abs(dir),{withFileTypes:true}).flatMap(e=>{
    const p=dir+'/'+e.name;
    return e.isDirectory()?listJs(p):e.isFile()&&p.endsWith('.js')?[p]:[];
  });
}
const srcPaths=listJs('src').sort();
assert.ok(srcPaths.length>=baselineSrcPaths.length,
  'A previously proven packaged source module was removed without evidence');
assert.ok(baselineSrcPaths.every(p=>current.get(p).disposition==='KEEP_PACKAGED_RUNTIME'));
const packager=read('scripts/package.py');
// Only quoted literal runtime source paths count; each is an explicit ZIP member.
const packageSource=[...new Set([...packager.matchAll(/'(src\/[A-Za-z0-9_./-]+\.js)'/g)]
  .map(x=>x[1]))].sort();
assert.deepEqual(packageSource,srcPaths,
  'Chrome packager must contain exactly every tracked source module; no orphan JS');
const manifest=JSON.parse(read('manifest.json'));
const packageSet=new Set(packageSource);
assert.ok(packageSet.has(manifest.background.service_worker),'Chrome SW source absent from package');
for(const cs of manifest.content_scripts||[])for(const p of cs.js||[]) {
  assert.ok(packageSet.has(p),'Manifest content script missing from Chrome package: '+p);
}
for(const html of ['app.html','popup.html']) {
  for(const [,p] of read(html).matchAll(/<script[^>]+src=['"]([^'"]+\.js)['"]/g)) {
    assert.ok(packageSet.has(p),'HTML script missing from Chrome package: '+html+' -> '+p);
  }
}
for(const guard of ['scripts/v12319-architecture-audit.cjs',
  'scripts/coverage-no-regression.cjs','tests/kar167-final-repository-closure.cjs']) {
  assert.ok(read('scripts/coverage-gate.sh').includes(guard),
    'Runtime reachability/no-regression/R1 gate was removed: '+guard);
}
const archived=inv.files.filter(x=>x.path.startsWith('release/'));
assert.equal(archived.length,41);
const archivedZip=archived.filter(x=>x.path.endsWith('.zip'));
assert.equal(archivedZip.length,38);
let checkedBytes=0;
for(const z of archivedZip) {
  assert.equal(z.disposition,'KEEP_IMMUTABLE_ARCHIVE');
  assert.ok(fs.readFileSync(abs(z.path)).subarray(0,4).equals(Buffer.from('504b0304','hex')),
    'Historical ZIP signature changed: '+z.path);
  assert.equal(fs.statSync(abs(z.path)).size,z.bytes,'Historical ZIP byte count changed: '+z.path);
  assert.equal(sha1blob(z.path),z.blobSha,'Committed historical ZIP mutated: '+z.path);
  checkedBytes+=z.bytes;
}
for(let n=23;n<=59;n++) {
  const name='release/kleinanzeigen-renewal-chrome-v1.23.'+n+'.zip';
  assert.ok(current.has(name),'Previously committed Chrome ZIP deleted: '+name);
}
const receipt='release/kleinanzeigen-oneclick-einrichtung-v1.23.36.sha256';
const kit='release/kleinanzeigen-oneclick-einrichtung-v1.23.36.zip';
assert.equal(sha1blob(receipt),current.get(receipt).blobSha,
  'Immutable Windows setup ZIP receipt modified');
assert.equal(read(receipt),sha256(kit)+'  '+path.basename(kit)+'\n',
  'Approved Windows kit receipt disagrees with committed setup ZIP');
const channel=JSON.parse(read('release/windows-updater-channel.json'));
assert.equal(channel.channel,'approved');
assert.equal(channel.schema,1);
assert.equal(channel.extensionId,'hafahjhhgiipdegfkgacchmnacgblnah');
const approved='release/kleinanzeigen-renewal-chrome-v'+channel.version+'.zip';
assert.ok(current.has(approved),'Approved updater channel has no committed archive');
assert.equal(channel.bytes,fs.statSync(abs(approved)).size,
  'Approved updater channel archive length mismatch');
assert.equal(channel.sha256,sha256(approved),
  'Approved updater channel archive SHA256 mismatch');
const spec=JSON.parse(read('release/release-spec.json'));
const pkg=JSON.parse(read('package.json'));
assert.equal(spec.version,manifest.version,'Release-spec and current extension version drift');
assert.equal(spec.packageVersion,manifest.version_name||manifest.version,'Release package name contract drift');
assert.equal(pkg.version,manifest.version,'Package manifest current version drift');
assert.ok(fs.existsSync(abs('release/kleinanzeigen-renewal-chrome-v'+(manifest.version_name||manifest.version)+'.zip')),
  'Current source version has no committed source-tested Chrome ZIP');
const windowsRecords=inv.files.filter(x=>x.path.startsWith('tools/windows/'));
assert.equal(windowsRecords.length,7);
const windowsOwners={
  'Install-KleinanzeigenRenewer-NativeHost.ps1':['tests/windows-native-host-wave1.ps1'],
  'KleinanzeigenRenewer-Updater.ps1':['tests/windows-updater-phase1.ps1','scripts/package-oneclick-setup.py'],
  'KleinanzeigenRenewer.NativeHost.cs':['tools/windows/Install-KleinanzeigenRenewer-NativeHost.ps1'],
  'Manage-KleinanzeigenRenewer-OneClick.ps1':['scripts/package-oneclick-setup.py','tests/windows-oneclick-shortcut.ps1'],
  'OneClick-Einrichtung.cmd':['scripts/package-oneclick-setup.py','tests/kar94-setup-package.cjs'],
  'OneClick-Update-KleinanzeigenRenewer.cmd':['scripts/package-oneclick-setup.py','tests/windows-oneclick-shortcut.ps1'],
  'Update-KleinanzeigenRenewer.cmd':['docs/windows/WINDOWS_UPDATER_PHASE1.md']
};
for(const r of windowsRecords) {
  assert.equal(r.disposition,'KEEP_WINDOWS_KIT');
  const base=path.basename(r.path),owners=windowsOwners[base];
  assert.ok(owners?.length,'Windows tool owner not classified: '+base);
  assert.ok(owners.some(owner=>read(owner).includes(base)),
    'No actual current Windows kit/test/guide consumer: '+base);
}
assert.equal(groups.KEEP_PACKAGED_RUNTIME,103);
assert.equal(groups.KEEP_WINDOWS_KIT,7);
assert.equal(groups.KEEP_TEST_POLICY,1);
assert.ok(read('tests/kar97-update-idle-policy.cjs').includes("../lib/update-idle-policy.js"),
  'Non-runtime idle policy still has a historical test consumer');
assert.ok(!packager.includes("'lib/update-idle-policy.js'"),
  'Test-only idle policy was accidentally bundled into Chrome runtime');
console.log('PASS KAR-167 R1 final repository closure: '+inv.files.length+
  ' original tree paths, 30 blob-identical historical moves, 3 retired tool paths, '+
  srcPaths.length+' packaged source modules, 7 Windows tools, '+
  archived.length+' release files / 38 verified immutable ZIPs ('+checkedBytes+
  ' ZIP bytes), 1 unchanged setup SHA256 receipt and approved updater channel; no identity/Gold/runtime packaging changes');
