'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { validateContract } = require('../scripts/kar-work-pr-contract.cjs');
const BT = String.fromCharCode(96);
const ROOT = path.resolve(__dirname, '..');
const template = fs.readFileSync(path.join(ROOT, 'docs/templates/WORK_PATH_ROLLING_COMMENT.md'), 'utf8');
const scaffold = template.match(/~~~markdown\n([\s\S]*?)\n~~~/);
assert.ok(scaffold, 'normative template must contain a complete scaffold');
const headSha = 'a'.repeat(40);
const baseSha = 'b'.repeat(40);
function fixture() {
  let body = scaffold[1].replaceAll('<GitHub Issue number>', '22').replaceAll('<number>', '22');
  function replaceLine(prefix, value) {
    const lines = body.split('\n');
    const idx = lines.findIndex(line => line.startsWith(prefix));
    assert.notEqual(idx, -1, 'template missing ' + prefix);
    lines[idx] = prefix + ' ' + value;
    body = lines.join('\n');
  }
  replaceLine('**Base main:**', BT + baseSha + BT);
  replaceLine('**Work branch / exact head:**', BT + 'work/KAR-22' + BT + ' / ' + BT + headSha + BT);
  replaceLine('**Current phase:**', 'PR');
  replaceLine('**Last safe checkpoint:**', BT + headSha + BT + ' / latest verified checkpoint');
  replaceLine('**Next action:**', 'Verify the current pull request checks.');
  replaceLine('**Canonical comment ID:**', '12345');
  replaceLine('- Originating Work-Chat-ID:', BT + 'KAR22CHATABCDEF012345' + BT);
  replaceLine('- Marker visibly issued in chat:', 'yes');
  return {
    issue: { number: 22, state: 'open', title: '[KAR-22] Contract validation' },
    comments: [{ id: 12345, body }],
    headRef: 'work/KAR-22',
    headSha,
    prBody: 'Implementation of process contract.\n\nCloses #22',
    repositoryFullName: 'SaschaP1980/KleinanzeigenRenewer'
  };
}
assert.doesNotThrow(() => validateContract(fixture()), 'fully instantiated normative scaffold must pass');
let rejected = 0;
function rejects(name, mutate) {
  const input = fixture();
  mutate(input);
  assert.throws(() => validateContract(input), Error, name + ' must fail closed');
  rejected++;
}
rejects('no marked comment', input => { input.comments = []; });
rejects('two marked comments', input => { input.comments.push({ ...input.comments[0], id: 999 }); });
rejects('two markers within one comment', input => { input.comments[0].body += '\n<!-- KAR-ROLLING-COMMENT -->'; });
rejects('closed issue', input => { input.issue.state = 'closed'; });
rejects('missing Issue title prefix', input => { input.issue.title = 'Incorrect'; });
rejects('wrong Issue title prefix', input => { input.issue.title = '[KAR-23] Wrong number'; });
rejects('duplicate Issue title prefix', input => { input.issue.title = '[KAR-22] [KAR-22] Duplicate'; });
rejects('PR masquerading as Issue', input => { input.issue.pull_request = { url: 'https://api.github.com/repos/a/b/pulls/22' }; });
rejects('wrong issue identity', input => { input.issue.number = 23; });
rejects('incorrect heading number', input => { input.comments[0].body = input.comments[0].body.replace('## KAR-22 — Rolling Development State', '## KAR-23 — Rolling Development State'); });
rejects('incorrect canonical Issue URL', input => { input.comments[0].body = input.comments[0].body.replace('/issues/22)', '/issues/23)'); });
rejects('incorrect branch', input => { input.headRef = 'work/KAR-23'; });
rejects('wrong branch in comment', input => { input.comments[0].body = input.comments[0].body.replace(BT + 'work/KAR-22' + BT + ' /', BT + 'work/KAR-23' + BT + ' /'); });
rejects('stale head SHA', input => { input.comments[0].body = input.comments[0].body.replace(headSha, 'c'.repeat(40)); });
rejects('invalid head SHA', input => { input.headSha = 'not-a-sha'; });
rejects('missing PR closing reference', input => { input.prBody = 'Mentions #22'; });
rejects('different PR closing reference', input => { input.prBody = 'Closes #223'; });
rejects('missing exact scope heading', input => { input.comments[0].body = input.comments[0].body.replace('\n### Authorization and scope\n', '\n### Authorization and scope notes\n'); });
rejects('missing exact failure heading', input => { input.comments[0].body = input.comments[0].body.replace('\n### Failures, corrections and risks\n', '\n### Failures, corrections and risks extra\n'); });
rejects('missing Work-Chat-ID', input => { input.comments[0].body = input.comments[0].body.replace('KAR22CHATABCDEF012345', 'unknown'); });
rejects('missing readback ID', input => { input.comments[0].body = input.comments[0].body.replace('**Canonical comment ID:** 12345', '**Canonical comment ID:** pending'); });
rejects('unsafe empty next action', input => { input.comments[0].body = input.comments[0].body.replace('**Next action:** Verify the current pull request checks.', '**Next action:** '); });
rejects('missing visible origin acknowledgement', input => { input.comments[0].body = input.comments[0].body.replace('- Marker visibly issued in chat: yes', '- Marker visibly issued in chat: no'); });
const workflow = fs.readFileSync(path.join(ROOT, '.github/workflows/kar-work-pr.yml'), 'utf8');
assert.match(workflow, /node scripts\/kar-work-pr-contract\.cjs/, 'PR workflow must execute shared validator');
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
assert.ok(pkg.scripts.test.includes('node tests/kar-work-pr-contract.cjs'), 'contract test must run in mandatory coverage gate');
console.log('PASS KAR-22 normative rolling scaffold and ' + rejected + ' strict fail-closed cases');
