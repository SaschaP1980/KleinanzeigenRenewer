'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {execFileSync}=require('node:child_process');
const {assertReady,nextBody,parse}=require('../scripts/kar-work-pr-preflight.cjs');
const root=path.resolve(__dirname,'..'),bt=String.fromCharCode(96);
const content=fs.readFileSync(path.join(root,'docs/templates/WORK_PATH_ROLLING_COMMENT.md'),'utf8');
const found=content.match(/~~~markdown\n([\s\S]*?)\n~~~/);
assert.ok(found,'normative template');
const a='a'.repeat(40),b='b'.repeat(40);
function fixture(){
  let doc=found[1].replaceAll('<GitHub Issue number>','52').replaceAll('<number>','52');
  for(const [key,value] of [
    ['**Base main:**',bt+'c'.repeat(40)+bt],
    ['**Work branch / exact head:**',bt+'work/KAR-52'+bt+' / '+bt+a+bt],
    ['**Current phase:**','PR READY'],
    ['**Last safe checkpoint:**','source SHA verified'],
    ['**Next action:**','Open the Draft PR after readback'],
    ['**Canonical comment ID:**','12345'],
    ['- Originating Work-Chat-ID:',bt+'KAR52CHAT91A4D2F3E680'+bt],
    ['- Marker visibly issued in chat:','yes']
  ]){
    const ls=doc.split('\n'),idx=ls.findIndex(x=>x.startsWith(key));
    assert.ok(idx>=0,'template field '+key);ls[idx]=key+' '+value;doc=ls.join('\n');
  }
  return {issue:{number:52,state:'open',title:'[KAR-52] Test'},
    comments:[{id:12345,body:doc}]};
}
function ready(d,head=a){return assertReady(d.issue,d.comments,52,head,'SaschaP1980/KleinanzeigenRenewer');}
ready(fixture());
let rejects=0;
function fail(label,act){assert.throws(act,Error,label);rejects++;}
fail('stale head',()=>ready(fixture(),b));
fail('closed issue',()=>{const d=fixture();d.issue.state='closed';ready(d);});
fail('two canonical comments',()=>{const d=fixture();d.comments.push({...d.comments[0],id:12346});ready(d);});
fail('wrong issue',()=>{const d=fixture();d.issue.number=53;ready(d);});
fail('normative section missing',()=>{const d=fixture();d.comments[0].body=d.comments[0].body.replace('### Evidence ledger','### Other');ready(d);});
fail('wrong prior',()=>nextBody(fixture().comments[0].body,52,b,a));
const changed=fixture(),prior=changed.comments[0].body;
changed.comments[0].body=nextBody(prior,52,a,b);ready(changed,b);
assert.ok(prior.includes(bt+a+bt),'original body preserved before transformation');
fail('stale repeat sync',()=>nextBody(changed.comments[0].body,52,a,b));
assert.deepEqual(parse(['--issue','52','--head-sha',a]),{issue:'52','head-sha':a});
fail('bad arguments',()=>parse(['--issue','52','--head-sha','bogus']));
const work=fs.readFileSync(path.join(root,'.github/workflows/kar-work-pr.yml'),'utf8');
assert.match(work,/for attempt in 1 2 3 4 5 6/);
assert.match(work,/KAR Work canonical contract still RED after 6 reads; FAIL CLOSED/);
assert.match(work,/node scripts\/kar-work-pr-contract\.cjs/);
assert.match(work,/Real packaged Chromium E2E \(logged-out local fixtures\)/);
const builder=fs.readFileSync(path.join(root,'.github/workflows/kar-atomic-patch.yml'),'utf8');
assert.match(builder,/workflow_dispatch:/);
assert.match(builder,/\n  push:/);
assert.ok(builder.includes("branches: ['work/KAR-*']"));
assert.ok(builder.includes("startsWith(github.event.head_commit.message, 'ci(KAR-'"));
assert.ok(builder.includes("git diff-tree --no-commit-id --name-only -r HEAD"));
assert.match(builder,/contents: write/);
assert.match(builder,/issues: write/);
assert.match(builder,/scripts\/kar-work-pr-preflight\.cjs --issue/);
assert.match(builder,/scripts\/kar-atomic-patch\.py --mode build/);
const result=execFileSync('python3',['tests/kar52-patch-builder-policy.py'],{cwd:root,encoding:'utf8',timeout:30000});
assert.match(result,/PASS KAR-52 dynamic next-PATCH/);
console.log('PASS KAR-52 reusable Work builder / canonical preflight / bounded strict PR retry; '+rejects+' comment negatives');
