'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
const OWNERS=['package.json','scripts/build.sh','scripts/coverage-gate.sh','.github/workflows/kar-work-pr.yml','.github/workflows/kar-ci.yml','.github/workflows/kar-release.yml'];
const LEDGER='docs/maintenance/KAR217_UPDATER_TEST_DISPOSITIONS.json';
const EXPECTED=[
  {
    "test": "tests/kar68-native-status-gateway.cjs",
    "blob": "a463f234b851a51f84efe53e57c08815845151bd",
    "owners": [
      "package.json",
      ".github/workflows/kar-work-pr.yml",
      ".github/workflows/kar-ci.yml"
    ]
  },
  {
    "test": "tests/kar69-native-check.cjs",
    "blob": "9a7f636e779a5016662d1be68955de3cff1983d3",
    "owners": [
      "package.json"
    ]
  },
  {
    "test": "tests/kar81-native-fallback.cjs",
    "blob": "efce0fc42de53f7b5f94e47dcb72a0a57b6e1d9a",
    "owners": [
      ".github/workflows/kar-work-pr.yml"
    ]
  },
  {
    "test": "tests/kar85-updater-modal.cjs",
    "blob": "78c151cf773a4c0269559cab0c87047cb68dd422",
    "owners": [
      "package.json"
    ]
  },
  {
    "test": "tests/kar86-approved-channel.cjs",
    "blob": "a2ff1af4458152f407a1e292c282da850a1dff5d",
    "owners": [
      "package.json"
    ]
  },
  {
    "test": "tests/kar90-updater-ux.cjs",
    "blob": "db16d4ed81dda231ab4b225e0089a7815e3c29db",
    "owners": [
      "package.json"
    ]
  },
  {
    "test": "tests/kar91-english-console.cjs",
    "blob": "4cd364da2a22e84556709ec8c122b25259dc5fa2",
    "owners": [
      "package.json"
    ]
  },
  {
    "test": "tests/kar94-setup-package.cjs",
    "blob": "9b676f8deebaf9754c2ed43bb5cfeda016e811ab",
    "owners": [
      "package.json"
    ]
  },
  {
    "test": "tests/windows-updater-phase1.ps1",
    "blob": "e862741815bcfaaad8f92c39c402723bf578bbfa",
    "owners": [
      ".github/workflows/kar-work-pr.yml",
      ".github/workflows/kar-ci.yml"
    ]
  },
  {
    "test": "tests/windows-native-host-wave1.ps1",
    "blob": "7f1b60fecf0509a9a971e7bc56962d6b6f379472",
    "owners": [
      ".github/workflows/kar-work-pr.yml",
      ".github/workflows/kar-ci.yml"
    ]
  },
  {
    "test": "tests/windows-oneclick-shortcut.ps1",
    "blob": "4ef485ee2c44521c0f773a2668f7333382c90249",
    "owners": [
      ".github/workflows/kar-work-pr.yml",
      ".github/workflows/kar-ci.yml"
    ]
  },
  {
    "test": "tests/kar99-p13-windows-journal-inspection.ps1",
    "blob": "64f2675eeee6326b05dec7c42c56e8daf3434779",
    "owners": [
      ".github/workflows/kar-work-pr.yml"
    ]
  }
];
const normalize=s=>s.replace(/\\/g,'/').replace(/\/{2,}/g,'/');
const blob=b=>crypto.createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex');
function validateS04Dispositions(dir=root){
 const read=p=>fs.readFileSync(path.join(dir,p)),j=p=>JSON.parse(read(p));
 const l=j(LEDGER);assert.equal(l.issue,217);assert.equal(l.step,'S04');assert.equal(l.sourceCommit,'a88a3446560cb36c87a3ace599a0bbd0549c6f41');
 assert.deepEqual(l.entries.map(({test,blob,owners})=>({test,blob,owners})),EXPECTED,'only reviewed exact updater test/owner pairs');
 const safety=j('coverage/safety-critical-public-apis.json');assert.equal(safety.apis.length,15);
 const refs=new Map(OWNERS.map(p=>[p,normalize(read(p).toString())]));
 const retired=new Map();
 for(const e of l.entries){
  assert.equal(e.status,'retired-updater-S04');assert.ok(e.reason.length>30);
  assert.equal(blob(read(e.test)),e.blob,'historical test altered: '+e.test);
  assert.ok(!safety.apis.some(a=>a.tests.includes(e.test)),'cannot retire a product safety test');
  for(const [owner,source] of refs)assert.ok(!source.includes(e.test),'obsolete updater test remains active: '+owner+' -> '+e.test);
  retired.set(e.test,e);
 }
 for(const p of ['tests/kar217-updater-removal.cjs','tests/kar213-cross-generation-characterization.cjs','tests/kar213-offline-upgrade-preflight.cjs'])assert.ok(refs.get('package.json').includes(p),'required product test missing '+p);
 return retired;
}
if(require.main===module){const r=validateS04Dispositions();console.log('PASS KAR-217 exact retired updater test scope '+r.size+' historical tests; no execution credit');}
module.exports={validateS04Dispositions,LEDGER};
