'use strict';

const assert = require('node:assert/strict');
const { validateIssueTitle } = require('../scripts/kar-issue-title.cjs');

const good = { number: 26, title: '[KAR-26] [Wave 02] Issue title validation', state: 'open', body: 'unchanged' };
assert.deepEqual(validateIssueTitle(good), { kind: 'issue', number: 26 });
assert.equal(good.title, '[KAR-26] [Wave 02] Issue title validation', 'validation must be read-only');

let failures = 0;
function rejects(label, issue) {
  assert.throws(() => validateIssueTitle(issue), Error, label + ' must fail closed');
  failures++;
}
rejects('missing prefix', { number: 26, title: 'Issue title validation' });
rejects('wrong number', { number: 26, title: '[KAR-25] Issue title validation' });
rejects('non-leading prefix', { number: 26, title: '[UI] [KAR-26] Issue title validation' });
rejects('duplicate same prefix', { number: 26, title: '[KAR-26] [KAR-26] Duplicate' });
rejects('duplicate other prefix', { number: 26, title: '[KAR-26] [KAR-999] Duplicate' });
rejects('empty title', { number: 26, title: '' });
rejects('prefix only', { number: 26, title: '[KAR-26]' });
rejects('blank suffix', { number: 26, title: '[KAR-26]   ' });
rejects('leading zero', { number: 26, title: '[KAR-026] Bad canonical number' });
rejects('missing issue number', { title: '[KAR-26] Missing issue identity' });
rejects('non-numeric issue number', { number: 'oops', title: '[KAR-26] Bad issue identity' });
rejects('newline injection', { number: 26, title: '[KAR-26] Valid\nFake title' });
rejects('leading whitespace', { number: 26, title: ' [KAR-26] Not at start' });
rejects('missing separator', { number: 26, title: '[KAR-26]No separator' });

const pr = { number: 38, title: 'docs: free-form PR title', pull_request: { url: 'https://api.github.com/repos/a/b/pulls/38' }, body: 'do not alter' };
const before = JSON.stringify(pr);
assert.deepEqual(validateIssueTitle(pr), { kind: 'pull_request', checked: false },
  'GitHub Pull Requests share issue numbers but must not be subject to Issue-title validation');
assert.equal(JSON.stringify(pr), before, 'PR metadata must remain unchanged');
assert.throws(() => validateIssueTitle(null), /invalid/i);

console.log('PASS KAR-26 issue-title validator: valid Issue, PR excluded, ' + failures + ' strict negative cases');
