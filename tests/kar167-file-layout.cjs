'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const ROOT = path.resolve(__dirname, '..');
const rel = p => path.join(ROOT, p);
const inventoryPath = rel('docs/maintenance/FILE_INVENTORY_MAIN_A1F7878.json');
const inventory = JSON.parse(fs.readFileSync(inventoryPath, 'utf8'));
const archived = inventory.files.filter(f => f.decision === 'MOVE_VERIFIED_SAME_BLOB');
assert.equal(archived.length, 28, 'Root architecture migration must have exactly 28 source snapshots');

const rootFiles = fs.readdirSync(ROOT);
assert.equal(rootFiles.filter(f => /^architecture-(?:progress|baseline)-v1\.23\./.test(f)).length, 0,
  'All historical architecture snapshots must be off the root');
for (const item of archived) {
  assert.ok(item.target.startsWith('docs/history/architecture/'), item.target);
  assert.ok(!fs.existsSync(rel(item.path)), 'Old root snapshot path must not persist: ' + item.path);
  const bytes = fs.readFileSync(rel(item.target));
  const gitHash = crypto.createHash('sha1').update('blob ' + bytes.length + '\0').update(bytes).digest('hex');
  assert.equal(gitHash, item.gitBlobSha, 'Git blob content must not change during move: ' + item.path);
  JSON.parse(bytes.toString('utf8'));
}

const codeRoots = ['src', 'tests', 'scripts', '.github/workflows', 'tools/windows', 'lib'];
const sourceExt = /\.(?:js|cjs|mjs|py|sh|yml|yaml|ps1|cmd|cs)$/i;
function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, {withFileTypes: true}).flatMap(entry => {
    const f = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(f) : entry.isFile() && sourceExt.test(entry.name) ? [f] : [];
  });
}
let executableChecked = 0;
for (const folder of codeRoots) {
  for (const f of walk(rel(folder))) {
    if (path.basename(f) === 'kar167-file-layout.cjs') continue;
    executableChecked++;
    const content = fs.readFileSync(f, 'utf8');
    const expression = /architecture-(?:baseline|progress)-v1\.23\.[A-Za-z0-9_.-]+\.json/g;
    for (const match of content.matchAll(expression)) {
      const before = content.slice(Math.max(0, match.index - 28), match.index);
      assert.ok(before.endsWith('docs/history/architecture/'),
        'Unmigrated root architecture consumer in ' + path.relative(ROOT, f) + ': ' + match[0]);
    }
  }
}

const docsFolder = rel('docs');
const markdown = walk(docsFolder).filter(f => f.endsWith('.md'));
function markdownFiles(dir) {
  return fs.readdirSync(dir, {withFileTypes: true}).flatMap(entry => {
    const f = path.join(dir, entry.name);
    return entry.isDirectory() ? markdownFiles(f) : entry.isFile() && entry.name.endsWith('.md') ? [f] : [];
  });
}
let linksChecked = 0;
for (const f of markdownFiles(docsFolder)) {
  const content = fs.readFileSync(f, 'utf8');
  for (const match of content.matchAll(/\]\(([^)]+)\)/g)) {
    const target = match[1].trim();
    if (!target || /^(?:https?:|mailto:|#)/i.test(target)) continue;
    const fileTarget = decodeURIComponent(target.split('#')[0].split('?')[0]);
    if (!fileTarget) continue;
    assert.ok(fs.existsSync(path.resolve(path.dirname(f), fileTarget)),
      'Broken local documentation link in ' + path.relative(ROOT, f) + ': ' + target);
    linksChecked++;
  }
}
const docsBefore = inventory.files.filter(f => f.path.startsWith('docs/'));
assert.equal(docsBefore.length, 17, 'Baseline documentation index should cover all 17 original files');
for (const file of docsBefore) assert.ok(fs.existsSync(rel(file.path)), 'Preserve historic docs path: ' + file.path);
assert.ok(!fs.existsSync(rel('scripts/kar50-atomic-patch.py')));
assert.ok(!fs.existsSync(rel('.github/workflows/kar50-atomic-next-patch.yml')));
assert.ok(fs.existsSync(rel('scripts/kar-atomic-patch.py')));
assert.ok(fs.existsSync(rel('.github/workflows/kar-atomic-patch.yml')));
// D1: verify each historical entrypoint is a small functional pointer to exactly one
// full-text canonical location. This guards against accidental copied policies,
// broken old deep links and silent loss of historical security/QA evidence.
const qaNames = [
  'KAR85_WINDOWS_UPDATER_MODAL_QA.md',
  'KAR86_APPROVED_CHANNEL_QA.md',
  'KAR90_UPDATER_MODAL_UX_QA.md',
  'KAR91_WINDOWS_CONSOLE_QA.md',
  'KAR97_UPDATE_IDLE_POLICY.md'
];
const windowsNames = [
  'WINDOWS_NATIVE_HOST_WAVE1.md',
  'WINDOWS_NATIVE_INAPP_WAVE02B.md',
  'WINDOWS_ONECLICK_UPDATER.md',
  'WINDOWS_UPDATER_PHASE1.md'
];
const indexText = fs.readFileSync(rel('docs/README.md'), 'utf8');
let relocatedDocsChecked = 0;
for (const [folder, names] of [['history/qa', qaNames], ['windows', windowsNames]]) {
  for (const name of names) {
    const oldPath = 'docs/' + name;
    const targetPath = 'docs/' + folder + '/' + name;
    const oldText = fs.readFileSync(rel(oldPath), 'utf8');
    const actual = fs.readFileSync(rel(targetPath), 'utf8');
    const relativeTarget = folder + '/' + name;
    assert.ok(oldText.length < 1200, 'Old docs path must be a small compatibility pointer: ' + oldPath);
    assert.ok(oldText.includes('](' + relativeTarget + ')'),
      'Compatibility pointer does not link to canonical document: ' + oldPath);
    assert.ok(actual.length > oldText.length + 500,
      'Canonical full-text historical document was not preserved: ' + targetPath);
    assert.ok(actual.startsWith('# '), 'Canonical document title missing: ' + targetPath);
    assert.ok(indexText.includes('](' + relativeTarget + ')'),
      'Root docs index must link directly to canonical (not compatibility stub): ' + targetPath);
    relocatedDocsChecked++;
  }
}
assert.equal(relocatedDocsChecked, 9, 'Exactly nine historical QA / Windows docs relocated');
for (const canonical of [
  'INITIAL_PROMPT.md', 'PROJECT_CONTEXT.md', 'GITHUB_HOWTO.md',
  'DEVELOPMENT_GUIDELINES.md', 'RELEASE_PROCESS.md',
  'DEV_OPS.md', 'templates/WORK_PATH_ROLLING_COMMENT.md',
  'user-manuals/windows-updater-einrichten.md'
]) {
  assert.ok(fs.existsSync(rel('docs/' + canonical)), 'Canonical stable docs path missing: ' + canonical);
}
assert.ok(fs.existsSync(rel('docs/maintenance/DOCS_RELOCATION_MATRIX.md')),
  'Document relocation evidence must be present');
console.log('PASS KAR-167 D1 docs: nine canonical full-text moves, nine legacy pointers, stable normative paths and index');

console.log('PASS KAR-167 file-level closure: ' + archived.length + ' immutable architecture JSONs, ' +
  executableChecked + ' executable-path scans, ' + linksChecked + ' documentation links, ' +
  docsBefore.length + ' preserved original docs, old one-shot tools retired');
