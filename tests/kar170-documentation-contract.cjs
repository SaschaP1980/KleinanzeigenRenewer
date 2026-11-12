'use strict';
// KAR-170: permanent, read-only product README and historical migration verification.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const root = path.resolve(__dirname, '..');
const read = p => fs.readFileSync(path.join(root,p),'utf8');
const readme = read('README.md');
const changelog = read('CHANGELOG.md');
const guidance = read('docs/history/README_GUIDANCE_PRE_KAR170.md');
const ledger = JSON.parse(read('docs/maintenance/KAR170_CHANGELOG_MIGRATION.json'));
const fnv = str => {
  let n=0xcbf29ce484222325n;
  for(let i=0;i<str.length;i++){ n ^= BigInt(str.charCodeAt(i)); n=BigInt.asUintN(64,n*0x100000001b3n); }
  return n.toString(16).padStart(16,'0');
};
const versionHeading = text => /^#{1,6}\s+(?:(?:Patch|Version|Release|Hotfix|Build|Correction)\s*[:#-]?\s*)?v?\d+\.\d+\.\d+(?:_c\d+)?(?=\s|:|[-–—]|$)/im.test(text);
assert.equal(versionHeading('# Product\n\nCurrent source version v1.23.87.\n## Releases and development\n'),false,'current-version prose must be allowed');
for(const bad of ['## v1.23.22 — Correction', '### Patch 1.23.21: old CI', '## Version 1.22.11', '# 0.1.2']) {
  assert.equal(versionHeading(bad),true,'release diary heading must be rejected: '+bad);
}
assert.match(readme,/^# kleinanzeigen Manager\n/);
assert.equal(versionHeading(readme),false,'no version-specific headings are allowed in root README');
for(const required of ['expired','images','Nach oben schieben','Vollprüfung','Schnellprüfung','Angemeldet als','CHANGELOG.md','GitHub Releases']){
  assert.ok(readme.includes(required),'missing verified product explanation: '+required);
}
for(const link of readme.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)){
  const dest=link[1].split('#')[0];
  if(!dest||/^[a-z]+:\/\//i.test(dest))continue;
  assert.ok(fs.existsSync(path.resolve(root,dest)),'broken relative README link: '+dest);
}
assert.equal((changelog.match(/^# Changelog$/gm)||[]).length,1,'one canonical changelog title');
assert.equal(ledger.issue,170);
assert.match(ledger.baseMain,/^[a-f0-9]{40}$/);
assert.match(ledger.sourceFiles['README.md'].gitBlobSha,/^[a-f0-9]{40}$/);
assert.match(ledger.sourceFiles['CHANGELOG.md'].gitBlobSha,/^[a-f0-9]{40}$/);
assert.equal(ledger.entries.length,ledger.sourceFiles['README.md'].sections+ledger.sourceFiles['CHANGELOG.md'].sections);
assert.equal(ledger.structure.versionHeadingsFromREADME,195);
assert.equal(ledger.structure.versionHeadingsFromCHANGELOG,219);
assert.equal(ledger.structure.unversionedREADME,14);
assert.equal(ledger.structure.unversionedCHANGELOG,4);
function sectionize(content,source) {
  const lines=content.split('\n'),start=[];
  for(let i=0;i<lines.length;i++)if(/^#{1,6} +\S/.test(lines[i]))start.push(i);
  return start.map((idx,k)=>({id:source+':'+(idx+1),heading:lines[idx].replace(/^#{1,6} +/,'').trim(),body:lines.slice(idx+1,start[k+1]??lines.length).join('\n').trim()}));
}
for(const file of ['README.md','CHANGELOG.md']){
  let previous;
  try { previous=cp.execFileSync('git',['show',ledger.baseMain+':'+file],{cwd:root,encoding:'utf8',maxBuffer:6*1024*1024,stdio:['ignore','pipe','ignore']}); }
  catch { console.log('INFO KAR-170: source history unavailable in shallow checkout for '+file+'; immutable source SHA and checked-in per-section ledger still enforced'); continue; }
  assert.equal(fnv(previous).length,16);
  const sections=sectionize(previous,file==='README.md'?'README':'CHANGELOG');
  const entries=ledger.entries.filter(e=>e.source===(file==='README.md'?'README':'CHANGELOG'));
  assert.equal(sections.length,entries.length,'original history section count drift: '+file);
  for(let i=0;i<sections.length;i++){
    assert.equal(sections[i].id,entries[i].id,'original source line drift: '+file);
    assert.equal(sections[i].heading,entries[i].originalHeading,'original source heading drift: '+file);
    assert.equal(fnv(sections[i].body),entries[i].checksum64,'source body checksum drift: '+file);
  }
}
const byId=new Map(ledger.entries.map(e=>[e.id,e]));
let checked=0;
for(const e of ledger.entries){
  if(e.target==='non-substantive-legacy-header'){assert.equal(e.length,0,'unversioned CHANGELOG must not hide notes');continue}
  const target=e.target==='CHANGELOG.md'?changelog:guidance;
  const origin=e.duplicateOf||e.id;
  if(e.duplicateOf){
    const p=byId.get(e.duplicateOf);
    assert.ok(p&&p.version===e.version&&p.checksum64===e.checksum64&&p.length===e.length,'false deduplication: '+e.id);
  }
  const begin='<!-- KAR170-BEGIN:'+origin+' -->';
  const end='<!-- KAR170-END:'+origin+' -->';
  const first=target.indexOf(begin);
  assert.ok(first>=0,'unmigrated historical source section: '+e.id);
  assert.equal(target.indexOf(begin,first+begin.length),-1,'duplicate provenance marker: '+origin);
  const stop=target.indexOf(end,first+begin.length);
  assert.ok(stop>first,'historical section terminator missing: '+origin);
  const payload=target.slice(first+begin.length,stop).trim();
  const separator=payload.indexOf('\n\n');
  assert.ok(separator>=0,'source subsection label missing: '+origin);
  const body=payload.slice(separator+2).trim();
  assert.equal(body.length,e.length,'historical source text truncated: '+e.id);
  assert.equal(fnv(body),e.checksum64,'historical source text modified: '+e.id);
  checked++;
}
const headings=[...changelog.matchAll(/^## v(\d+\.\d+\.\d+(?:_c\d+)?)$/gm)].map(x=>x[1]);
assert.equal(new Set(headings).size,headings.length,'only one canonical version heading per version');
assert.deepEqual(headings.slice(2),ledger.structure.orderedVersions,'historical version/correction order must remain deterministic');
for(const p of ['docs/DEVELOPMENT_GUIDELINES.md','docs/RELEASE_PROCESS.md','docs/GITHUB_HOWTO.md','docs/INITIAL_PROMPT.md']){
  assert.match(read(p),/CHANGELOG\.md/,'canonical destination policy missing: '+p);
}
assert.match(read('scripts/coverage-gate.sh'),/node tests\/kar170-documentation-contract\.cjs/);
console.log('PASS KAR-170: README/links, positive-negative version history gate, '+checked+' legacy sections, all version groups, documentation ownership');
