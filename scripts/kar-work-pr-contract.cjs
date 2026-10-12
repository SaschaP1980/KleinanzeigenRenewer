#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const BT = String.fromCharCode(96);
const MARKER = '<!-- KAR-ROLLING-COMMENT -->';
const HEADINGS = Object.freeze([
  '### Chat origin',
  '### Authorization and scope',
  '### Current implementation state',
  '### Validation and test-first evidence',
  '### Failures, corrections and risks',
  '### Evidence ledger',
  '### PR / merge / release state',
  '### Recovery checkpoint',
  '### Plan-conformance assessment'
]);

function requireCondition(ok, reason) {
  if (!ok) throw new Error(reason);
}

function validateContract({ issue, comments, headRef, headSha, prBody, repositoryFullName }) {
  const number = Number(issue?.number);
  requireCondition(Number.isSafeInteger(number) && number > 0, 'invalid issue number');
  requireCondition(issue?.state === 'open', 'KAR issue must be open');
  requireCondition(typeof repositoryFullName === 'string' &&
    /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repositoryFullName), 'invalid repository identity');
  requireCondition(headRef === 'work/KAR-' + number, 'PR head must be work/KAR-' + number);
  requireCondition(typeof headSha === 'string' && /^[a-f0-9]{40}$/.test(headSha), 'invalid PR HEAD SHA');
  const closure = new RegExp('(?:Closes|Fixes|Resolves)\\s+#' + number + '(?!\\d)', 'i');
  requireCondition(closure.test(String(prBody || '')), 'PR body must close exact KAR issue #' + number);

  requireCondition(Array.isArray(comments), 'issue comments must be supplied');
  const marked = comments.filter(c => typeof c?.body === 'string' && c.body.includes(MARKER));
  requireCondition(marked.length === 1, 'Issue requires exactly one canonical Rolling Comment');
  const canonical = marked[0];
  const body = canonical.body;
  requireCondition(body.split(MARKER).length === 2, 'canonical comment marker must appear exactly once');
  const lines = body.split(/\r?\n/);
  const headings = new Set(lines);
  requireCondition(headings.has('## KAR-' + number + ' — Rolling Development State'),
    'exact KAR issue heading required');

  function field(label) {
    const matches = lines.filter(line => line.startsWith(label));
    requireCondition(matches.length === 1, 'missing or duplicate canonical field: ' + label);
    const value = matches[0].slice(label.length).trim();
    requireCondition(value.length > 0, 'empty canonical field: ' + label);
    return value;
  }

  const issueUrl = 'https://github.com/' + repositoryFullName + '/issues/' + number;
  requireCondition(field('**Issue:**') === '[KAR-' + number + '](' + issueUrl + ')',
    'canonical Issue URL/identity mismatch');
  requireCondition(new RegExp('^' + BT + '[a-f0-9]{40}' + BT + '$').test(field('**Base main:**')),
    'base main must be an exact SHA');
  const requiredHead = BT + headRef + BT + ' / ' + BT + headSha + BT;
  requireCondition(field('**Work branch / exact head:**') === requiredHead,
    'Rolling Comment must contain exact PR HEAD and issue-bound Work branch');
  field('**Current phase:**');
  field('**Last safe checkpoint:**');
  field('**Next action:**');
  requireCondition(field('**Canonical comment ID:**') === String(canonical.id),
    'canonical comment ID must match saved GitHub comment');
  requireCondition(field('- Marker visibly issued in chat:') === 'yes',
    'Work-Chat-ID must be visibly issued before the Rolling Comment');
  requireCondition(new RegExp('^' + BT + 'KAR' + number + 'CHAT[0-9A-F]{12}' + BT + '$')
    .test(field('- Originating Work-Chat-ID:')), 'invalid originating Work-Chat-ID');
  for (const heading of HEADINGS) {
    requireCondition(headings.has(heading), 'missing exact normative heading: ' + heading);
  }
  return { issueNumber: number, commentId: canonical.id, headSha, headings: HEADINGS.length };
}

function main() {
  const [issueFile, commentsFile] = process.argv.slice(2);
  if (!issueFile || !commentsFile) throw new Error('Usage: node scripts/kar-work-pr-contract.cjs <issue.json> <comments.json>');
  const issue = JSON.parse(fs.readFileSync(issueFile, 'utf8'));
  const pages = JSON.parse(fs.readFileSync(commentsFile, 'utf8'));
  const comments = Array.isArray(pages) ? pages.flat(1) : null;
  const result = validateContract({
    issue,
    comments,
    headRef: process.env.HEAD_REF,
    headSha: process.env.HEAD_SHA,
    prBody: process.env.PR_BODY,
    repositoryFullName: process.env.GITHUB_REPOSITORY
  });
  process.stdout.write('PASS KAR Work PR canonical Rolling Comment: #' + result.issueNumber +
    ', comment ' + result.commentId + ', head ' + result.headSha + '\n');
}

if (require.main === module) {
  try { main(); }
  catch (error) {
    console.error('KAR_WORK_PR_CONTRACT_FAILED: ' + error.message);
    process.exitCode = 1;
  }
}
module.exports = { validateContract };
