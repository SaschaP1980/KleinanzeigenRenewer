'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const cp=require('node:child_process');
const root=path.resolve(__dirname,'..');
const release=fs.readFileSync(path.join(root,'.github/workflows/kar-release.yml'),'utf8');
const script=path.join(root,'scripts/release-notes.sh');
const sha='d93e46952784b7550a76baf14eeae9a9e8ac2870';
const digest='d4f6af40b9634c6cf97c9e74015f645ea9df5d705ecf6f573680b36b615da442';
const values={VERSION:'1.23.22',MODE:'fast',GITHUB_SHA:sha,ZIP_BYTES:'751444',ZIP_SHA256:digest};
const run=(values)=>cp.spawnSync('bash',[script],{cwd:root,env:{...process.env,...values},encoding:'utf8'});
const actual=run(values);
assert.equal(actual.status,0,actual.stderr);
const expected=[
  'Kleinanzeigen Renewer v1.23.22','',
  '- Source authority: Git commit `'+sha+'`',
  '- Development path: `fast`',
  '- Chrome ZIP bytes: `751444`',
  '- Chrome ZIP SHA-256: `'+digest+'`',
  '- Dynamic Public Function Coverage: mandatory 100% gate passed',
  '- Native real-account smoke: not performed by hosted CI',''
].join('\n');
assert.equal(actual.stdout,expected,'release body must retain every literal Markdown metadata value');
for(const [field,bad] of [['GITHUB_SHA','$(echo UNSAFE)'],['MODE','unsafe'],['ZIP_BYTES','nan'],['ZIP_SHA256','broken'],['VERSION','1.23.22;bad']]){
 const r=run({...values,[field]:bad});
 assert.notEqual(r.status,0,'reject invalid '+field);
 assert.ok(!r.stdout.includes('UNSAFE'),'no shell expansion of invalid SHA');
}
assert.match(release,/bash scripts\/release-notes\.sh > "\$NOTES"/);
assert.match(release,/Publish one lean GitHub Release asset\s*\n\s*env:\s*\n\s*GH_TOKEN:\s*\$\{\{ github\.token \}\}\s*\n\s*MODE:\s*\$\{\{ inputs\.mode \}\}/);
assert.match(release,/gh release create "v\$VERSION"/);
assert.ok(!fs.existsSync(path.join(root,'.github/workflows/kar-release-dispatch-once.yml')),'the consumed owner-release dispatcher must be removed');
assert.ok(!fs.existsSync(path.join(root,'.github/workflows/kar-release-notes-repair-once.yml')),'the single-use release-notes repair workflow must be removed after verified metadata correction');
console.log('PASS release notes: literal SHA/path/size/digest, 5 fail-closed inputs, publisher wiring, one-shot dispatcher removed');
