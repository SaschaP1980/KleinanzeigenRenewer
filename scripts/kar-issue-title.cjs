#!/usr/bin/env node
'use strict';

const fs = require('node:fs');

/**
 * Validate the literal, leading [KAR-N] prefix against the actual GitHub Issue number.
 * A GitHub Pull Request can be returned from the Issues API; it must not be
 * renamed or treated as an Issue by this validation contract.
 * This function has no mutation side effects.
 */
function validateIssueTitle(issue) {
  if (!issue || typeof issue !== 'object' || Array.isArray(issue)) {
    throw new Error('invalid GitHub Issue payload');
  }
  if (issue.pull_request != null) {
    return { kind: 'pull_request', checked: false };
  }
  const number = issue.number;
  if (typeof number !== 'number' || !Number.isSafeInteger(number) || number < 1) {
    throw new Error('invalid GitHub Issue number');
  }
  if (typeof issue.title !== 'string') {
    throw new Error('GitHub Issue title must be a string');
  }
  const match = /^\[KAR-([1-9]\d*)\] ([^\r\n]+)$/.exec(issue.title);
  if (!match || Number(match[1]) !== number || match[1] !== String(number)) {
    throw new Error('Issue title must start with exact [KAR-' + number + '] and a description');
  }
  const description = match[2];
  if (!description.trim() || description !== description.trim()) {
    throw new Error('Issue description is empty or padded');
  }
  if (/\[KAR-\d+\]/.test(description)) {
    throw new Error('duplicate KAR Issue prefix');
  }
  return { kind: 'issue', number };
}

function main() {
  if (process.argv.length !== 3) {
    throw new Error('Usage: node scripts/kar-issue-title.cjs <github-issue-json>');
  }
  const issue = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
  const result = validateIssueTitle(issue);
  if (result.kind === 'pull_request') {
    process.stdout.write('SKIP GitHub Pull Request: not an Issue-title target\n');
    return;
  }
  process.stdout.write('PASS GitHub Issue title [KAR-' + result.number + ']\n');
}

if (require.main === module) {
  try { main(); } catch (err) {
    console.error('KAR_ISSUE_TITLE_INVALID: ' + err.message);
    process.exitCode = 1;
  }
}
module.exports = { validateIssueTitle };
