'use strict';
// KAR-210: validate reviewed inactive suites statically; no skip-test runner.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');

const RULES = Object.freeze({
  "tests/kar97-update-idle-policy.cjs": {
    "module": "lib/update-idle-policy.js",
    "matrix": "C02",
    "step": "S04",
    "status": "excluded-C",
    "owner": "package.json",
    "retained": [
      "tests/v1234-insertion-lock-runtime.cjs",
      "tests/v1238-account-session-controller-runtime.cjs",
      "tests/v1238-profile-management-controller-runtime.cjs"
    ]
  },
  "tests/kar134-schema-core.cjs": {
    "module": "src/shared/template-schema-core.js",
    "matrix": "A03",
    "step": "S05",
    "status": "deferred-A",
    "owner": "package.json",
    "retained": [
      "tests/v12322-title-field-stability.cjs",
      "tests/kar132-modern-category-modal.cjs",
      "tests/kar132-wearables-attributes.cjs"
    ]
  },
  "tests/kar195-startup-atomic-fairness.cjs": {
    "module": "src/background/services/cross-worker-atomic-admission.js",
    "matrix": "C03/C05",
    "step": "S04/S07",
    "status": "split-C",
    "owner": "scripts/coverage-gate.sh",
    "retained": [
      "tests/v12217-trash-template-ui-recovery-runtime.cjs",
      "tests/v12218-trash-template-recovery-runtime.cjs",
      "tests/v12219-trash-template-session-isolation-runtime.cjs",
      "tests/v12220-trash-template-preview-recovery-runtime.cjs",
      "tests/v12317c2-trash-template-modal-reopen.cjs"
    ]
  },
  "tests/kar103-startup-owner-map.cjs": {
    "module": "lib/update-idle-policy.js",
    "matrix": "C02",
    "step": "S04",
    "status": "excluded-C",
    "owner": "package.json",
    "retained": [
      "tests/v1156-a1-tab-registry-runtime.cjs",
      "tests/v1183-trash-runtime.cjs",
      "tests/v1194-reconciliation-fresh-source-runtime.cjs"
    ]
  },
  "tests/kar105-persisted-owner-observer.cjs": {
    "module": "src/background/services/persisted-owner-observer.js",
    "matrix": "C02",
    "step": "S04/S06",
    "status": "excluded-C",
    "owner": "package.json",
    "retained": [
      "tests/v1234-insertion-lock-runtime.cjs",
      "tests/v1238-account-session-controller-runtime.cjs",
      "tests/v1238-profile-management-controller-runtime.cjs",
      "tests/v1231-renewal-workflow-runtime.cjs",
      "tests/v1233-mass-renewal-workflow-runtime.cjs"
    ]
  },
  "tests/kar99-atomic-mv3-admission.cjs": {
    "module": "src/background/services/cross-worker-atomic-admission.js",
    "matrix": "C03",
    "step": "S04/S06",
    "status": "excluded-C",
    "owner": "package.json",
    "retained": [
      "tests/v1234-insertion-lock-runtime.cjs",
      "tests/v1238-account-session-controller-runtime.cjs",
      "tests/v1238-profile-management-controller-runtime.cjs",
      "tests/v1231-renewal-workflow-runtime.cjs",
      "tests/v1233-mass-renewal-workflow-runtime.cjs"
    ]
  },
  "tests/kar99-p8-adversarial-races.cjs": {
    "module": "src/background/services/cross-worker-atomic-admission.js",
    "matrix": "C03",
    "step": "S04/S06",
    "status": "excluded-C",
    "owner": "package.json",
    "retained": [
      "tests/v1234-insertion-lock-runtime.cjs",
      "tests/v1238-account-session-controller-runtime.cjs",
      "tests/v1238-profile-management-controller-runtime.cjs",
      "tests/v1231-renewal-workflow-runtime.cjs",
      "tests/v1233-mass-renewal-workflow-runtime.cjs"
    ]
  },
  "tests/kar99-p9-benign-start-contention.cjs": {
    "module": "src/background/services/cross-worker-atomic-admission.js",
    "matrix": "C03",
    "step": "S04",
    "status": "excluded-C",
    "owner": "package.json",
    "retained": [
      "tests/v1234-insertion-lock-runtime.cjs",
      "tests/v1238-account-session-controller-runtime.cjs",
      "tests/v1238-profile-management-controller-runtime.cjs",
      "tests/v1231-renewal-workflow-runtime.cjs",
      "tests/v1233-mass-renewal-workflow-runtime.cjs"
    ]
  },
  "tests/kar197-publish-intent-contention.cjs": {
    "module": "src/background/services/auto-publish-intent-journal.js",
    "matrix": "C04",
    "step": "S04/S06/S07",
    "status": "excluded-C",
    "owner": "package.json",
    "retained": [
      "tests/v12226-paid-insertion-regression.cjs",
      "tests/v12317c1-template-module-public-api.cjs",
      "tests/v12315-runtime.cjs",
      "tests/v1235-archive-insertion-controller-runtime.cjs"
    ]
  },
  "tests/kar199-phase4-journal-contention.cjs": {
    "module": "src/background/services/phase4-uncertainty-journal.js",
    "matrix": "C04",
    "step": "S04/S06",
    "status": "excluded-C",
    "owner": "package.json",
    "retained": [
      "tests/v12318-inventory-module-public-api.cjs",
      "tests/v12019-phase3-edit-authority.cjs",
      "tests/v12315-runtime.cjs",
      "tests/v1194-reconciliation-fresh-source-runtime.cjs"
    ]
  },
  "tests/kar148-article-type.cjs": {
    "module": "src/app/inventory-card-renderer.js",
    "matrix": "B01",
    "step": "S08",
    "status": "deferred-B",
    "owner": "package.json",
    "retained": [
      "tests/kar210-baseline-retained-behavior.cjs",
      "tests/v12314-runtime.cjs"
    ],
    "featureAbsence": {
      "marker": "makeInfoLine('Artikeltyp'",
      "baselineBlob": "f3cc492f85469cc62a33f812fe5a5b2dcd2db726",
      "donorBlob": "d4381c4aa64f8532484daa5992a25249244cf774",
      "donorCommit": "4d7ae5130730776927748e2517fdf9aadaf098cd"
    }
  },
  "tests/kar150-ui-preference.cjs": {
    "module": "src/app/mass-renewal-ui-controller.js",
    "matrix": "B04",
    "step": "S08",
    "status": "deferred-B",
    "owner": "package.json",
    "retained": [
      "tests/v1233-mass-renewal-workflow-runtime.cjs",
      "tests/v1238-account-session-controller-runtime.cjs",
      "tests/v12226-paid-insertion-regression.cjs"
    ],
    "featureAbsence": {
      "marker": "massRenewalStopOnErrorPreferenceV1",
      "baselineBlob": "813aedc109538d3afb387f6f47648bdfe12fe303",
      "donorBlob": "1c22cb5bd91623337164744046fbc03622839c68",
      "donorCommit": "4d7ae5130730776927748e2517fdf9aadaf098cd"
    }
  },
  "tests/kar164-trash-sort.cjs": {
    "module": "src/app/inventory-view.js",
    "matrix": "B07",
    "step": "S09",
    "status": "deferred-B",
    "owner": "package.json",
    "retained": [
      "tests/kar210-baseline-retained-behavior.cjs",
      "tests/v12314-runtime.cjs",
      "tests/v1183-trash-runtime.cjs"
    ],
    "featureAbsence": {
      "marker": "deriveTrashView",
      "baselineBlob": "da0c66d512f939c1acf5285995ca6f6057154826",
      "donorBlob": "932da5bec1449715771a53221912e025ad001928",
      "donorCommit": "4d7ae5130730776927748e2517fdf9aadaf098cd"
    }
  },
  "tests/kar165-trash-retention-warning.cjs": {
    "module": "src/app/app.css",
    "matrix": "B06",
    "step": "S09",
    "status": "deferred-B",
    "owner": "scripts/coverage-gate.sh",
    "retained": [
      "tests/kar210-baseline-retained-behavior.cjs",
      "tests/v1183-trash-runtime.cjs"
    ],
    "featureAbsence": {
      "marker": "trash-retention-countdown-urgent",
      "baselineBlob": "4d69502577fd25ad94ac7a6dd80c9cc3a45afbe0",
      "donorBlob": "39248c01f41a7a1410411c7965624e525926b2ac",
      "donorCommit": "4d7ae5130730776927748e2517fdf9aadaf098cd"
    }
  },
  "tests/kar147-diagnostic-occupancy.cjs": {
    "module": "src/background/services/diagnostics-service.js",
    "matrix": "B10",
    "step": "S10",
    "status": "deferred-B",
    "owner": "package.json",
    "retained": [
      "tests/kar210-baseline-retained-behavior.cjs",
      "tests/v1177-performance1-diagnostics.cjs",
      "tests/v1200-diagnostic-reset.cjs",
      "tests/v1237-diagnostic-export-runtime.cjs"
    ],
    "featureAbsence": {
      "marker": "async function occupancy",
      "baselineBlob": "5c7f8f8d74a9fdbb47843a69a70a32fc1e7a7d94",
      "donorBlob": "7200c95284718a167013aabd045be4789b7c0c75",
      "donorCommit": "4d7ae5130730776927748e2517fdf9aadaf098cd"
    }
  }
});
const OWNERS = Object.freeze(["package.json","scripts/build.sh","scripts/coverage-gate.sh",".github/workflows/kar-work-pr.yml",".github/workflows/kar-ci.yml",".github/workflows/kar-release.yml"]);
const LEDGER = 'docs/maintenance/KAR210_ACTIVE_TEST_DISPOSITIONS.json';
const WITNESS = 'tests/kar210-trash-template-recovery-coalescing.cjs';
const ORIGINAL = 'tests/kar195-startup-atomic-fairness.cjs';
const gitBlob = b => crypto.createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex');
const normalize = s => s.replace(/\\/g,'/').replace(/\/{2,}/g,'/');
const references = s => new Set([...normalize(s).matchAll(/tests\/[A-Za-z0-9_.\/-]+\.(?:cjs|mjs|js|py|ps1|json|sh|txt)/g)].map(m=>m[0]));

function validateDispositions(root) {
  const file = rel => path.join(root,rel);
  const read = rel => fs.readFileSync(file(rel));
  const json = rel => JSON.parse(read(rel));
  const version = execFileSync('python3',[file('scripts/product_version.py'),'--root',root],{encoding:'utf8'}).trim();
  assert.equal(version,'2.0.0.0','Scope is the reviewed S02 baseline; reconcile explicitly before a successor');
  const ledger=json(LEDGER);
  assert.equal(ledger.schema,2);
  assert.equal(ledger.issue,210);
  assert.equal(ledger.version,version);
  assert.deepEqual(ledger.entries.map(e=>e.test).sort(),Object.keys(RULES).sort(),'Missing, duplicate or unreviewed disposition');
  const source=json('docs/maintenance/KAR210_BASELINE_RESTORE_LEDGER.json');
  const target=json('docs/maintenance/KAR210_BASELINE_TARGET.json');
  assert.equal(source.issue,210);
  assert.equal(target.issue,210);
  assert.equal(target.version,version);
  const safety=json('coverage/safety-critical-public-apis.json');
  assert.ok(Array.isArray(safety.apis)&&safety.apis.length>=15,'Missing safety reference evidence');
  const commands=json('package.json').scripts.test.split(' && ');
  const ownerRefs=new Map(OWNERS.map(owner=>[owner,references(read(owner).toString())]));
  const allowlist=read('scripts/package.py').toString().split(/\r?\n/).find(s=>s.startsWith('runtime='));
  assert.ok(allowlist,'Missing explicit runtime packaging array');
  const packaged=[...allowlist.matchAll(/'([^']+)'/g)].map(m=>m[1]);
  assert.deepEqual(packaged,target.packaged,'Baseline package scope drift');
  const inactive=new Map();
  for(const e of ledger.entries) {
    const expected=RULES[e.test];
    for(const key of ['module','matrix','step','status','owner']) assert.equal(e[key],expected[key],'Unreviewed '+key+' for '+e.test);
    assert.deepEqual(e.retained,expected.retained);
    assert.ok(typeof e.reason==='string'&&e.reason.length>40);
    const record=source.tests.find(r=>r.path===e.test);
    assert.equal(record?.workBlob,e.blob,'Original test provenance mismatch');
    assert.match(e.blob,/^[a-f0-9]{40}$/);
    assert.equal(gitBlob(read(e.test)),e.blob,'Historical test source changed');
    assert.deepEqual(e.featureAbsence,expected.featureAbsence,'Unreviewed feature absence evidence');
    if(e.featureAbsence) {
      const proof=e.featureAbsence;
      assert.equal(e.status,'deferred-B');
      assert.equal(target.expected.find(r=>r.path===e.module)?.sha,proof.baselineBlob,'Missing exact historical feature source');
      assert.equal(gitBlob(read(e.module)),proof.baselineBlob,'Baseline capability source changed; re-evaluate disposition');
      assert.ok(packaged.includes(e.module)&&!target.absent.includes(e.module));
      assert.ok(!read(e.module).toString().includes(proof.marker),'Deferred capability already present');
      assert.match(proof.donorBlob,/^[a-f0-9]{40}$/);
      assert.equal(proof.donorCommit,'4d7ae5130730776927748e2517fdf9aadaf098cd');
    } else {
      assert.ok(target.absent.includes(e.module)&&source.laterPackageEntries.some(r=>r.path===e.module),'Excluded implementation lacks exact source disposition');
      assert.ok(!fs.existsSync(file(e.module))&&!packaged.includes(e.module),'Excluded or deferred implementation present');
    }
    assert.ok(!safety.apis.some(api=>api.tests.includes(e.test)),'Safety-critical negative cannot be dispositioned');
    for(const [owner,refs] of ownerRefs) assert.ok(!refs.has(e.test),'Inactive test still referenced by '+owner+': '+e.test);
    for(const retained of e.retained) {
      assert.ok(fs.statSync(file(retained)).isFile(),'Retained baseline test absent: '+retained);
      assert.ok(commands.includes('node '+retained)||commands.includes('node --test '+retained),'Retained baseline test not invoked: '+retained);
    }
    inactive.set(e.test,e);
  }
  assert.equal(ledger.deferredWitnesses.length,1,'Unexpected deferred product witnesses');
  const witness=ledger.deferredWitnesses[0];
  assert.equal(witness.test,WITNESS);
  assert.equal(witness.sourceTest,ORIGINAL);
  assert.equal(witness.status,'deferred-product');
  assert.equal(witness.step,'S07');
  assert.equal(witness.redRun,45499893107);
  assert.equal(witness.redJob,138820077250);
  assert.equal(witness.expected,1); assert.equal(witness.actual,8);
  assert.equal(gitBlob(read(WITNESS)),witness.blob,'Deferred witness source changed');
  const original=read(ORIGINAL).toString();
  const block=original.match(/test\('KAR-195 duplicate passive[\s\S]*?(?=\ntest\('KAR-195 P8 timing)/)?.[0];
  assert.ok(block && read(WITNESS).toString().endsWith(block),'Exact independent product witness lost');
  assert.ok(!safety.apis.some(api=>api.tests.includes(WITNESS)),'Safety-critical witness cannot be inactive');
  for(const [owner,refs] of ownerRefs) assert.ok(!refs.has(WITNESS),'Deferred witness is still active: '+owner);
  inactive.set(WITNESS,witness);
  return inactive;
}
if(require.main===module) {
  assert.equal(process.argv.length,2,'Scope validator does not run or skip product tests');
  const inactive=validateDispositions(path.resolve(__dirname,'..'));
  console.log('PASS KAR-210 inactive suite scope: '+(inactive.size-1)+' reviewed historical suites, 1 deferred product witness; no product execution credit');
}
module.exports={validateDispositions};
